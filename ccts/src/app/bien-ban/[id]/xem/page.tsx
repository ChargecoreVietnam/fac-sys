'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect } from 'react';
import { AppBar, BottomBar, Button, Loading, Page } from '@/components/ui';
import {
  CHECKLIST,
  GROUPS,
  INSPECTION_VERDICT_LABEL,
  ITEM_VERDICT_LABEL,
  RECONCILE_FIELDS,
  itemsInGroup,
} from '@/lib/checklist';
import { getResult, inspectionById, useDB } from '@/lib/store';
import type { Inspection } from '@/lib/types';

const dt = (s: string | null) =>
  s
    ? new Date(s).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export default function InspectionSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const db = useDB();
  const router = useRouter();

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
          <p className="text-sm text-ink-2">Biên bản này không còn trong máy.</p>
        </Page>
      </>
    );


  return (
    <>
      <AppBar
        title="Biên bản BM03"
        sub={insp.so_bien_ban}
        back="/"
      />

      <main className="mx-auto w-full max-w-2xl flex-1 px-3 pb-32 pt-3">
        <article className="sheet rounded-xl border border-line bg-card px-4 py-5 text-[0.85rem] leading-relaxed sm:px-6 sm:py-7">
          <header className="border-b-2 border-ink pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink-2">
                  ChargeCore Vietnam · Bên B
                </p>
                <h1 className="mt-1 text-base font-bold uppercase tracking-tight">
                  Biên bản nghiệm thu Trạm đổi pin
                </h1>
                <p className="text-xs text-ink-2">Phụ lục 04 · Biểu mẫu BM03</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tnum font-mono text-xs font-semibold">{insp.so_bien_ban}</p>
                <p className="tnum text-xs text-ink-2">Lượt {insp.luot_thu}</p>
              </div>
            </div>
          </header>

          <Muc so={1} ten="Đối chiếu thông tin Trạm" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-[0.8rem]">
              <thead>
                <tr className="border-b border-line text-left text-[0.65rem] uppercase tracking-wide text-ink-2">
                  <th className="w-40 py-1.5 pr-2 font-bold">Nội dung</th>
                  <th className="py-1.5 pr-2 font-bold">Theo BM01</th>
                  <th className="py-1.5 pr-2 font-bold">Ghi nhận</th>
                  <th className="w-16 py-1.5 font-bold">Khớp</th>
                </tr>
              </thead>
              <tbody>
                {RECONCILE_FIELDS.map((f) => {
                  const r = insp.doi_chieu[f.key];
                  return (
                    <tr key={f.key} className="border-b border-line align-top">
                      <td className="py-2 pr-2 font-semibold">{f.label}</td>
                      <td className="py-2 pr-2 text-ink-2">{r.bm01 || '—'}</td>
                      <td className="py-2 pr-2">
                        {r.bm02 || '—'}
                        {r.ghi_chu ? (
                          <span className="block text-xs text-ink-3">{r.ghi_chu}</span>
                        ) : null}
                      </td>
                      <td className={'py-2 font-bold ' + (r.khop ? 'text-ok' : 'text-bad')}>
                        {r.khop ? 'Khớp' : 'Lệch'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Muc so={2} ten="Người nghiệm thu và thời gian" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <KV k="Họ và tên" v={insp.nguoi_nghiem_thu_ten} />
            <KV k="Chức vụ" v={insp.nguoi_nghiem_thu_chuc_vu} />
            <KV k="Từ" v={dt(insp.tu_thoi_gian)} />
            <KV k="Đến" v={dt(insp.den_thoi_gian)} />
            <KV k="Nhà thầu" v={insp.nha_thau} />
            <KV k="Người lập hồ sơ" v={insp.nguoi_lap_ho_so + ' – ' + insp.nha_thau_phone} />
          </dl>

          <Muc so={3} ten="Tình trạng Tủ khi nộp" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-[0.8rem]">
              <thead>
                <tr className="border-b border-line text-left text-[0.65rem] uppercase tracking-wide text-ink-2">
                  <th className="w-14 py-1.5 pr-2 font-bold">Vị trí</th>
                  <th className="py-1.5 pr-2 font-bold">SN</th>
                  <th className="w-20 py-1.5 pr-2 font-bold">Loại</th>
                  <th className="w-24 py-1.5 pr-2 font-bold">FW</th>
                  <th className="w-20 py-1.5 font-bold">Kết nối</th>
                </tr>
              </thead>
              <tbody>
                {insp.cabinets.map((c) => (
                  <tr key={c.id} className="border-b border-line">
                    <td className="tnum py-2 pr-2">Tủ {c.vi_tri}</td>
                    <td className="tnum py-2 pr-2 font-mono text-xs">{c.sn || '—'}</td>
                    <td className="tnum py-2 pr-2">{c.loai_tu ? c.loai_tu + ' ngăn' : '—'}</td>
                    <td className="tnum py-2 pr-2 font-mono text-xs">{c.fw_version || '—'}</td>
                    <td className={'py-2 font-semibold ' + (c.online ? 'text-ok' : 'text-warn')}>
                      {c.online ? 'Online' : 'Offline'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Muc so={4} ten="Kết quả theo hạng mục" />
          <div className="flex flex-col gap-4">
            {GROUPS.map((g) => (
              <div key={g.key}>
                <h3 className="mb-1.5 border-b border-line pb-1 text-[0.7rem] font-bold uppercase tracking-wide">
                  {g.key}. {g.label}
                </h3>
                <ul className="flex flex-col">
                  {itemsInGroup(g.key).flatMap((it) =>
                    (it.perCabinet
                      ? insp.cabinets.map((c) => c.vi_tri)
                      : [null as number | null]
                    ).map((viTri) => (
                      <ItemRow
                        key={it.code + (viTri ?? '')}
                        insp={insp}
                        code={it.code}
                        title={it.title}
                        viTri={viTri}
                      />
                    )),
                  )}
                </ul>
              </div>
            ))}
          </div>

          <Muc so={5} ten="Kết luận" />
          <div
            className={
              'rounded-lg border-2 px-3 py-2.5 ' +
              (insp.ket_luan === 'dat'
                ? 'border-ok text-ok'
                : insp.ket_luan === 'khong_dat'
                  ? 'border-bad text-bad'
                  : 'border-na text-na')
            }
          >
            <p className="font-bold">
              {insp.ket_luan ? INSPECTION_VERDICT_LABEL[insp.ket_luan] : 'Chưa kết luận'}
            </p>
            {insp.ket_luan_ghi_chu ? (
              <p className="mt-1 text-xs text-ink-2">{insp.ket_luan_ghi_chu}</p>
            ) : null}
          </div>

          {insp.yeu_cau_khac_phuc ? (
            <>
              <Muc so={6} ten="Yêu cầu khắc phục" />
              <p className="whitespace-pre-wrap">{insp.yeu_cau_khac_phuc}</p>
            </>
          ) : null}

          <footer className="mt-7 border-t border-line pt-3 text-xs text-ink-3">
            <p>
              {insp.status === 'issued'
                ? 'Phát hành ' + dt(insp.ngay_phat_hanh)
                : 'Bản nháp, chưa phát hành'}{' '}
              · {insp.doi_chieu.ma_ten_tram.bm02 || 'chưa ghi mã Trạm'}
            </p>
            <p className="mt-1">
              Biên bản lập trên Nền tảng CCTS. Bản trên Nền tảng là bản gốc theo Điều 1.4.
            </p>
          </footer>
        </article>
      </main>

      <BottomBar>
        <Button variant="ghost" onClick={() => router.push('/bien-ban/' + insp.id)}>
          {insp.status === 'issued' ? 'Xem dữ liệu nhập' : 'Quay lại sửa'}
        </Button>
        <Button onClick={() => window.print()}>In / lưu PDF</Button>
      </BottomBar>
    </>
  );
}

function Muc({ so, ten }: { so: number; ten: string }) {
  return (
    <h2 className="mb-2 mt-6 flex items-baseline gap-2 text-sm font-bold uppercase tracking-tight">
      <span className="tnum text-ink-3">{so}.</span>
      {ten}
    </h2>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-3">{k}</dt>
      <dd className="mt-0.5">{v || '—'}</dd>
    </div>
  );
}

function ItemRow({
  insp,
  code,
  title,
  viTri,
}: {
  insp: Inspection;
  code: string;
  title: string;
  viTri: number | null;
}) {
  const r = getResult(insp, code, viTri);
  const item = CHECKLIST.find((i) => i.code === code)!;
  const anh = r.evidence.filter((e) => e.loai === 'anh').length;
  const video = r.evidence.filter((e) => e.loai === 'video').length;

  return (
    <li className="flex items-start gap-2 border-b border-line py-1.5 last:border-0">
      <span className="tnum w-14 shrink-0 font-mono text-xs font-semibold text-ink-2">
        {code}
        {viTri ? '·T' + viTri : ''}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block leading-snug">{title}</span>
        {r.gia_tri_do.length ? (
          <span className="tnum mt-0.5 block font-mono text-xs text-ink-2">
            {r.gia_tri_do
              .map((g) => (g.diem || '?') + ': ' + (g.gia_tri ?? '—') + ' ' + g.don_vi)
              .join(' · ')}
          </span>
        ) : null}
        {r.ghi_chu ? (
          <span className="mt-0.5 block text-xs text-ink-2">{r.ghi_chu}</span>
        ) : null}
        {anh || video ? (
          <span className="tnum mt-0.5 block text-xs text-ink-3">
            {anh ? anh + ' ảnh' : ''}
            {anh && video ? ' · ' : ''}
            {video ? video + ' video' : ''}
            {anh < item.minPhotos ? ' (quy cách ' + item.minPhotos + ')' : ''}
          </span>
        ) : null}
      </span>
      <span
        className={
          'w-20 shrink-0 text-right text-xs font-bold ' +
          (r.ket_qua === 'dat'
            ? 'text-ok'
            : r.ket_qua === 'khong_dat'
              ? 'text-bad'
              : r.ket_qua === 'na'
                ? 'text-na'
                : 'text-ink-3')
        }
      >
        {r.ket_qua ? ITEM_VERDICT_LABEL[r.ket_qua] : 'Chưa chấm'}
      </span>
    </li>
  );
}
