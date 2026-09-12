-- Siết quyền ĐỌC: kỹ sư chỉ thấy biên bản của chính mình, admin thấy tất cả.
--
-- Trước đây mọi policy SELECT đều là `using (true)`: khoá publishable nằm trong
-- bundle JS và JWT nằm trong trình duyệt, nên bất kỳ tài khoản SE nào cũng đọc
-- được toàn bộ biên bản, kết quả, ảnh của người khác bằng một lệnh fetch. Ẩn nút
-- trên giao diện không chặn được việc đó.
--
-- Bản ghi Trạm đi theo từng biên bản (mỗi lượt một hàng stations riêng) nên siết
-- luôn. Vế `not exists` giữ cho createInspection chạy được: nó INSERT stations
-- rồi RETURNING id trước khi có hàng inspections, mà RETURNING vẫn phải qua
-- policy SELECT.

-- Đọc được biên bản này không? Dùng trong policy của các bảng con.
-- SECURITY DEFINER để không phải đi vòng qua RLS của inspections trong policy.
create or replace function public.can_read_inspection(insp uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from inspections i
    where i.id = insp
      and (i.inspector_id = auth.uid() or is_admin())
  );
$$;

alter policy inspections_select_all on inspections
  using (inspector_id = (select auth.uid()) or is_admin());

alter policy item_results_select_all on item_results
  using (can_read_inspection(inspection_id));

alter policy inspection_cabinets_select_all on inspection_cabinets
  using (can_read_inspection(inspection_id));

alter policy inspection_reports_select_all on inspection_reports
  using (can_read_inspection(inspection_id));

alter policy evidence_select_all on evidence
  using (
    can_read_inspection(
      (select r.inspection_id from item_results r where r.id = evidence.item_result_id)
    )
  );

-- Phải là SECURITY DEFINER: subquery viết thẳng trong policy vẫn chịu RLS của
-- bảng được hỏi, biên bản người khác vô hình với SE nên vế "not exists" hoá
-- thành true và mở toang cả bảng stations.
create or replace function public.can_read_station(st uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from inspections i
    where i.station_id = st
      and (i.inspector_id = auth.uid() or is_admin())
  )
  -- Hàng vừa INSERT chưa gắn biên bản: để createInspection RETURNING id chạy được.
  or not exists (select 1 from inspections i where i.station_id = st);
$$;

alter policy stations_select_all on stations
  using (is_admin() or can_read_station(id));

-- Bucket: thư mục đầu của đường dẫn là id biên bản (xem addEvidence trong
-- store.ts), nên chặn ngay ở đó là chặn cả createSignedUrls lẫn tải trực tiếp.
alter policy "evidence_bucket_select_all" on storage.objects
  using (
    bucket_id = 'evidence'
    and can_read_inspection(((storage.foldername(name))[1])::uuid)
  );

-- Hoàn tác: đặt lại `using (true)` cho 6 policy trên và
-- `using (bucket_id = 'evidence')` cho policy bucket.
