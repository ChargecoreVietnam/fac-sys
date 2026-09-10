'use client';

/**
 * Lớp dữ liệu duy nhất của app, đọc/ghi thẳng Supabase.
 *
 * Giao diện vẫn đọc đồng bộ qua useDB: bản sao dữ liệu nằm trong bộ nhớ, mỗi
 * hàm sửa cập nhật bản sao trước rồi mới đẩy lên máy chủ. Không có bộ nhớ đệm
 * ngoại tuyến - mất mạng là mất thao tác đang gõ.
 *
 * ponytail: ghi thẳng, không hàng đợi. Cần làm việc ngoại tuyến thì thay bằng
 * hàng đợi ghi trong IndexedDB.
 */
import { useSyncExternalStore } from 'react';
import { CHECKLIST, RECONCILE_FIELDS } from './checklist';
import type { InspectionVerdict, ItemVerdict } from './checklist';
import { supabase } from './supabase';
import type {
  DoiChieu,
  EvidenceMeta,
  GiaTriDo,
  Inspection,
  InspectionCabinet,
  ItemResult,
  Profile,
  ReportKind,
} from './types';
import { resultKey } from './types';

/** Đuôi email do app tự ghép, kỹ sư chỉ gõ tên đăng nhập. */
export const EMAIL_DOMAIN = '@chargecore.com.vn';

const BUCKET = 'evidence';

interface DB {
  session: Profile | null;
  /** Biên bản tạo trong phiên này. Biểu mẫu không đọc lại dữ liệu cũ. */
  inspections: Inspection[];
}

const RONG: DB = { session: null, inspections: [] };

let db: DB = RONG;
/** Chưa hỏi xong Supabase còn phiên nào không thì màn hình phải chờ, không đá về /login. */
let sanSang = false;
const listeners = new Set<() => void>();

/** URL xem ảnh/video: blob khi vừa chọn tệp, URL ký khi tải từ máy chủ. */
const previews = new Map<string, string>();
export const previewOf = (id: string) => previews.get(id);

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  khoiDong();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useDB(): DB | null {
  return useSyncExternalStore(
    subscribe,
    () => (sanSang ? db : null),
    () => null,
  );
}

// ------------------------------------------------------------------ phiên

let daKhoiDong = false;
function khoiDong() {
  if (daKhoiDong) return;
  daKhoiDong = true;
  void supabase.auth.getSession().then(({ data }) => apDungPhien(data.session?.user.id ?? null));
  supabase.auth.onAuthStateChange((_e, phien) => {
    const id = phien?.user.id ?? null;
    if (id !== db.session?.id) void apDungPhien(id);
  });
}

/** Hồ sơ lấy từ public.profiles, hàng do trigger on_auth_user_created tạo sẵn. */
async function apDungPhien(userId: string | null) {
  if (!userId) {
    db = RONG;
    sanSang = true;
    emit();
    return null;
  }
  const { data } = await supabase
    .from('profiles')
    .select('id, ho_ten, chuc_vu, role')
    .eq('id', userId)
    .maybeSingle();
  db = { ...db, session: (data as Profile | null) ?? null };
  if (db.session) await taiBanNhap(db.session.id);
  sanSang = true;
  emit();
  return db.session;
}

/** Trả lỗi dạng chuỗi để màn đăng nhập hiển thị, null là thành công. */
export async function signIn(username: string, password: string): Promise<string | null> {
  // Gõ sẵn cả email thì dùng nguyên, không ghép đuôi nữa.
  const u = username.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: u.includes('@') ? u : u + EMAIL_DOMAIN,
    password,
  });
  if (error) return 'Tên đăng nhập hoặc mật khẩu không đúng.';
  const profile = await apDungPhien(data.user.id);
  if (!profile) return 'Tài khoản chưa có hồ sơ trong hệ thống, liên hệ quản trị.';
  return null;
}

export async function signOut() {
  await supabase.auth.signOut();
  db = RONG;
  sanSang = true;
  emit();
}

/** timestamptz -> giá trị của <input type="datetime-local">. */
function localInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    p(d.getMonth() + 1) +
    '-' +
    p(d.getDate()) +
    'T' +
    p(d.getHours()) +
    ':' +
    p(d.getMinutes())
  );
}

// --------------------------------------------------------- đọc bản nháp

interface RowCabinet {
  id: string;
  cabinet_id: string | null;
  vi_tri: number;
  sn: string;
  loai_tu: 6 | 12 | null;
  fw_version: string | null;
  co_dien: boolean;
  online: boolean;
}

