/**
 * Kiểu dữ liệu dùng chung cho giao diện.
 *
 * Đặt tên trùng với cột Postgres trong SPEC.md mục 4.
 */
import type { ItemVerdict, InspectionVerdict, ReconcileFieldKey } from './checklist';

export interface Profile {
  id: string;
  ho_ten: string;
  chuc_vu: string;
  role: 'se' | 'admin';
}

/** Trạm lấy từ BM01 của Bên A. Kỹ sư chỉ đọc. */
export interface Station {
  id: string;
  ma_tram: string;
  ten_tram: string;
  dia_chi: string;
  xa_phuong: string;
  tinh_tp: string;
  lat: number;
  lng: number;
  thiet_ke_dien_hinh: string;
  so_tu: number;
  nha_thau: string;
  nha_thau_phone: string;
}

/** Tủ mà BM01 khai báo. */
export interface StationCabinet {
  id: string;
  station_id: string;
  vi_tri: number;
  sn: string;
}

export interface DoiChieuRow {
  bm01: string;
  bm02: string;
  khop: boolean;
  ghi_chu: string;
}

export type DoiChieu = Record<ReconcileFieldKey, DoiChieuRow>;

/** BM02 Phần 2 - tình trạng Tủ tại thời điểm nộp, không phải thuộc tính của Tủ. */
export interface InspectionCabinet {
  id: string;
  /** null = SN kỹ sư đọc được không có trong BM01. */
  cabinet_id: string | null;
  vi_tri: number;
  sn: string;
  loai_tu: 6 | 12 | null;
  fw_version: string;
  /** Trạng thái tại thời điểm nghiệm thu. */
  co_dien: boolean;
  online: boolean;
}

export interface GiaTriDo {
  diem: string;
  gia_tri: number | null;
  don_vi: string;
}

export interface EvidenceMeta {
  id: string;
  /** Đường dẫn trong bucket evidence, rỗng khi tệp mới chọn chưa tải lên. */
  storage_path: string;
  loai: 'anh' | 'video' | 'tai_lieu';
  ten_tep: string;
  size_bytes: number;
  mime: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  taken_at: string | null;
  lat: number | null;
  lng: number | null;
}

export interface ItemResult {
  /** id hàng item_results, có sau lần ghi đầu tiên. */
  id?: string;
  code: string;
  /** Vị trí Tủ với hạng mục lặp theo Tủ, null với hạng mục chung. */
  vi_tri: number | null;
  ket_qua: ItemVerdict | null;
  ghi_chu: string;
  gia_tri_do: GiaTriDo[];
  evidence: EvidenceMeta[];
}

/** Nội dung báo cáo khi kỹ sư không nghiệm thu được. */
export type ReportKind = 'khong_du_dieu_kien' | 'sai_thong_tin' | 'khac';

export interface InspectionReport {
  noi_dung: ReportKind;
  ly_do: string;
}

export interface Inspection {
  id: string;
  /** Ba trường dưới do admin gán khi duyệt; biểu mẫu không đọc Trạm nên để trống. */
  station_id: string | null;
  inspector_id: string;
  luot_thu: number | null;
  so_bien_ban: string | null;
  status: 'draft' | 'submitted' | 'issued';

  doi_chieu: DoiChieu;

  nha_thau: string;
  nguoi_lap_ho_so: string;
  nha_thau_phone: string;

  nguoi_nghiem_thu_ten: string;
  nguoi_nghiem_thu_chuc_vu: string;
  tu_thoi_gian: string;
  den_thoi_gian: string;

  /** Hai cột dưới do admin ghi khi duyệt, kỹ sư không sửa được (RLS). */
  ket_luan: InspectionVerdict | null;
  ket_luan_ghi_chu: string;
  yeu_cau_khac_phuc: string;
  ngay_phat_hanh: string | null;

  /** Báo cáo hiện trường của kỹ sư, hàng trong inspection_reports. */
  bao_cao: InspectionReport | null;
  created_at: string;

  /** Trong Postgres là hai bảng riêng; store gộp lại cho giao diện đọc gọn. */
  cabinets: InspectionCabinet[];
  results: Record<string, ItemResult>;
}

/** Khoá của một ô kết quả: "C5" hoặc "B1#2" (hạng mục B1, Tủ vị trí 2). */
export const resultKey = (code: string, viTri: number | null) =>
  viTri == null ? code : `${code}#${viTri}`;
