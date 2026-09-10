'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppBar, Button, Card, Loading, Page } from '@/components/ui';
import { banNhap, createInspection, deleteInspection, signOut, useDB } from '@/lib/store';

export default function HomePage() {
  const db = useDB();
  const router = useRouter();
  const [dangXoa, setDangXoa] = useState(false);
  const [loiXoa, setLoiXoa] = useState<string | null>(null);

  useEffect(() => {
    if (db && !db.session) router.replace('/login');
  }, [db, router]);

  if (!db || !db.session) return <Loading />;

  // Còn bản nháp thì làm tiếp, không tạo thêm - mỗi kỹ sư giữ tối đa một bản.
  const nhap = banNhap();

  async function moFormNghiemThuTru() {
    const id = nhap?.id ?? (await createInspection());
    router.push('/bien-ban/' + id);
  }

  async function xoaNhap() {
    if (!nhap) return;
    setDangXoa(true);
    const loi = await deleteInspection(nhap.id);
    setDangXoa(false);
    setLoiXoa(loi);
  }

  return (
    <>
      <AppBar
        title="Danh sách biểu mẫu"
        sub={db.session.ho_ten}
        right={
          <button
            type="button"
            onClick={() => {
              signOut();
              router.replace('/login');
            }}
            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-ink-2 active:bg-card-2"
          >
            Đăng xuất
          </button>
        }
      />

      <Page>
        <h1 className="text-xl font-bold tracking-tight">Chọn biểu mẫu cần điền</h1>
        <p className="mt-1 text-sm text-ink-2">Các biểu mẫu được phép sử dụng sẽ hiển thị tại đây.</p>

        <Card className="mt-5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-mono font-bold text-brand">
              NT
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">Nghiệm thu trụ</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                Ghi nhận thông tin, hạng mục kiểm tra và bằng chứng nghiệm thu.
              </p>
            </div>
          </div>
          {nhap ? (
            <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
              Bạn còn một biên bản đang làm dở, mở lúc{' '}
              {new Date(nhap.created_at).toLocaleString('vi-VN')}. Nộp hoặc xoá bản này trước khi
              lập biên bản mới.
            </p>
          ) : null}

          <Button className="mt-4 w-full" onClick={moFormNghiemThuTru}>
            {nhap ? 'Tiếp tục biên bản đang làm dở' : 'Mở biểu mẫu'}
          </Button>

          {nhap ? (
            <button
              type="button"
              onClick={xoaNhap}
              disabled={dangXoa}
              className="mt-2 w-full rounded-lg py-2 text-sm font-semibold text-bad underline underline-offset-2 disabled:opacity-60"
            >
              {dangXoa ? 'Đang xoá…' : 'Xoá bản nháp này'}
            </button>
          ) : null}

          {loiXoa ? <p className="mt-2 text-xs font-medium text-bad">{loiXoa}</p> : null}
        </Card>
      </Page>
    </>
  );
}
