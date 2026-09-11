'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { Step1, Step2, Step3, Step4 } from '@/components/steps';
import { AppBar, Banner, BottomBar, Button, Field, Loading, Page, TextArea } from '@/components/ui';
import type { ReportKind } from '@/lib/types';
import {
  blockers,
  deleteInspection,
  inspectionById,
  progress,
  saveReport,
  signOut,
  submitInspection,
  useDB,
  warnings,
} from '@/lib/store';

const STEPS = [
  { n: 1, label: 'Thông tin Trạm', short: 'Trạm' },
  { n: 2, label: 'Các Tủ', short: 'Tủ' },
  { n: 3, label: 'Người nghiệm thu', short: 'Người' },
  { n: 4, label: 'Hạng mục', short: 'Hạng mục' },
];

const REPORT_OPTIONS: [ReportKind, string][] = [
  ['khong_du_dieu_kien', 'Không đủ điều kiện nghiệm thu'],
  ['sai_thong_tin', 'Địa chỉ không chính xác'],
  ['khac', 'Khác'],
];

export default function InspectionFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const db = useDB();
  const router = useRouter();
  const [buoc, setBuoc] = useState(1);
  const [baoCao, setBaoCao] = useState(false);
  const [bcNoiDung, setBcNoiDung] = useState<ReportKind>(REPORT_OPTIONS[0][0]);
  const [bcLyDo, setBcLyDo] = useState('');
  const [bcLoi, setBcLoi] = useState<string | null>(null);
  const [xacNhan, setXacNhan] = useState(false);
  const [chanPopup, setChanPopup] = useState(false);
  const [xacNhanXoa, setXacNhanXoa] = useState(false);
  const [dangXoa, setDangXoa] = useState(false);
  const [loiXoa, setLoiXoa] = useState<string | null>(null);
  const [luuThanhCong, setLuuThanhCong] = useState<'form' | 'report' | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [loiLuu, setLoiLuu] = useState<string | null>(null);

  useEffect(() => {
    if (db && !db.session) router.replace('/login');
  }, [db, router]);

  if (!db || !db.session) return <Loading />;

  const insp = inspectionById(id);
  if (!insp)
    return (
      <>
        <AppBar title="Không tìm thấy biên bản" back="/" />
        <Page>
          <p className="text-sm text-ink-2">
            Biên bản này không có trên máy chủ hoặc bạn không có quyền xem.
          </p>
        </Page>
      </>
    );

  const locked = insp.status === 'issued';
  const chan = blockers(insp);
  const p = progress(insp);
  const canhBao = warnings(insp);
  const baoCaoHopLe = Boolean(bcLyDo.trim());

  function moBaoCao() {
    setBcNoiDung(insp!.bao_cao?.noi_dung ?? REPORT_OPTIONS[0][0]);
    setBcLyDo(insp!.bao_cao?.ly_do ?? '');
    setBcLoi(null);
    setBaoCao(true);
  }

  async function luuBaoCao() {
    setDangLuu(true);
    const loi = await saveReport(insp!.id, bcNoiDung, bcLyDo.trim());
    setDangLuu(false);
    if (loi) {
      setBcLoi(loi);
      return;
    }
    setBaoCao(false);
    setLuuThanhCong('report');
  }

  async function xoaBienBan() {
    setDangXoa(true);
    setLoiXoa(null);
    const loi = await deleteInspection(insp!.id);
    if (loi) {
      setDangXoa(false);
      setLoiXoa(loi);
      return;
    }
    router.replace('/');
  }

  async function phatHanh() {
    setDangLuu(true);
    setLoiLuu(null);
    const loi = await submitInspection(insp!.id);
    setDangLuu(false);
    if (loi) {
      setLoiLuu(loi);
      return;
    }
    setXacNhan(false);
    setLuuThanhCong('form');
  }

  return (
    <>
      <AppBar
        title="Danh sách biểu mẫu"
        back="/"
        right={
          <button
            type="button"
            onClick={async () => {
              // Chờ session xoá xong rồi mới điều hướng: đá đi sớm thì màn
              // login còn thấy session cũ, tự bật lại về đây một nhịp.
              await signOut();
              router.replace('/login');
            }}
            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-ink-2 active:bg-card-2"
          >
            Đăng xuất
          </button>
        }
      />

      <nav
        aria-label="Các bước"
        className="no-print sticky top-14 z-20 border-b border-line bg-paper/95 backdrop-blur"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-1 px-3 py-2">
          {STEPS.map((s) => {
            const on = buoc === s.n;
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => setBuoc(s.n)}
                aria-label={'Bước ' + s.n + ': ' + s.label}
                aria-current={on ? 'step' : undefined}
                className={
                  'flex min-w-0 flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[0.68rem] font-semibold leading-tight transition-colors ' +
                  (on
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-line bg-card text-ink-2')
                }
              >
                <span className="tnum text-xs opacity-70">{s.n}</span>
                <span className="truncate">{s.short}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <Page>
        {locked ? (
          <div className="mb-3">
            <Banner tone="ok" title="Biên bản đã phát hành">
              Không sửa được nữa. Mở bản in ở nút bên dưới.
            </Banner>
          </div>
        ) : null}

        {buoc === 1 ? <Step1 insp={insp} locked={locked} /> : null}
        {buoc === 2 ? <Step2 insp={insp} locked={locked} /> : null}
        {buoc === 3 ? <Step3 insp={insp} locked={locked} /> : null}
        {buoc === 4 ? <Step4 insp={insp} locked={locked} /> : null}

        {buoc === 4 && !locked ? (
          <button
            type="button"
            onClick={() => setXacNhanXoa(true)}
            className="mt-5 w-full rounded-lg py-2 text-sm font-semibold text-bad underline underline-offset-2"
          >
            Huỷ và xoá biên bản này
          </button>
        ) : null}
      </Page>

      <BottomBar>
        {buoc > 1 ? (
          <Button variant="ghost" className="!flex-none !px-5" onClick={() => setBuoc(buoc - 1)}>
            Trước
          </Button>
        ) : null}

        {buoc < 4 ? (
          <Button onClick={() => setBuoc(buoc + 1)}>
            Tiếp
            <span className="tnum text-xs font-normal opacity-75">
              {buoc === 3 ? p.done + '/' + p.total : ''}
            </span>
          </Button>
        ) : locked ? (
          <Button onClick={() => router.push('/bien-ban/' + insp.id + '/xem')}>
            Xem bản biên bản
          </Button>
        ) : (
          <>
            <Button variant="danger" className="!bg-bad !text-white" onClick={moBaoCao}>
              Báo cáo
            </Button>
            <Button onClick={() => (chan.length ? setChanPopup(true) : setXacNhan(true))}>
              Lưu
            </Button>
          </>
        )}
      </BottomBar>

      {chanPopup ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-3 sm:items-center">
          <div className="shadow-soft safe-b w-full max-w-md rounded-2xl border border-line bg-card p-4">
            <h2 className="text-lg font-bold tracking-tight text-bad">Chưa phát hành được</h2>
            <p className="mt-1 text-sm text-ink-2">Bấm từng dòng để nhảy tới bước cần sửa.</p>
            <ul className="mt-3 space-y-1.5">
              {chan.map((b, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      setChanPopup(false);
                      setBuoc(b.buoc);
                    }}
                    className="w-full cursor-pointer rounded-lg bg-bad-soft px-3 py-2 text-left text-sm text-bad underline-offset-2 transition-colors hover:bg-bad/20 hover:underline active:bg-bad/25"
                  >
                    Bước {b.buoc}: {b.text}
                  </button>
                </li>
              ))}
            </ul>
            <Button variant="ghost" className="mt-4 w-full" onClick={() => setChanPopup(false)}>
              Đóng
            </Button>
          </div>
        </div>
      ) : null}

      {baoCao ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-3 sm:items-center">
          <div className="shadow-soft safe-b w-full max-w-md rounded-2xl border border-line bg-card p-4">
            <h2 className="text-lg font-bold tracking-tight">Báo cáo nghiệm thu</h2>
            <p className="mt-1 text-sm text-ink-2">Chọn nội dung báo cáo và ghi rõ lý do.</p>

            <div className="mt-4 flex flex-col gap-4">
              <Field label="Nội dung báo cáo" required>
                <select
                  value={bcNoiDung}
                  onChange={(e) => setBcNoiDung(e.target.value as ReportKind)}
                  className="min-h-12 w-full rounded-lg border border-line bg-card-2 px-3 text-ink focus:border-brand focus:bg-card focus:outline-none"
                >
                  {REPORT_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Lý do" required>
                <TextArea
                  rows={4}
                  value={bcLyDo}
                  placeholder="Nhập lý do"
                  onChange={(e) => {
                    setBcLyDo(e.target.value);
                    setBcLoi(null);
                  }}
                />
              </Field>
            </div>

            {bcLoi ? (
              <div className="mt-3">
                <Banner tone="bad" title={bcLoi} />
              </div>
            ) : null}

            <div className="mt-5 flex gap-2">
              <Button variant="ghost" disabled={dangLuu} onClick={() => setBaoCao(false)}>
                Huỷ
              </Button>
              <Button
                className="!bg-bad !text-white"
                disabled={!baoCaoHopLe || dangLuu}
                onClick={luuBaoCao}
              >
                {dangLuu ? 'Đang lưu…' : 'Lưu báo cáo'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {xacNhanXoa ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-3 sm:items-center">
          <div className="shadow-soft safe-b w-full max-w-md rounded-2xl border border-line bg-card p-4">
            <h2 className="text-lg font-bold tracking-tight text-bad">Xoá biên bản này?</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Toàn bộ nội dung đã điền và ảnh đã tải lên sẽ bị xoá khỏi máy chủ. Không khôi phục
              được.
            </p>
            {loiXoa ? (
              <div className="mt-3">
                <Banner tone="bad" title={loiXoa} />
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <Button variant="ghost" onClick={() => setXacNhanXoa(false)} disabled={dangXoa}>
                Giữ lại
              </Button>
              <Button className="!bg-bad !text-white" onClick={xoaBienBan} disabled={dangXoa}>
                {dangXoa ? 'Đang xoá…' : 'Xoá'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {xacNhan ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-3 sm:items-center">
          <div className="safe-b w-full max-w-md rounded-2xl bg-card p-4">
            <h2 className="text-lg font-bold tracking-tight">Lưu biên bản?</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Sau khi lưu, biên bản{' '}
              <span className="font-mono text-ink">{insp.so_bien_ban}</span> không sửa được nữa và
              được tính là 01 Lượt nghiệm thu theo Điều 7 của hợp đồng.
            </p>

            {canhBao.length ? (
              <div className="mt-3">
                <Banner tone="warn" title={'Thiếu quy cách (' + canhBao.length + ')'}>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                    {canhBao.slice(0, 6).map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                    {canhBao.length > 6 ? <li>… và {canhBao.length - 6} mục khác</li> : null}
                  </ul>
                  Vẫn lưu được, nhưng Bên A sẽ ghi nhận thiếu khi hậu kiểm.
                </Banner>
              </div>
            ) : null}
            {loiLuu ? (
              <div className="mt-3">
                <Banner tone="bad" title={loiLuu} />
              </div>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" disabled={dangLuu} onClick={() => setXacNhan(false)}>
                Huỷ
              </Button>
              <Button disabled={dangLuu} onClick={phatHanh}>
                {dangLuu ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {luuThanhCong ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
        >
          <div className="shadow-soft w-full max-w-sm rounded-2xl border border-line bg-card p-5 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-ok-soft text-ok">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" aria-hidden="true">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 id="success-title" className="mt-4 text-xl font-bold tracking-tight">
              Lưu thành công
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              {luuThanhCong === 'form'
                ? 'Biên bản đã được lưu và phát hành thành công.'
                : 'Nội dung báo cáo và lý do đã được lưu.'}
            </p>
            <Button
              className="mt-5 w-full"
              onClick={() => router.push('/')}
            >
              Về danh sách biểu mẫu
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
