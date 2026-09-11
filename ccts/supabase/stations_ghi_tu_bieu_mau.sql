-- Đã áp dụng: migration 'stations_ghi_tu_bieu_mau'.
--
-- stations đổi vai trò: không còn là danh mục BM01 chỉ đọc, mà là nơi kỹ sư
-- ghi thông tin Trạm ngay trên biểu mẫu. Mỗi biên bản có một hàng stations
-- riêng, nên dữ liệu lượt cũ không bị lượt sau ghi đè (Điều 1.4).

-- Cùng một Trạm nghiệm thu nhiều lượt => nhiều hàng cùng ma_tram.
alter table stations drop constraint if exists stations_ma_tram_key;

-- Kỹ sư điền dần từng ô, hàng phải tạo được lúc còn trống.
alter table stations
  alter column ma_tram        drop not null,
  alter column ten_tram       drop not null,
  alter column dia_chi        drop not null,
  alter column lat            drop not null,
  alter column lng            drop not null,
  alter column so_tu          drop not null,
  alter column nha_thau       drop not null,
  alter column nha_thau_phone drop not null;

-- Quyền: trước đây chỉ admin ghi. Giờ kỹ sư ghi hàng gắn với bản nháp của mình.
create policy stations_insert_auth on stations
  for insert to authenticated with check (true);

create policy stations_write_draft_owner on stations
  for update to authenticated
  using (exists (
    select 1 from inspections i
    where i.station_id = stations.id
      and i.inspector_id = (select auth.uid())
      and i.status = 'draft'
  ))
  with check (true);

-- Xoá nháp xong thì dọn luôn hàng stations mồ côi, không để lại rác.
create policy stations_delete_orphan on stations
  for delete to authenticated
  using (not exists (select 1 from inspections i where i.station_id = stations.id));