interface RowEvidence {
  id: string;
  loai: EvidenceMeta['loai'];
  storage_path: string;
  size_bytes: number;
  mime: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  taken_at: string | null;
  lat: number | null;
  lng: number | null;
}

interface RowResult {
  id: string;
  code: string;
  cabinet_id: string | null;
  ket_qua: ItemVerdict | null;
  ghi_chu: string | null;
  gia_tri_do: GiaTriDo[] | null;
  evidence: RowEvidence[];
}

interface RowInspection {
  id: string;
  station_id: string | null;
  inspector_id: string;
  luot_thu: number | null;
  so_bien_ban: string | null;
  status: Inspection['status'];
  doi_chieu: DoiChieu;
  nha_thau: string;
  nguoi_lap_ho_so: string;
  nha_thau_phone: string;
  nguoi_nghiem_thu_ten: string;
  nguoi_nghiem_thu_chuc_vu: string;
  tu_thoi_gian: string;
  den_thoi_gian: string | null;
  ket_luan: InspectionVerdict | null;
  ket_luan_ghi_chu: string | null;
  yeu_cau_khac_phuc: string | null;
  ngay_phat_hanh: string | null;
  created_at: string;
  inspection_reports: { noi_dung: ReportKind; ly_do: string } | null;
  inspection_cabinets: RowCabinet[];
  item_results: RowResult[];
}

const CHON =
  '*, inspection_reports(noi_dung, ly_do), inspection_cabinets(*), ' +
  'item_results(id, code, cabinet_id, ket_qua, ghi_chu, gia_tri_do, evidence(*))';

function mapInspection(r: RowInspection): Inspection {
  const cabinets: InspectionCabinet[] = [...r.inspection_cabinets]
    .sort((a, b) => a.vi_tri - b.vi_tri)
    .map((c) => ({
      id: c.id,
      cabinet_id: c.cabinet_id,
      vi_tri: c.vi_tri,
      sn: c.sn,
      loai_tu: c.loai_tu,
      fw_version: c.fw_version ?? '',
      co_dien: c.co_dien,
      online: c.online,
    }));
  const viTriCua = new Map(cabinets.map((c) => [c.id, c.vi_tri]));

  const results: Record<string, ItemResult> = {};
  for (const row of r.item_results) {
    const viTri = row.cabinet_id ? (viTriCua.get(row.cabinet_id) ?? null) : null;
    results[resultKey(row.code, viTri)] = {
      id: row.id,
      code: row.code,
      vi_tri: viTri,
      ket_qua: row.ket_qua,
      ghi_chu: row.ghi_chu ?? '',
      gia_tri_do: row.gia_tri_do ?? [],
      evidence: row.evidence.map((e) => ({
        id: e.id,
        loai: e.loai,
        ten_tep: e.storage_path.split('/').pop() ?? e.storage_path,
        storage_path: e.storage_path,
        size_bytes: e.size_bytes,
        mime: e.mime,
        width: e.width,
        height: e.height,
        duration_seconds: e.duration_seconds == null ? null : Number(e.duration_seconds),
        taken_at: e.taken_at,
        lat: e.lat,
        lng: e.lng,
        canh_bao: null,
      })),
    };
  }

  return {
    id: r.id,
    station_id: r.station_id,
    inspector_id: r.inspector_id,
    luot_thu: r.luot_thu,
    so_bien_ban: r.so_bien_ban,
    status: r.status,
    doi_chieu: r.doi_chieu,
    nha_thau: r.nha_thau,
    nguoi_lap_ho_so: r.nguoi_lap_ho_so,
    nha_thau_phone: r.nha_thau_phone,
    nguoi_nghiem_thu_ten: r.nguoi_nghiem_thu_ten,
    nguoi_nghiem_thu_chuc_vu: r.nguoi_nghiem_thu_chuc_vu,
    tu_thoi_gian: localInput(new Date(r.tu_thoi_gian)),
    den_thoi_gian: r.den_thoi_gian ? localInput(new Date(r.den_thoi_gian)) : '',
    ket_luan: r.ket_luan,
    ket_luan_ghi_chu: r.ket_luan_ghi_chu ?? '',
    yeu_cau_khac_phuc: r.yeu_cau_khac_phuc ?? '',
    bao_cao: r.inspection_reports,
    ngay_phat_hanh: r.ngay_phat_hanh,
    created_at: r.created_at,
    cabinets,
    results,
  };
}

