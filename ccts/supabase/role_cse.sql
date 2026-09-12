-- Vai trò 'cse': xem được mọi biên bản như admin nhưng KHÔNG ghi được gì.
-- Đã áp dụng: migration 'add_role_cse_read_all'.
--
-- Mọi policy ghi (UPDATE/DELETE/INSERT) đều gắn vào is_admin() hoặc
-- is_draft_owner(), nên chỉ cần nới các đường ĐỌC là xong - không đụng tới
-- policy ghi nào. Đó cũng là lý do cse không thể kết luận hay phát hành.

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role = any (array['se','cse','admin']));

-- Ai được đọc toàn hệ thống. Tách khỏi is_admin() vì is_admin() vẫn là ranh
-- giới ghi; trộn hai thứ vào một hàm là cse ghi được ngay.
create or replace function public.is_reviewer()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('admin','cse')
  );
$$;

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
      and (i.inspector_id = auth.uid() or is_reviewer())
  );
$$;

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
      and (i.inspector_id = auth.uid() or is_reviewer())
  )
  or not exists (select 1 from inspections i where i.station_id = st);
$$;

alter policy inspections_select_all on inspections
  using (inspector_id = (select auth.uid()) or is_reviewer());

alter policy stations_select_all on stations
  using (is_reviewer() or can_read_station(id));

-- cse cần đọc profiles của kỹ sư khác để hiện tên trong màn kiểm soát.
alter policy profiles_select on profiles
  using (id = (select auth.uid()) or is_reviewer());

-- Đặt một tài khoản thành cse:
--   update profiles set role = 'cse' where id = '<uuid>';
