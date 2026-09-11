'use client';

import { useEffect, useRef, useState } from 'react';
import { ItemCard } from '@/components/ItemCard';
import {
  Card,
  Chip,
  Field,
  SectionTitle,
  Select,
  TextInput,
  Toggle,
} from '@/components/ui';
import {
  GROUPS,
  RECONCILE_FIELDS,
  TINH_TP,
  itemsInGroup,
} from '@/lib/checklist';
import {
  addCabinet,
  getResult,
  patchCabinet,
  patchDoiChieu,
  patchInspection,
  patchStation,
  removeCabinet,
  stationPatch,
  stationValue,
} from '@/lib/store';
import type { ReconcileFieldKey } from '@/lib/checklist';
import type { Inspection } from '@/lib/types';

interface StepProps {
  insp: Inspection;
  locked: boolean;
}

/* ------------------------------------------------- 1 · đối chiếu thông tin */

export function Step1({ insp, locked }: StepProps) {
  const [gps, setGps] = useState<{ text: string; tone: 'ok' | 'bad' | 'warn' } | null>(null);
  const [dangDo, setDangDo] = useState(false);
  // Toạ độ lưu thành hai số lat/lng, nhưng gõ dở ("10.7,") thì chưa tách được -
  // giữ nguyên chuỗi đang gõ ở đây, chỉ ghi xuống khi tách được.
  const [toaDo, setToaDo] = useState(() => stationValue(insp.station, 'toa_do'));

  function ghi(key: ReconcileFieldKey, raw: string) {
    if (key === 'toa_do') setToaDo(raw);
    const patch = stationPatch(key, raw);
    if (patch) void patchStation(insp.id, patch);
  }

  function layToaDo() {
    if (!navigator.geolocation) {
      setGps({ text: 'Thiết bị không hỗ trợ định vị.', tone: 'bad' });
      return;
    }
    setDangDo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDangDo(false);
        const { latitude, longitude } = pos.coords;
        const text = latitude.toFixed(6) + ', ' + longitude.toFixed(6);
        setToaDo(text);
        void patchStation(insp.id, { lat: latitude, lng: longitude });
        setGps({ text: 'Đã ghi toạ độ ' + text, tone: 'ok' });
      },
      (err) => {
        setDangDo(false);
        setGps({ text: 'Không lấy được toạ độ: ' + err.message, tone: 'bad' });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <>
      <SectionTitle note="BM03 mục 1">Thông tin Trạm</SectionTitle>
      <p className="mb-3 text-sm leading-relaxed text-ink-2">
        Ghi lại giá trị thực tế đọc được tại hiện trường, tick Khớp nếu đúng với biên bản chỉ
        định FAC.
      </p>

      <div className="flex flex-col gap-2">
        {RECONCILE_FIELDS.map((f) => {
          const value = f.key === 'toa_do' ? toaDo : stationValue(insp.station, f.key);
          const row = insp.doi_chieu[f.key];
          return (
            <Card key={f.key} stripe={row.khop ? 'ok' : 'muted'} className="py-3 pl-4 pr-3.5">
              <h3 className="text-sm font-semibold">
                {f.label}
                {f.required ? <span className="text-bad"> *</span> : null}
              </h3>
              <div className="mt-2 flex flex-col gap-2">
                <TextInput
                  value={value}
                  disabled={locked}
                  placeholder="Giá trị ghi nhận tại hiện trường"
                  onChange={(e) => ghi(f.key, e.target.value)}
                />
                {f.key === 'dia_chi' ? (
                  <Select
                    value={insp.station?.tinh_tp ?? ''}
                    disabled={locked}
                    onChange={(e) => patchStation(insp.id, { tinh_tp: e.target.value })}
                  >
                    <option value="">— Chọn Tỉnh / Thành phố * —</option>
                    {TINH_TP.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                ) : null}
                {f.key === 'toa_do' && !locked ? (
                  <button
                    type="button"
                    onClick={layToaDo}
                    disabled={dangDo}
                    className="min-h-11 rounded-lg border border-dashed border-line-2 text-sm font-semibold text-brand disabled:opacity-60"
                  >
                    {dangDo ? 'Đang lấy toạ độ…' : 'Lấy toạ độ thiết bị'}
                  </button>
                ) : null}
                {f.key === 'toa_do' && gps ? (
                  <p
                    className={
                      'text-xs font-medium ' +
                      (gps.tone === 'ok' ? 'text-ok' : gps.tone === 'bad' ? 'text-bad' : 'text-warn')
                    }
                  >
                    {gps.text}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Toggle
                    checked={row.khop}
                    disabled={locked}
                    onChange={(v) => patchDoiChieu(insp.id, f.key, { khop: v })}
                    label="Khớp"
                  />
                  <TextInput
                    value={row.ghi_chu}
                    disabled={locked}
                    placeholder="Ghi chú"
                    onChange={(e) => patchDoiChieu(insp.id, f.key, { ghi_chu: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------------------------------------ 2 · các Tủ */

export function Step2({ insp, locked }: StepProps) {
  const [moHangMuc, setMoHangMuc] = useState<string[]>([]);

  return (
    <>
      <SectionTitle note="BM02 phần 2">Tình trạng Tủ khi nộp</SectionTitle>
      <p className="mb-3 text-sm leading-relaxed text-ink-2">
        Phiên bản phần mềm và trạng thái kết nối là giá trị tại thời điểm nghiệm thu, ghi kèm
        biên bản này. Tủ offline vẫn tính 01 Lượt theo Điều 7.3.
      </p>

      <div className="flex flex-col gap-2">
        {insp.cabinets.map((c) => {
          const mo = moHangMuc.includes(c.id);
          const soAnh = itemsInGroup('B').reduce(
            (n, it) => n + getResult(insp, it.code, c.vi_tri).evidence.filter((e) => e.loai === 'anh').length,
            0,
          );
          return (
            <Card key={c.id} stripe={c.co_dien && c.online ? 'ok' : 'warn'} className="p-3.5 pl-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Tủ {c.vi_tri}</h3>
                <span className="ml-auto flex items-center gap-2">
                  {!locked && insp.cabinets.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeCabinet(insp.id, c.id)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-bad"
                    >
                      Xoá
                    </button>
                  ) : null}
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-3.5">
                <Field label="Số sê-ri đọc trên tem" required>
                  <TextInput
                    value={c.sn}
                    disabled={locked}
                    autoCapitalize="characters"
                    className="tnum font-mono"
                    onChange={(e) => patchCabinet(insp.id, c.id, { sn: e.target.value })}
                  />
                </Field>


                <Field label="Loại Tủ">
                  <div className="flex gap-2">
                    {[6, 12].map((n) => (
                      <Toggle
                        key={n}
                        checked={c.loai_tu === n}
                        disabled={locked}
                        onChange={(v) =>
                          patchCabinet(insp.id, c.id, { loai_tu: v ? (n as 6 | 12) : null })
                        }
                        label={n + ' ngăn'}
                      />
                    ))}
                  </div>
                </Field>

                <Field label="Phiên bản FW hiển thị trên màn hình">
                  <TextInput
                    value={c.fw_version}
                    disabled={locked}
                    placeholder="vd. 2.4.1-rc3"
                    className="tnum font-mono"
                    onChange={(e) => patchCabinet(insp.id, c.id, { fw_version: e.target.value })}
                  />
                </Field>

                <div className="flex flex-col items-start gap-2">
                  <Toggle
                    checked={c.co_dien}
                    disabled={locked}
                    onChange={(v) => patchCabinet(insp.id, c.id, { co_dien: v })}
                    label={c.co_dien ? 'Có điện' : 'Không có điện'}
                  />
                  <Toggle
                    checked={c.online}
                    disabled={locked}
                    onChange={(v) => patchCabinet(insp.id, c.id, { online: v })}
                    label={c.online ? 'Có mạng' : 'Không có mạng'}
                  />
                </div>
              </div>

              {/* B1-B5 chấm ngay tại Tủ; gập lại cho đỡ dài, mặc định đóng. */}
              <div className="mt-3 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() =>
                    setMoHangMuc((cur) =>
                      cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id],
                    )
                  }
                  aria-expanded={mo}
                  className="flex w-full items-center gap-1.5 text-left text-sm font-semibold text-brand"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={'size-4 transition-transform ' + (mo ? 'rotate-90' : '')}
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
                  <span className="flex-1">Hạng mục B1–B5 của Tủ {c.vi_tri}</span>
                  <span className="tnum text-xs font-normal text-ink-3">{soAnh} ảnh</span>
                </button>

                {mo ? (
                  <div className="mt-2 flex flex-col gap-2">
                    {itemsInGroup('B').map((it) => (
                      <ItemCard
                        key={it.code}
                        insp={insp}
                        item={it}
                        viTri={c.vi_tri}
                        locked={locked}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      {!locked ? (
        <button
          type="button"
          onClick={() => addCabinet(insp.id)}
          className="mt-2 min-h-11 w-full rounded-xl border border-dashed border-line-2 text-sm font-semibold text-brand active:bg-card-2"
        >
          + Thêm Tủ {Math.max(0, ...insp.cabinets.map((c) => c.vi_tri)) + 1}
        </button>
      ) : null}
    </>
  );
}

/* -------------------------------------------------- 3 · người nghiệm thu */

export function Step3({ insp, locked }: StepProps) {
  return (
    <>
      <SectionTitle note="bắt buộc">Người lập hồ sơ</SectionTitle>
      <Card className="flex flex-col gap-3.5 p-3.5">
        <Field label="Người lập hồ sơ" required>
          <TextInput
            value={insp.nguoi_lap_ho_so}
            disabled={locked}
            placeholder="Họ tên người ký biên bản"
            onChange={(e) => patchInspection(insp.id, { nguoi_lap_ho_so: e.target.value })}
          />
        </Field>
        <Field label="Số điện thoại" required>
          <TextInput
            value={insp.nha_thau_phone}
            disabled={locked}
            type="tel"
            inputMode="tel"
            className="tnum"
            onChange={(e) => patchInspection(insp.id, { nha_thau_phone: e.target.value })}
          />
        </Field>
      </Card>

      <SectionTitle>Thời gian nghiệm thu</SectionTitle>
      <Card className="flex flex-col gap-3.5 p-3.5">
        <Field label="Bắt đầu" required>
          <TextInput
            type="datetime-local"
            value={insp.tu_thoi_gian}
            disabled={locked}
            className="tnum"
            onChange={(e) => patchInspection(insp.id, { tu_thoi_gian: e.target.value })}
          />
        </Field>
        <Field label="Kết thúc" required>
          <TextInput
            type="datetime-local"
            value={insp.den_thoi_gian}
            disabled={locked}
            className="tnum"
            onChange={(e) => patchInspection(insp.id, { den_thoi_gian: e.target.value })}
          />
        </Field>
      </Card>
    </>
  );
}

/* ------------------------------------------------------- 4 · hạng mục */

/**
 * Cuộn để đầu nhóm vừa mở nằm ngay dưới AppBar + thanh bước, không bị hai
 * thanh sticky che mất. Đo trực tiếp trên DOM vì Step4 không có ref tới
 * chúng - đổi chiều cao AppBar/thanh bước thì chỗ này tự theo, không cần sửa.
 */
function scrollLenTren(el: HTMLElement) {
  const appBar = document.querySelector<HTMLElement>('header.sticky');
  const thanhBuoc = document.querySelector<HTMLElement>('nav[aria-label="Các bước"]');
  const choTrong = (appBar?.offsetHeight ?? 0) + (thanhBuoc?.offsetHeight ?? 0) + 8;
  const top = el.getBoundingClientRect().top + window.scrollY - choTrong;
  window.scrollTo({ top, behavior: 'smooth' });
}

export function Step4({ insp, locked }: StepProps) {
  const [moNhom, setMoNhom] = useState<string | null>('A');
  const [moCacTu, setMoCacTu] = useState<string[]>([]);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  // Bỏ qua lần chạy đầu: 'A' mở sẵn khi vào trang, không phải do bấm mở.
  const daBamMo = useRef(false);

  useEffect(() => {
    if (!moNhom || !daBamMo.current) return;
    const el = sectionRefs.current[moNhom];
    if (el) scrollLenTren(el);
  }, [moNhom]);

  return (
    <>
      <SectionTitle note="BM03 mục 3">Kết quả theo hạng mục</SectionTitle>

      <div className="flex flex-col gap-2">
        {GROUPS.map((g) => {
          const items = itemsInGroup(g.key);
          const cells = items.flatMap((it) =>
            it.perCabinet
              ? insp.cabinets.map((c) => ({ it, viTri: c.vi_tri }))
              : [{ it, viTri: null as number | null }],
          );
          const xong = cells.filter((c) => getResult(insp, c.it.code, c.viTri).ket_qua).length;
          const hong = cells.filter(
            (c) => getResult(insp, c.it.code, c.viTri).ket_qua === 'khong_dat',
          ).length;
          const mo = moNhom === g.key;

          return (
            <section
              key={g.key}
              ref={(el) => {
                sectionRefs.current[g.key] = el;
              }}
              className="overflow-hidden rounded-xl border border-line bg-card"
            >
              <button
                type="button"
                onClick={() => {
                  daBamMo.current = true;
                  setMoNhom(mo ? null : g.key);
                }}
                aria-expanded={mo}
                className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-card-2"
              >
                <span
                  className={
                    'flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ' +
                    (xong === cells.length
                      ? 'bg-ok-soft text-ok'
                      : xong > 0
                        ? 'bg-brand-soft text-brand'
                        : 'bg-card-2 text-ink-3')
                  }
                >
                  {g.key}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{g.label}</span>
                  <span className="tnum block text-xs text-ink-3">
                    {xong}/{cells.length} hạng mục
                    {hong ? ' · ' + hong + ' không đạt' : ''}
                  </span>
                </span>
                {hong ? <Chip tone="bad">{hong}</Chip> : null}
                <svg
                  viewBox="0 0 24 24"
                  className={'size-5 shrink-0 text-ink-3 transition-transform ' + (mo ? 'rotate-90' : '')}
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
              </button>

              {mo ? (
                <div className="flex flex-col gap-2 border-t border-line bg-paper p-2">
                  {g.key === 'B' ? (
                    // B chấm ở tab Tủ; ở đây gom theo Tủ, chỉ soi lại đã đủ ảnh chưa.
                    insp.cabinets.map((cab) => {
                      const items = itemsInGroup('B');
                      const moTu = moCacTu.includes(cab.id);
                      const anhCua = (code: string, min: number) => {
                        const n = getResult(insp, code, cab.vi_tri).evidence.filter(
                          (e) => e.loai === 'anh',
                        ).length;
                        return { n, du: n >= min };
                      };
                      const tong = items.reduce((a, it) => a + anhCua(it.code, it.minPhotos).n, 0);
                      return (
                        <div key={cab.id} className="overflow-hidden rounded-lg bg-card">
                          <button
                            type="button"
                            onClick={() =>
                              setMoCacTu((cur) =>
                                cur.includes(cab.id)
                                  ? cur.filter((x) => x !== cab.id)
                                  : [...cur, cab.id],
                              )
                            }
                            aria-expanded={moTu}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left active:bg-card-2"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className={'size-4 shrink-0 text-ink-3 transition-transform ' + (moTu ? 'rotate-90' : '')}
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
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                              Tủ {cab.vi_tri}
                            </span>
                            <span className="tnum text-xs text-ink-3">{tong} ảnh</span>
                          </button>

                          {moTu ? (
                            <div className="border-t border-line">
                              {items.map((it) => {
                                const { n, du } = anhCua(it.code, it.minPhotos);
                                return (
                                  <div
                                    key={it.code}
                                    className="flex items-center gap-2 px-3 py-2 pl-9"
                                  >
                                    <span className="font-mono text-xs font-bold text-ink-3">
                                      {it.code}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm">
                                      {it.title}
                                    </span>
                                    <span
                                      className={
                                        'tnum text-xs font-semibold ' +
                                        (du ? 'text-ok' : 'text-ink-3')
                                      }
                                    >
                                      {n}/{it.minPhotos} ảnh
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    cells.map(({ it, viTri }) => (
                      <ItemCard
                        key={it.code + (viTri ?? '')}
                        insp={insp}
                        item={it}
                        viTri={viTri}
                        locked={locked}
                      />
                    ))
                  )}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
