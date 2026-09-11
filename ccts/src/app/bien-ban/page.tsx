'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppBar, Card, Chip, Loading, Page } from '@/components/ui';
import { lichSuBienBan, useDB, VERDICT_TONE, type LichSuRow } from '@/lib/store';

const dt = (s: string) =>
  new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function LichSuPage() {
  const db = useDB();
  const router = useRouter();
  const [rows, setRows] = useState<LichSuRow[] | null>(null);

  useEffect(() => {
    if (db && !db.session) router.replace('/login');
  }, [db, router]);

  useEffect(() => {
    if (db?.session) void lichSuBienBan().then(setRows);
  }, [db?.session]);

  if (!db || !db.session) return <Loading />;

  return (
    <>
      <AppBar title="Lịch sử biên bản" back="/" />
      <Page>
        {rows === null ? (
          <p className="mt-4 text-sm text-ink-2">Đang tải…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-2">
            Chưa có biên bản nào đã nộp. Biên bản đang làm dở nằm ở trang chủ, chưa nộp thì chưa
            lên đây.
          </p>
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
                      {r.so_bien_ban ?? 'Chưa có số biên bản'}
                    </p>
                    <p className="tnum mt-0.5 text-xs text-ink-3">{dt(r.created_at)}</p>
                  </div>
                  <Chip tone={r.status === 'issued' ? (r.ket_luan ? VERDICT_TONE[r.ket_luan] : 'muted') : 'warn'}>
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