/**
 * Đăng nhập lại thì nhặt bản nháp gần nhất của chính mình. Chưa chuyển sang
 * 'submitted' nghĩa là còn làm dở - mỗi kỹ sư giữ tối đa một bản.
 */
async function taiBanNhap(userId: string) {
  const { data } = await supabase
    .from('inspections')
    .select(CHON)
    .eq('inspector_id', userId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return;
  db = { ...db, inspections: [mapInspection(data as unknown as RowInspection)] };
  await kyUrlXemTruoc();
}

/** Bucket đóng nên ảnh cần URL ký, hạn 1 giờ. */
async function kyUrlXemTruoc() {
  const can = db.inspections
    .flatMap((i) => Object.values(i.results))
    .flatMap((r) => r.evidence)
    .filter((e) => e.storage_path && !previews.has(e.id));
  if (!can.length) return;
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(
      can.map((e) => e.storage_path),
      3600,
    );
  data?.forEach((d, i) => {
    if (d.signedUrl) previews.set(can[i].id, d.signedUrl);
  });
  emit();
}

/** Bản nháp đang làm dở của kỹ sư đang đăng nhập, nếu có. */
export const banNhap = () =>
  db.inspections.find((i) => i.status === 'draft' && i.inspector_id === db.session?.id);

// -------------------------------------------------------------- biên bản

export const inspectionById = (id: string) => db.inspections.find((i) => i.id === id);

function emptyDoiChieu(): DoiChieu {
  const out = {} as DoiChieu;
  for (const f of RECONCILE_FIELDS) {
    out[f.key] = { bm01: '', bm02: '', khop: false, ghi_chu: '' };
  }
  return out;
}

/** Sửa bản sao trong bộ nhớ; phần ghi lên máy chủ do hàm gọi tự lo. */
function mutate(id: string, fn: (i: Inspection) => Inspection) {
  db = { ...db, inspections: db.inspections.map((i) => (i.id === id ? fn(i) : i)) };
  emit();
}

/** Biểu mẫu trắng: không đọc Trạm, không đếm lượt cũ. Chỉ INSERT rồi giữ trong bộ nhớ. */
export async function createInspection(): Promise<string> {
  const inspector = db.session;
  if (!inspector) throw new Error('Chưa đăng nhập');

  const tu_thoi_gian = new Date();
  const { data, error } = await supabase
    .from('inspections')
    .insert({
      inspector_id: inspector.id,
      doi_chieu: emptyDoiChieu(),
      nha_thau: '',
      nguoi_lap_ho_so: '',
      nha_thau_phone: '',
      nguoi_nghiem_thu_ten: inspector.ho_ten,
      nguoi_nghiem_thu_chuc_vu: inspector.chuc_vu,
      tu_thoi_gian: tu_thoi_gian.toISOString(),
    })
    .select('id, created_at')
    .single();
  if (error || !data) throw new Error('Không tạo được biên bản: ' + (error?.message ?? ''));

  db = {
    ...db,
    inspections: [
      {
        id: data.id,
        station_id: null,
        inspector_id: inspector.id,
        luot_thu: null,
        so_bien_ban: null,
        status: 'draft',
        doi_chieu: emptyDoiChieu(),
        nha_thau: '',
        nguoi_lap_ho_so: '',
        nha_thau_phone: '',
        nguoi_nghiem_thu_ten: inspector.ho_ten,
        nguoi_nghiem_thu_chuc_vu: inspector.chuc_vu,
        tu_thoi_gian: localInput(tu_thoi_gian),
        den_thoi_gian: '',
        ket_luan: null,
        ket_luan_ghi_chu: '',
        yeu_cau_khac_phuc: '',
        bao_cao: null,
        ngay_phat_hanh: null,
        created_at: data.created_at,
        cabinets: [],
        results: {},
      },
      ...db.inspections,
    ],
  };
  emit();

  // Mở biên bản với đúng Tủ 1; kỹ sư bấm thêm nếu Trạm có nhiều Tủ hơn.
  await addCabinet(data.id);
  return data.id;
}

const cotThoiGian = (v: string) => (v ? new Date(v).toISOString() : null);

export async function patchInspection(id: string, patch: Partial<Inspection>) {
  mutate(id, (i) => ({ ...i, ...patch }));

  const cot: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'cabinets' || k === 'results' || k === 'id') continue;
    cot[k] = k === 'tu_thoi_gian' || k === 'den_thoi_gian' ? cotThoiGian(v as string) : v;
  }
  if (Object.keys(cot).length) await supabase.from('inspections').update(cot).eq('id', id);
}

