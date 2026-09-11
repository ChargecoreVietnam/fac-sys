-- View kiểm soát: mỗi hàng = 1 biên bản, kèm 3 cột đếm và tổng dung lượng.
-- Đã áp dụng: migration 'inspection_summary_nha_thau_tu_stations'.
-- security_invoker: policy của bảng gốc vẫn áp dụng cho người đang đăng nhập.
-- ponytail: lateral chạy theo từng hàng trả về; PostgREST đã phân trang nên
-- mỗi lần chỉ đếm cho ~50 biên bản. Nếu chậm thì đổi sang bảng tổng hợp + trigger.
create or replace view inspection_summary
with (security_invoker = true) as
select
  i.id,
  -- Lấy thẳng từ bảng; chưa có chỗ nào sinh số nên hiện luôn null.
  i.so_bien_ban,
  i.station_id,
  s.ma_tram,
  s.ten_tram,
  s.tinh_tp,
  i.luot_thu,
  s.nha_thau,
  i.inspector_id,
  i.nguoi_nghiem_thu_ten,
  i.tu_thoi_gian,
  i.den_thoi_gian,
  i.status,
  i.ngay_phat_hanh,
  i.ket_luan,
  i.created_at,
  tu.so_tu,
  tu.so_tu_online,
  tu.so_tu_co_dien,
  tu.so_tu_lech_bm01,
  hm.so_hang_muc,
  hm.so_khong_dat,
  bc.so_bang_chung,
  bc.so_anh,
  bc.so_video,
  bc.tong_bytes
from inspections i
left join stations s on s.id = i.station_id
left join lateral (
  select
    count(*)::int                                         as so_tu,
    count(*) filter (where c.online)::int                 as so_tu_online,
    count(*) filter (where c.co_dien)::int                as so_tu_co_dien,
    count(*) filter (where c.cabinet_id is null)::int     as so_tu_lech_bm01
  from inspection_cabinets c
  where c.inspection_id = i.id
) tu on true
left join lateral (
  select
    count(*)::int                                          as so_hang_muc,
    count(*) filter (where r.ket_qua = 'khong_dat')::int    as so_khong_dat
  from item_results r
  where r.inspection_id = i.id
) hm on true
left join lateral (
  select
    count(*)::int                                     as so_bang_chung,
    count(*) filter (where e.loai = 'anh')::int       as so_anh,
    count(*) filter (where e.loai = 'video')::int     as so_video,
    coalesce(sum(e.size_bytes), 0)::bigint            as tong_bytes
  from item_results r
  join evidence e on e.item_result_id = r.id
  where r.inspection_id = i.id
) bc on true;

grant select on inspection_summary to authenticated;
