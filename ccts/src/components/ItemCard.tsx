'use client';

import { useRef, useState } from 'react';
import { Chip, Seg, TextArea, TextInput, type Tone } from '@/components/ui';
import type { ChecklistItem } from '@/lib/checklist';
import { formatBytes, readEvidence } from '@/lib/media';
import {
  addEvidence,
  getResult,
  previewOf,
  removeEvidence,
  setMeasurements,
  setNote,
  setVerdict,
} from '@/lib/store';
import type { EvidenceMeta, GiaTriDo, Inspection } from '@/lib/types';

/** Ngưỡng của tiêu chí "220V ±5%" ở hạng mục C5. */
const C5_MIN = 209;
const C5_MAX = 231;

export function ItemCard({
  insp,
  item,
  viTri,
  locked,
}: {
  insp: Inspection;
  item: ChecklistItem;
  viTri: number | null;
  locked: boolean;
}) {
  const r = getResult(insp, item.code, viTri);
  const [open, setOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  /** Số tệp đang đọc + tải lên, 0 là rảnh. Nút phải khoá suốt lúc này. */
  const [dangTai, setDangTai] = useState(0);
  // ponytail: khoá mọi nút xoá khi đang xoá một ảnh. Xoá nhiều ảnh cùng lúc thì
  // đổi sang Set id.
  const [dangXoaAnh, setDangXoaAnh] = useState<string | null>(null);

  // Hai input riêng: điện thoại chỉ hỏi "chụp hay chọn" khi nó muốn, tách nút ra
  // thì kỹ sư luôn bấm đúng thứ mình cần.
  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const options = [
    { value: 'dat' as const, label: 'Đạt', tone: 'ok' as Tone },
    { value: 'khong_dat' as const, label: 'Không đạt', tone: 'bad' as Tone },
    ...(item.allowNA ? [{ value: 'na' as const, label: 'N/A', tone: 'na' as Tone }] : []),
  ];

  const soAnh = r.evidence.filter((e) => e.loai === 'anh').length;
  const thieuAnh = r.ket_qua && r.ket_qua !== 'na' && soAnh < item.minPhotos;

  async function nhanTep(files: FileList | null, maxSeconds: number) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setDangTai(files.length);
    try {
      const ok: { meta: EvidenceMeta; url: string; file: File; sha256: string }[] = [];
      for (const f of Array.from(files)) {
        const res = await readEvidence(f, maxSeconds);
        if ('error' in res) setUploadError(res.error);
        else ok.push(res);
      }
      if (ok.length) await addEvidence(insp.id, item.code, viTri, ok);
    } finally {
      setDangTai(0);
    }
  }

  function suaDo(idx: number, patch: Partial<GiaTriDo>) {
    const next = r.gia_tri_do.map((g, i) => (i === idx ? { ...g, ...patch } : g));
    setMeasurements(insp.id, item.code, viTri, next);
  }

  return (
    <article
      className="relative overflow-hidden rounded-xl border border-line bg-card"
      id={'hm-' + item.code + (viTri ?? '')}
    >
      <span
        aria-hidden="true"
        className={
          'absolute inset-y-0 left-0 w-1 ' +
          (r.ket_qua === 'dat'
            ? 'bg-ok'
            : r.ket_qua === 'khong_dat'
              ? 'bg-bad'
              : r.ket_qua === 'na'
                ? 'bg-na'
                : 'bg-line-2')
        }
      />

      <div className="pl-4 pr-3.5 pt-3">
        <div className="flex items-start gap-2">
          <span className="tnum mt-0.5 shrink-0 rounded bg-card-2 px-1.5 py-0.5 font-mono text-xs font-semibold text-ink-2">
            {item.code}
            {viTri ? '·T' + viTri : ''}
          </span>
          <h3 className="flex-1 text-[0.95rem] font-semibold leading-snug text-balance">
            {item.title}
          </h3>
          {item.required ? null : <Chip tone="muted">nếu có</Chip>}
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="mt-2 flex w-full items-center gap-1.5 text-left text-xs font-semibold text-brand"
        >
          <svg
            viewBox="0 0 24 24"
            className={'size-4 transition-transform ' + (open ? 'rotate-90' : '')}
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M9 5l7 7-7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Tiêu chí đạt và quy cách bằng chứng
        </button>

        {open ? (
          <dl className="mt-2 space-y-2 rounded-lg bg-card-2 px-3 py-2.5 text-[0.82rem] leading-relaxed">
            <div>
              <dt className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-3">
                Tiêu chí đạt
              </dt>
              <dd className="mt-0.5 text-ink-2">{item.criteria}</dd>
            </div>
            <div>
              <dt className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-3">
                Bằng chứng
              </dt>
              <dd className="mt-0.5 text-ink-2">{item.evidence}</dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-3">
          <Seg
            options={options}
            value={r.ket_qua}
            disabled={locked}
            onChange={(v) => setVerdict(insp.id, item.code, viTri, v)}
          />
        </div>
      </div>

      {item.measurement ? (
        <div className="mt-3 border-t border-line px-3.5 pt-3 pl-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.7rem] font-bold uppercase tracking-wide text-ink-3">
              Giá trị đo ({item.measurement.unit})
            </span>
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                setMeasurements(insp.id, item.code, viTri, [
                  ...r.gia_tri_do,
                  { diem: '', gia_tri: null, don_vi: item.measurement!.unit },
                ])
              }
              className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-brand disabled:opacity-50"
            >
              + Thêm {item.measurement.label.toLowerCase()}
            </button>
          </div>

          {r.gia_tri_do.length === 0 ? (
            <p className="mt-2 text-xs text-ink-3">
              Chưa có số liệu. Tiêu chí là một khoảng số, ghi lại giá trị đọc được để đối chiếu
              về sau.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {r.gia_tri_do.map((g, idx) => {
                const ngoai =
                  item.code === 'C5' &&
                  g.gia_tri != null &&
                  (g.gia_tri < C5_MIN || g.gia_tri > C5_MAX);
                return (
                  <li key={idx} className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <TextInput
                        value={g.diem}
                        disabled={locked}
                        placeholder={item.measurement!.label}
                        onChange={(e) => suaDo(idx, { diem: e.target.value })}
                        className="flex-1 !py-2"
                      />
                      <TextInput
                        value={g.gia_tri ?? ''}
                        disabled={locked}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder="0"
                        onChange={(e) =>
                          suaDo(idx, {
                            gia_tri: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className={
                          'tnum w-24 text-right !py-2 ' + (ngoai ? '!border-bad text-bad' : '')
                        }
                      />
                      <span className="w-8 shrink-0 text-xs font-semibold text-ink-3">
                        {g.don_vi}
                      </span>
                      <button
                        type="button"
                        disabled={locked}
                        aria-label="Xoá dòng đo"
                        onClick={() =>
                          setMeasurements(
                            insp.id,
                            item.code,
                            viTri,
                            r.gia_tri_do.filter((_, i) => i !== idx),
                          )
                        }
                        className="size-9 shrink-0 rounded-lg text-ink-3 active:bg-card-2 disabled:opacity-50"
                      >
                        ×
                      </button>
                    </div>
                    {ngoai ? (
                      <p className="text-xs font-medium text-bad">
                        Ngoài khoảng {C5_MIN}–{C5_MAX} V của tiêu chí 220 V ±5%.
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      <div className="mt-3 border-t border-line px-3.5 py-3 pl-4">
        <TextArea
          value={r.ghi_chu}
          disabled={locked}
          placeholder={
            r.ket_qua === 'khong_dat'
              ? 'Mô tả tồn tại để Nhà thầu khắc phục'
              : 'Ghi chú (không bắt buộc)'
          }
          onChange={(e) => setNote(insp.id, item.code, viTri, e.target.value)}
        />

        {r.evidence.length || dangTai ? (
          <ul className="mt-2.5 grid grid-cols-3 gap-2">
            {Array.from({ length: dangTai }, (_, i) => (
              <li
                key={'dangtai-' + i}
                className="flex aspect-square animate-pulse items-center justify-center rounded-lg border border-dashed border-line-2 bg-card-2 text-[0.62rem] text-ink-3"
              >
                Đang tải…
              </li>
            ))}
            {r.evidence.map((e) => {
              const url = previewOf(e.id);
              return (
                <li
                  key={e.id}
                  className={
                    'relative overflow-hidden rounded-lg border border-line bg-card-2 ' +
                    (dangXoaAnh === e.id ? 'animate-pulse opacity-45' : '')
                  }
                >
                  <div className="flex aspect-square items-center justify-center">
                    {url && e.loai === 'anh' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={e.ten_tep} className="size-full object-cover" />
                    ) : url && e.loai === 'video' ? (
                      <video src={url} className="size-full object-cover" muted playsInline />
                    ) : (
                      <span className="px-2 text-center text-[0.62rem] leading-tight text-ink-3">
                        {e.loai === 'anh' ? 'Ảnh' : e.loai === 'video' ? 'Video' : 'Tệp'}
                        <br />
                        đã lưu
                      </span>
                    )}
                  </div>
                  <div className="border-t border-line px-1.5 py-1">
                    <p className="tnum truncate text-[0.62rem] text-ink-3">
                      {e.duration_seconds != null
                        ? e.duration_seconds + 's · '
                        : e.width
                          ? e.width + '×' + e.height + ' · '
                          : ''}
                      {formatBytes(e.size_bytes)}
                    </p>
                  </div>
                  {e.canh_bao ? (
                    <span
                      title={e.canh_bao}
                      className="absolute left-1 top-1 rounded bg-warn px-1 text-[0.6rem] font-bold text-white"
                    >
                      !
                    </span>
                  ) : null}
                  {!locked ? (
                    <button
                      type="button"
                      aria-label={'Xoá ' + e.ten_tep}
                      disabled={dangXoaAnh !== null}
                      onClick={async () => {
                        setDangXoaAnh(e.id);
                        try {
                          await removeEvidence(insp.id, item.code, viTri, e.id);
                        } finally {
                          setDangXoaAnh(null);
                        }
                      }}
                      className="absolute right-1 top-1 size-6 rounded-full bg-ink/70 text-sm font-bold leading-none text-paper disabled:opacity-45"
                    >
                      ×
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {thieuAnh ? (
          <p className="mt-2 text-xs font-medium text-warn">
            Quy cách cần {item.minPhotos} ảnh, hiện có {soAnh}. Vẫn phát hành được nhưng sẽ bị
            ghi nhận thiếu khi Bên A hậu kiểm.
          </p>
        ) : null}

        {uploadError ? <p className="mt-2 text-xs font-medium text-bad">{uploadError}</p> : null}

        {!locked ? (
          <div className="mt-2.5 flex flex-wrap gap-2">
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void nhanTep(e.target.files, item.maxVideoSeconds);
                e.target.value = '';
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                void nhanTep(e.target.files, item.maxVideoSeconds);
                e.target.value = '';
              }}
            />
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                void nhanTep(e.target.files, item.maxVideoSeconds);
                e.target.value = '';
              }}
            />
            <EvidenceButton disabled={!!dangTai} onClick={() => cameraRef.current?.click()}>
              Chụp ảnh
              {item.minPhotos ? (
                <span className="tnum ml-1 text-ink-3">
                  {soAnh}/{item.minPhotos}
                </span>
              ) : null}
            </EvidenceButton>
            <EvidenceButton disabled={!!dangTai} onClick={() => photoRef.current?.click()}>
              Thư viện
            </EvidenceButton>
            {item.suggestVideo ? (
              <EvidenceButton disabled={!!dangTai} onClick={() => videoRef.current?.click()}>
                Quay video ≤{item.maxVideoSeconds}s
              </EvidenceButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function EvidenceButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-11 flex-1 rounded-lg border border-dashed border-line-2 px-3 text-sm font-semibold text-ink-2 active:bg-card-2 disabled:opacity-45"
    >
      {children}
    </button>
  );
}