export async function patchDoiChieu(
  id: string,
  key: keyof DoiChieu,
  patch: Partial<DoiChieu[keyof DoiChieu]>,
) {
  mutate(id, (i) => ({
    ...i,
    doi_chieu: { ...i.doi_chieu, [key]: { ...i.doi_chieu[key], ...patch } },
  }));
  const insp = inspectionById(id);
  if (insp) await supabase.from('inspections').update({ doi_chieu: insp.doi_chieu }).eq('id', id);
}

export async function addCabinet(id: string) {
  const insp = inspectionById(id);
  if (!insp) return;
  const vi_tri = Math.max(0, ...insp.cabinets.map((c) => c.vi_tri)) + 1;
  const { data } = await supabase
    .from('inspection_cabinets')
    .insert({ inspection_id: id, cabinet_id: null, vi_tri, sn: '' })
    .select('id')
    .single();
  if (!data) return;
  mutate(id, (i) => ({
    ...i,
    cabinets: [
      ...i.cabinets,
      {
        id: data.id,
        cabinet_id: null,
        vi_tri,
        sn: '',
        loai_tu: null,
        fw_version: '',
        co_dien: false,
        online: false,
      },
    ],
  }));
}

/**
 * Xoá Tủ rồi đánh số lại 1..n cho liền mạch. Ô kết quả trỏ tới cabinet_id nên
 * tự đi theo Tủ, chỉ cần cập nhật vi_tri.
 */
export async function removeCabinet(id: string, cabId: string) {
  const insp = inspectionById(id);
  if (!insp || insp.cabinets.length < 2) return;
  await supabase.from('inspection_cabinets').delete().eq('id', cabId);

  const conLai = insp.cabinets.filter((c) => c.id !== cabId);
  for (const [idx, c] of conLai.entries()) {
    if (c.vi_tri !== idx + 1)
      await supabase.from('inspection_cabinets').update({ vi_tri: idx + 1 }).eq('id', c.id);
  }

  const soMoi = new Map(conLai.map((c, idx) => [c.vi_tri, idx + 1]));
  mutate(id, (i) => {
    const results: Inspection['results'] = {};
    for (const r of Object.values(i.results)) {
      if (r.vi_tri == null) {
        results[resultKey(r.code, null)] = r;
        continue;
      }
      const moi = soMoi.get(r.vi_tri);
      if (moi == null) continue; // ô của Tủ vừa xoá
      results[resultKey(r.code, moi)] = { ...r, vi_tri: moi };
    }
    return {
      ...i,
      cabinets: conLai.map((c) => ({ ...c, vi_tri: soMoi.get(c.vi_tri)! })),
      results,
    };
  });
}

export async function patchCabinet(id: string, cabId: string, patch: Partial<InspectionCabinet>) {
  mutate(id, (i) => ({
    ...i,
    cabinets: i.cabinets.map((c) => (c.id === cabId ? { ...c, ...patch } : c)),
  }));
  await supabase.from('inspection_cabinets').update(patch).eq('id', cabId);
}

// ------------------------------------------------------------ ô kết quả

function blankResult(code: string, viTri: number | null): ItemResult {
  return { code, vi_tri: viTri, ket_qua: null, ghi_chu: '', gia_tri_do: [], evidence: [] };
}

export function getResult(insp: Inspection, code: string, viTri: number | null) {
  return insp.results[resultKey(code, viTri)] ?? blankResult(code, viTri);
}

/** Tạo hàng item_results nếu chưa có và trả id, vì evidence phải trỏ vào nó. */
async function ghiOKetQua(
  id: string,
  code: string,
  viTri: number | null,
  patch: Partial<ItemResult>,
): Promise<string | null> {
  const insp = inspectionById(id);
  if (!insp) return null;
  const cabinetId = viTri == null ? null : (insp.cabinets.find((c) => c.vi_tri === viTri)?.id ?? null);
  const cu = getResult(insp, code, viTri);

  const { data } = await supabase
    .from('item_results')
    .upsert(
      {
        inspection_id: id,
        code,
        cabinet_id: cabinetId,
        ket_qua: patch.ket_qua !== undefined ? patch.ket_qua : cu.ket_qua,
        ghi_chu: patch.ghi_chu !== undefined ? patch.ghi_chu : cu.ghi_chu,
        gia_tri_do: patch.gia_tri_do !== undefined ? patch.gia_tri_do : cu.gia_tri_do,
      },
      { onConflict: 'inspection_id,code,cabinet_id' },
    )
    .select('id')
    .single();

  const k = resultKey(code, viTri);
  mutate(id, (i) => ({
    ...i,
    results: { ...i.results, [k]: { ...cu, ...patch, id: data?.id ?? cu.id } },
  }));
  return data?.id ?? cu.id ?? null;
}

