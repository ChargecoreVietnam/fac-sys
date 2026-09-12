'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppBar, Card, Chip, Loading, Page } from '@/components/ui';
import { laKiemSoat, tatCaBienBan, useDB, VERDICT_TONE, type QuanTriRow } from '@/lib/store';

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

  // Không phải admin/cse thì không có việc gì ở đây, kể cả khi gõ thẳng URL.
  useEffect(() => {
    if (!db) return;
    if (!db.session) router.replace('/login');
    else if (!laKiemSoat(db.session)) router.replace('/');
  }, [db, router]);

  const kiemSoat = laKiemSoat(db?.session ?? null);
  useEffect(() => {
    if (kiemSoat) void tatCaBienBan().then(setRows);
  }, [kiemSoat]);

  if (!db || !laKiemSoat(db.session)) return <Loading />;

  return (
    <>
      <AppBar title="Tất cả biên bản" sub="Kiểm soát · chỉ xem" back="/" />
      <Page>
        {rows === null ? (
          <p className="mt-4 text-sm text-ink-2">Đang tải…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-ink-2">Chưa có biên bản nào được nộp.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
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
                    </p>
                    <p className="tnum mt-0.5 text-xs text-ink-3">
                      {dt(r.created_at)} · {r.so_anh} ảnh
                      {r.so_video ? ' · ' + r.so_video + ' video' : ''}
                    </p>
                  </div>
                  <Chip
                    tone={
                      r.status === 'issued'
                        ? r.ket_luan
                          ? VERDICT_TONE[r.ket_luan]
                          : 'muted'
                        : 'warn'
                    }
                  >
                    {r.status === 'issued' ? 'Đã phát hành' : 'Đã nộp'}
                  </Chip>
                </button>
              </Card>
            ))}
          </div>
        )}
      </Page>
    </>
  );
}
