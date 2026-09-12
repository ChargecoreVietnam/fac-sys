'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppBar, Button, Card, Chip, Loading, Page, Select } from '@/components/ui';
import { TINH_TP } from '@/lib/checklist';
import {
  laKiemSoat,
  MOI_TRANG,
  STATUS_LABEL,
  statusTone,
  tatCaBienBan,
  TINH_TRONG,
  useDB,
  VERDICT_TONE,
  type QuanTriRow,
} from '@/lib/store';

const dt = (s: string) =>
  new Date(s).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function QuanTriPage() {
  const db = useDB();
  const router = useRouter();
  const [rows, setRows] = useState<QuanTriRow[] | null>(null);
  const [tong, setTong] = useState(0);
  const [trang, setTrang] = useState(0);
  const [tinh, setTinh] = useState('');
  const [trangThai, setTrangThai] = useState('');

  // Không phải admin/cse thì không có việc gì ở đây, kể cả khi gõ thẳng URL.
  useEffect(() => {
    if (!db) return;
    if (!db.session) router.replace('/login');
    else if (!laKiemSoat(db.session)) router.replace('/');
  }, [db, router]);

  const kiemSoat = laKiemSoat(db?.session ?? null);
  useEffect(() => {
    if (!kiemSoat) return;
    // Giữ nguyên danh sách cũ trong lúc chờ trang mới, đỡ nháy một nhịp trắng.
    void tatCaBienBan(trang, tinh, trangThai).then((kq) => {
      setRows(kq?.rows ?? []);
      setTong(kq?.tong ?? 0);
    });
  }, [kiemSoat, trang, tinh, trangThai]);

  if (!db || !kiemSoat) return <Loading />;

  const soTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));

  return (
    <>
      <AppBar title="Tất cả biên bản" sub="Kiểm soát · chỉ xem" back="/" />
      <Page>
        {/* Hai bộ lọc chồng nhau bằng AND, cắt trang cũng theo kết quả đã lọc.
            Danh sách tỉnh lấy từ TINH_TP của biểu mẫu nên nhãn không lệch. */}
        <div className="mt-1 flex gap-2">
          <Select
            aria-label="Lọc theo tỉnh/thành phố"
            value={tinh}
            onChange={(e) => {
              setTinh(e.target.value);
              setTrang(0);
            }}
            className="min-w-0 flex-1"
          >
            <option value="">Tất cả tỉnh/thành phố</option>
            {TINH_TP.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value={TINH_TRONG}>Chưa ghi tỉnh/thành phố</option>
          </Select>

          <Select
            aria-label="Lọc theo trạng thái"
            value={trangThai}
            onChange={(e) => {
              setTrangThai(e.target.value);
              setTrang(0);
            }}
            className="min-w-0 flex-1"
          >
            <option value="">Mọi trạng thái</option>
            {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>

        {rows === null ? (
          <p className="mt-4 text-sm text-ink-2">Đang tải…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-ink-2">
            {tinh || trangThai
              ? 'Không có biên bản nào khớp bộ lọc.'
              : 'Chưa có biên bản nào.'}
          </p>
        ) : (
          <>
            <p className="tnum mt-3 text-xs text-ink-3">
              {tong} biên bản · trang {trang + 1}/{soTrang}
            </p>

            <div className="mt-2 flex flex-col gap-2">
              {rows.map((r) => (
                <Card
                  key={r.id}
                  stripe={r.ket_luan ? VERDICT_TONE[r.ket_luan] : 'muted'}
                  className="cursor-pointer p-3.5 pl-4 active:bg-card-2"
                >
                  <button
                    type="button"
                    onClick={() => router.push('/bien-ban/' + r.id + '/xem')}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {r.so_bien_ban ?? r.ma_tram ?? 'Chưa có số biên bản'}
                      </p>
                      <p className="truncate text-xs text-ink-2">
                        {r.nguoi_nghiem_thu_ten}
                        {r.ten_tram ? ' · ' + r.ten_tram : ''}
                        {r.tinh_tp ? ' · ' + r.tinh_tp : ''}
                      </p>
                      <p className="tnum mt-0.5 text-xs text-ink-3">
                        {dt(r.created_at)} · {r.so_anh} ảnh
                        {r.so_video ? ' · ' + r.so_video + ' video' : ''}
                      </p>
                    </div>
                    <Chip tone={statusTone(r.status, r.ket_luan)}>{STATUS_LABEL[r.status]}</Chip>
                  </button>
                </Card>
              ))}
            </div>

            {soTrang > 1 ? (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={trang === 0}
                  onClick={() => setTrang((t) => t - 1)}
                >
                  Trang trước
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={trang + 1 >= soTrang}
                  onClick={() => setTrang((t) => t + 1)}
                >
                  Trang sau
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Page>
    </>
  );
}