export async function setVerdict(
  id: string,
  code: string,
  viTri: number | null,
  ket_qua: ItemVerdict | null,
) {
  await ghiOKetQua(id, code, viTri, { ket_qua });
}

export async function setNote(id: string, code: string, viTri: number | null, ghi_chu: string) {
  await ghiOKetQua(id, code, viTri, { ghi_chu });
}

export async function setMeasurements(
  id: string,
  code: string,
  viTri: number | null,
  gia_tri_do: GiaTriDo[],
) {
  await ghiOKetQua(id, code, viTri, { gia_tri_do });
}

// ------------------------------------------------------------- bằng chứng

export async function addEvidence(
  id: string,
  code: string,
  viTri: number | null,
  items: { meta: EvidenceMeta; url: string; file: File; sha256: string }[],
) {
  const resultId = await ghiOKetQua(id, code, viTri, {});
  if (!resultId) return;

  for (const it of items) {
    // Thư mục đầu phải là id biên bản, RLS của bucket kiểm đúng chỗ đó.
    const duoi = it.file.name.split('.').pop() ?? 'bin';
    const path = id + '/' + resultId + '/' + crypto.randomUUID() + '.' + duoi;

    const { error: loiTai } = await supabase.storage
      .from(BUCKET)
      .upload(path, it.file, { contentType: it.meta.mime, upsert: false });
    if (loiTai) continue;

    const { data } = await supabase
      .from('evidence')
      .insert({
        item_result_id: resultId,
        loai: it.meta.loai,
        storage_path: path,
        sha256: it.sha256,
        size_bytes: it.meta.size_bytes,
        mime: it.meta.mime,
        width: it.meta.width,
        height: it.meta.height,
        duration_seconds: it.meta.duration_seconds,
        taken_at: it.meta.taken_at,
        lat: it.meta.lat,
        lng: it.meta.lng,
      })
      .select('id')
      .single();
    if (!data) continue;
    previews.set(data.id, it.url);
    const them: EvidenceMeta = { ...it.meta, id: data.id, storage_path: path };
    mutate(id, (i) => {
      const k = resultKey(code, viTri);
      const cu = i.results[k] ?? blankResult(code, viTri);
      return { ...i, results: { ...i.results, [k]: { ...cu, evidence: [...cu.evidence, them] } } };
    });
  }
}

export async function removeEvidence(
  id: string,
  code: string,
  viTri: number | null,
  evId: string,
) {
  const insp = inspectionById(id);
  const cu = insp ? getResult(insp, code, viTri) : null;
  const ev = cu?.evidence.find((e) => e.id === evId);
  if (!ev) return;

  await supabase.from('evidence').delete().eq('id', evId);
  await supabase.storage.from(BUCKET).remove([ev.storage_path]);
  previews.delete(evId);
  mutate(id, (i) => {
    const k = resultKey(code, viTri);
    const r = i.results[k];
    if (!r) return i;
    return {
      ...i,
      results: { ...i.results, [k]: { ...r, evidence: r.evidence.filter((e) => e.id !== evId) } },
    };
  });
}

// ----------------------------------------------------------------- nộp

/**
 * Kỹ sư chỉ nộp, không tự phát hành: RLS chặn SE ghi ket_luan và ngay_phat_hanh,
 * việc kết luận và chuyển sang 'issued' là của admin.
 */
export async function submitInspection(id: string) {
  mutate(id, (i) => ({ ...i, status: 'submitted' }));
  await supabase.from('inspections').update({ status: 'submitted' }).eq('id', id);
}

/** Bấm Báo cáo thay vì Nộp: một biên bản một báo cáo, bấm lại là ghi đè. */
export async function saveReport(id: string, noi_dung: ReportKind, ly_do: string) {
  const { error } = await supabase
    .from('inspection_reports')
    .upsert({ inspection_id: id, noi_dung, ly_do }, { onConflict: 'inspection_id' });
  if (error) return 'Không lưu được báo cáo: ' + error.message;
  mutate(id, (i) => ({ ...i, bao_cao: { noi_dung, ly_do } }));
  return null;
}

/**
 * Xoá biên bản nháp và dọn luôn tệp trong bucket. Cascade của Postgres chỉ dọn
 * hàng DB, tệp trong Storage không có ràng buộc nào nên phải xoá tay - bỏ sót
 * là bucket giữ rác vĩnh viễn.
 */
export async function deleteInspection(id: string) {
  const insp = inspectionById(id);
  if (insp) {
    const paths = Object.values(insp.results)
      .flatMap((r) => r.evidence)
      .map((e) => e.storage_path)
      .filter(Boolean);
    // remove() nhận cả mảng, một request cho mọi tệp.
    if (paths.length) {
      const { error } = await supabase.storage.from(BUCKET).remove(paths);
      if (error) return 'Không xoá được tệp bằng chứng: ' + error.message;
    }
    for (const r of Object.values(insp.results))
      for (const e of r.evidence) previews.delete(e.id);
  }

  // RLS từ chối thì PostgREST vẫn trả 204, phải đếm hàng xoá được mới biết.
  const { data, error } = await supabase.from('inspections').delete().eq('id', id).select('id');
  if (error) return 'Không xoá được biên bản: ' + error.message;
  if (!data?.length) return 'Không có quyền xoá biên bản này.';
  db = { ...db, inspections: db.inspections.filter((i) => i.id !== id) };
  emit();
  return null;
}

// --------------------------------------------------------------- kiểm tra

/** Mọi ô kết quả cần điền cho một biên bản, tính cả nhân theo Tủ. */
export function allCells(insp: Inspection) {
  const out: { code: string; viTri: number | null }[] = [];
  for (const item of CHECKLIST) {
    if (item.perCabinet) {
      for (const c of insp.cabinets) out.push({ code: item.code, viTri: c.vi_tri });
    } else {
      out.push({ code: item.code, viTri: null });
    }
  }
  return out;
}

export interface Blocker {
  buoc: number;
  text: string;
}

/** Điều kiện chặn nộp biên bản. */
export function blockers(insp: Inspection): Blocker[] {
  const out: Blocker[] = [];

  // Nhà thầu giờ ghi ở hàng đối chiếu bước 1, không còn ô riêng.
  if (!insp.nguoi_lap_ho_so.trim() || !insp.nha_thau_phone.trim())
    out.push({ buoc: 3, text: 'Thiếu người lập hồ sơ hoặc số điện thoại' });

  const thieuSn = insp.cabinets.filter((c) => !c.sn.trim()).length;
  if (thieuSn) out.push({ buoc: 2, text: thieuSn + ' Tủ chưa có SN' });

  if (!insp.den_thoi_gian) out.push({ buoc: 3, text: 'Chưa có thời gian kết thúc' });

  const chuaXong = allCells(insp).filter(({ code, viTri }) => {
    const item = CHECKLIST.find((i) => i.code === code);
    if (!item?.required) return false;
    return !getResult(insp, code, viTri).ket_qua;
  });
  if (chuaXong.length)
    out.push({ buoc: 4, text: chuaXong.length + ' hạng mục bắt buộc chưa có kết quả' });

  return out;
}

/** Cảnh báo: nhắc nhưng không chặn nộp. */
export function warnings(insp: Inspection): string[] {
  const out: string[] = [];
  for (const { code, viTri } of allCells(insp)) {
    const item = CHECKLIST.find((i) => i.code === code)!;
    const r = getResult(insp, code, viTri);
    if (!r.ket_qua || r.ket_qua === 'na') continue;
    const anh = r.evidence.filter((e) => e.loai === 'anh').length;
    if (anh < item.minPhotos) {
      const nhan = viTri ? code + ' · Tủ ' + viTri : code;
      out.push(nhan + ': có ' + anh + '/' + item.minPhotos + ' ảnh theo quy cách');
    }
  }
  const chuaKhop = RECONCILE_FIELDS.filter((f) => !insp.doi_chieu[f.key].khop);
  if (chuaKhop.length)
    out.push('Mục 1: ' + chuaKhop.length + '/' + RECONCILE_FIELDS.length + ' hàng đối chiếu chưa tick Khớp');
  return out;
}

export function progress(insp: Inspection) {
  const cells = allCells(insp);
  const done = cells.filter(({ code, viTri }) => getResult(insp, code, viTri).ket_qua).length;
  return { done, total: cells.length };
}

export const VERDICT_TONE: Record<InspectionVerdict, 'ok' | 'bad' | 'na'> = {
  dat: 'ok',
  khong_dat: 'bad',
  khong_du_dieu_kien: 'na',
  sai_thong_tin: 'na',
  khac: 'na',
};
