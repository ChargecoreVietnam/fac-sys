/**
 * Phụ lục 01 - Checklist nghiệm thu và yêu cầu bằng chứng.
 * Nguồn: Hợp đồng V-Green <-> CCVN (CCVN = Bên B, đơn vị nghiệm thu).
 *
 * File này là nguồn duy nhất định nghĩa 29 Mã hạng mục dùng cho BM03 (Phụ lục 04).
 * Sửa quy cách bằng chứng ở đây, không rải rác trong giao diện.
 */

/** Video tối đa 60 giây (Phụ lục 01 mục A); một số hạng mục siết còn 30 giây. */
export const MAX_VIDEO_SECONDS = 60;

/** Ảnh màu độ phân giải tối thiểu 1920x1080 (Phụ lục 01 mục A). */
export const MIN_PHOTO_WIDTH = 1920;
export const MIN_PHOTO_HEIGHT = 1080;

export type GroupKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

/** Nhãn nhóm theo BM03 mục 3. */
export const GROUPS: { key: GroupKey; label: string }[] = [
  { key: 'A', label: 'Xây dựng và mặt bằng' },
  { key: 'B', label: 'Tủ đổi pin (từng SN)' },
  { key: 'C', label: 'Điện và tiếp địa' },
  { key: 'D', label: 'Mạng và camera' },
  { key: 'E', label: 'PCCC' },
  { key: 'F', label: 'Biển nhận diện' },
  { key: 'G', label: 'Vệ sinh, hoàn trả' },
  { key: 'H', label: 'Hồ sơ, an toàn' },
];

export type ItemVerdict = 'dat' | 'khong_dat' | 'na';

export const ITEM_VERDICT_LABEL: Record<ItemVerdict, string> = {
  dat: 'Đạt',
  khong_dat: 'Không đạt',
  na: 'N/A',
};

/** BM03 mục 4 - bốn kết luận loại trừ nhau, mỗi kết luận tính 01 Lượt nghiệm thu. */
export type InspectionVerdict =
  | 'dat'
  | 'khong_dat'
  | 'khong_du_dieu_kien'
  | 'sai_thong_tin'
  | 'khac';

export const INSPECTION_VERDICT_LABEL: Record<InspectionVerdict, string> = {
  dat: 'ĐẠT - đủ điều kiện đưa vào vận hành',
  khong_dat: 'KHÔNG ĐẠT - tồn tại tại Mục 3, Nhà thầu khắc phục và nộp RFA lại',
  khong_du_dieu_kien: 'KHÔNG ĐỦ ĐIỀU KIỆN NGHIỆM THU',
  sai_thong_tin: 'ĐỊA CHỈ KHÔNG CHÍNH XÁC',
  khac: 'KHÁC',
};

export interface MeasurementSpec {
  /** Nhãn cho từng dòng đo, ví dụ "điểm đo" hoặc "mạch đo". */
  label: string;
  unit: string;
}

export interface ChecklistItem {
  code: string;
  group: GroupKey;
  /** Cột "Hạng mục" của Phụ lục 01. */
  title: string;
  /** Cột "Tiêu chí đạt". */
  criteria: string;
  /** Cột "Bằng chứng (BM02)" - hiển thị để nhắc người nghiệm thu. */
  evidence: string;
  /** Hạng mục đánh dấu (*) là bắt buộc để đạt. */
  required: boolean;
  /** Hạng mục "nếu có" - được phép chọn N/A. */
  allowNA: boolean;
  /** B1-B5 lặp lại cho từng Tủ theo SN. */
  perCabinet: boolean;
  /** Số ảnh tối thiểu theo BM02 Phần 3 (dùng để cảnh báo, không chặn). */
  minPhotos: number;
  /** Hạng mục mà Phụ lục 01 yêu cầu video (ở đây video là tùy chọn). */
  suggestVideo: boolean;
  /** Giới hạn cứng thời lượng video của hạng mục này. */
  maxVideoSeconds: number;
  /** C5, C6 có nhiều điểm/mạch đo -> lưu thành nhiều dòng giá trị. */
  measurement?: MeasurementSpec;
}

export const CHECKLIST: ChecklistItem[] = [
  // ---------------------------------------------------------------- A
  {
    code: 'A1',
    group: 'A',
    title: 'Toàn cảnh Trạm và vị trí lắp đặt',
    criteria:
      'Đúng vị trí, số cụm Tủ và bố trí theo thiết kế; lối tiếp cận thông thoáng',
    evidence:
      '02 ảnh toàn cảnh từ 2 góc khác nhau, thấy toàn bộ Tủ, tủ điện và khu vực xung quanh; ' +
      'thêm 01 ảnh lối ra vào, 01 ảnh bên trái Trạm, 01 ảnh bên phải Trạm',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 5,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'A2',
    group: 'A',
    title: 'Bệ móng / nền đặt Tủ và tủ điện',
    criteria:
      'Đúng kích thước thiết kế; bề mặt phẳng, không rỗ, nứt, nghiêng; chắc chắn',
    evidence:
      '01 ảnh toàn cảnh mỗi bệ + 01 ảnh cận cảnh bề mặt/chân Tủ; ảnh bổ sung tại vị trí bất thường (nếu có)',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 2,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'A3',
    group: 'A',
    title: 'Sơn nền, sơn tường, kẻ vạch (nếu có)',
    criteria: 'Đúng màu, sắc nét, không bong tróc, đúng thiết kế',
    evidence: '01 ảnh toàn cảnh + 01 ảnh cận cảnh bề mặt sơn',
    required: true,
    allowNA: true,
    perCabinet: false,
    minPhotos: 2,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },

  // ---------------------------------------------------------------- B
  {
    code: 'B1',
    group: 'B',
    title: 'Nhận dạng Tủ',
    criteria: 'SN trên tem Tủ trùng SN trong BM01 và BM02',
    evidence: '01 ảnh mặt trước Tủ + 01 ảnh cận cảnh tem SN/QR đọc rõ',
    required: true,
    allowNA: false,
    perCabinet: true,
    minPhotos: 2,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'B2',
    group: 'B',
    title: 'Cố định và nối đất Tủ',
    criteria:
      'Đủ bu lông/vít nở, đệm phẳng, đệm vênh, ê-cu có nắp chụp; Tủ không nghiêng, móp méo, trầy xước; có dây nối đất vào điểm tiếp địa',
    evidence: '02 ảnh cận cảnh chân đế/bu lông + 01 ảnh điểm nối đất tại Tủ',
    required: true,
    allowNA: false,
    perCabinet: true,
    minPhotos: 3,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'B3',
    group: 'B',
    title: 'Khởi động và màn hình',
    criteria:
      'Tủ khởi động bình thường; màn hình hiển thị SN và phiên bản FW; không có cảnh báo nghiêm trọng; cảm ứng/phím hoạt động',
    evidence:
      '01 ảnh màn hình sau khởi động thấy SN + FW + trạng thái; 01 video <=30s thao tác màn hình',
    required: true,
    allowNA: false,
    perCabinet: true,
    minPhotos: 1,
    suggestVideo: true,
    maxVideoSeconds: 30,
  },
  {
    code: 'B4',
    group: 'B',
    title: 'Khoang pin và khóa',
    criteria:
      'Toàn bộ khoang đóng/mở, khóa bình thường; không kẹt; đèn khoang hoạt động',
    evidence:
      '01 ảnh Tủ khi mở khoang + 01 video <=30s mở/đóng lần lượt các khoang',
    required: true,
    allowNA: false,
    perCabinet: true,
    minPhotos: 1,
    suggestVideo: true,
    maxVideoSeconds: 30,
  },
  {
    code: 'B5',
    group: 'B',
    title: 'Kết nối và cấu hình',
    criteria:
      'Tủ online ổn định; đúng cấu hình Trạm; truyền dữ liệu; thực hiện được giao dịch đổi pin thử',
    evidence:
      'Ảnh chụp màn hình trạng thái online trên ứng dụng Nhà thầu (nếu có); bằng chứng giao dịch đổi pin thử',
    required: true,
    allowNA: false,
    perCabinet: true,
    minPhotos: 1,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },

  // ---------------------------------------------------------------- C
  {
    code: 'C1',
    group: 'C',
    title: 'Tủ điện cấp nguồn',
    criteria:
      'Cố định chắc chắn, không nghiêng/móp/gỉ; thiết bị đóng cắt đúng thiết kế, có nhãn; bịt kín lỗ luồn cáp; có nối đất',
    evidence:
      '01 ảnh tủ điện đóng cửa + 01 ảnh toàn bộ bên trong + ảnh cận cảnh nhãn thiết bị, điểm tiếp địa, vị trí bịt kín',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 3,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'C2',
    group: 'C',
    title: 'Cáp nguồn từ tủ điện đến Tủ',
    criteria:
      'Đúng chủng loại/tiết diện thiết kế; đi trong máng cáp hoặc ống HDPE; đầu cốt ép, ống co nhiệt, tem nhãn đầy đủ',
    evidence:
      '01 ảnh toàn tuyến cáp + ảnh cận cảnh hai đầu đấu nối (đầu cốt, co nhiệt, tem) + ảnh ký hiệu in trên vỏ cáp',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 4,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'C3',
    group: 'C',
    title: 'Hệ thống tiếp địa',
    criteria:
      'Dây tiếp địa đúng chủng loại; nối liên tục từ cọc/hệ thống tiếp địa đến tủ điện và từng Tủ; đầu cos, tem đầy đủ',
    evidence:
      '01 ảnh điểm nối vào cọc/hệ thống tiếp địa + ảnh điểm nối tại tủ điện và tại từng Tủ',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 3,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'C4',
    group: 'C',
    title: 'Máng cáp, ống bảo vệ (nếu có)',
    criteria:
      'Lắp đúng thiết kế, cố định chắc, có nối đất máng; dây gọn gàng, tách nguồn/tín hiệu',
    evidence:
      '01 ảnh toàn tuyến + ảnh cận cảnh mối nối, điểm cố định, nối đất máng',
    required: true,
    allowNA: true,
    perCabinet: false,
    minPhotos: 2,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'C5',
    group: 'C',
    title: 'Đo điện áp đầu vào',
    criteria:
      '220V +/-5% (L-N) tại tủ điện và tại đầu vào Tủ; đủ pha theo thiết kế',
    evidence:
      'Ảnh đồng hồ đo và điểm đo trong cùng khung hình, đọc rõ giá trị, cho từng điểm đo',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 1,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
    measurement: { label: 'Điểm đo', unit: 'V' },
  },
  {
    code: 'C6',
    group: 'C',
    title: 'Đo điện trở cách điện',
    criteria:
      'Theo tiêu chí đo kiểm của Bên A (thiết bị 500 VDC, tách thiết bị điện tử/SPD trước khi đo)',
    evidence: 'Ảnh thiết bị đo, kẹp đo và màn hình kết quả cho từng mạch đo',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 1,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
    measurement: { label: 'Mạch đo', unit: 'MΩ' },
  },
  {
    code: 'C7',
    group: 'C',
    title: 'Thử tác động RCBO/RCD',
    criteria: 'Thiết bị bảo vệ tác động đúng khi thử',
    evidence:
      'Ảnh nhãn RCBO đọc rõ thông số + video <=30s thao tác nút test và trạng thái sau thử',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 1,
    suggestVideo: true,
    maxVideoSeconds: 30,
  },
  {
    code: 'C8',
    group: 'C',
    title: 'Sơ đồ nguyên lý và hotline',
    criteria:
      'Sơ đồ nguyên lý tủ điện dán trong tủ; tem hotline bảo hành Nhà thầu dán ngoài tủ điện',
    evidence:
      '01 ảnh sơ đồ tại vị trí dán, đọc được nội dung + 01 ảnh tem hotline',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 2,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },

  // ---------------------------------------------------------------- D
  {
    code: 'D1',
    group: 'D',
    title: 'Thiết bị mạng (router/switch/SIM)',
    criteria:
      'Đúng chủng loại, SN theo thiết kế; lắp đặt chắc chắn; đèn trạng thái hoạt động',
    evidence: '01 ảnh mặt trước thiết bị đang hoạt động + 01 ảnh tem model/SN',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 2,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'D2',
    group: 'D',
    title: 'Camera (nếu có)',
    criteria:
      'Đúng chủng loại, vị trí, hướng quan sát thấy toàn bộ Tủ; cố định chắc chắn',
    evidence:
      '01 ảnh toàn cảnh vị trí/hướng camera + 01 ảnh tem model/SN cho từng camera',
    required: true,
    allowNA: true,
    perCabinet: false,
    minPhotos: 2,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'D3',
    group: 'D',
    title: 'Đầu ghi/đường truyền camera (nếu có)',
    criteria:
      'NVR nhận đủ kênh, đủ dung lượng; hình ảnh về trung tâm rõ nét, ổn định',
    evidence:
      'Ảnh mặt trước NVR + ảnh chụp màn hình hình ảnh camera tại trung tâm có Mã Trạm và thời gian',
    required: true,
    allowNA: true,
    perCabinet: false,
    minPhotos: 2,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },

  // ---------------------------------------------------------------- E
  {
    code: 'E1',
    group: 'E',
    title: 'Bình chữa cháy',
    criteria:
      'Đúng chủng loại, đủ số lượng theo thiết kế; tem kiểm định còn hạn; đặt trên kệ/tủ đúng vị trí',
    evidence:
      '01 ảnh toàn cảnh vị trí đặt + 01 ảnh cận cảnh tem kiểm định/hạn sử dụng từng bình',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 2,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'E2',
    group: 'E',
    title: 'Tiêu lệnh, nội quy PCCC',
    criteria: 'Lắp đầy đủ, ngay ngắn, đúng vị trí, đọc rõ',
    evidence: '01 ảnh toàn cảnh vị trí treo + 01 ảnh chính diện',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 2,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },

  // ---------------------------------------------------------------- F
  {
    code: 'F1',
    group: 'F',
    title: 'Biển vẫy, biển thả trần, decal (nếu có)',
    criteria:
      'Đúng vị trí, không nghiêng/cong vênh, đúng màu sắc, nội dung theo thiết kế',
    evidence: '01 ảnh toàn cảnh thể hiện vị trí + 01 ảnh chính diện từng biển',
    required: true,
    allowNA: true,
    perCabinet: false,
    minPhotos: 2,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },

  // ---------------------------------------------------------------- G
  {
    code: 'G1',
    group: 'G',
    title: 'Vệ sinh khu vực',
    criteria: 'Sạch sẽ, không còn vật tư thừa, rác, bao bì',
    evidence: '02 ảnh toàn cảnh từ 2 góc sau khi vệ sinh (cùng góc với A1)',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 2,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'G2',
    group: 'G',
    title: 'Hoàn trả mặt bằng (nếu có yêu cầu)',
    criteria: 'Hoàn trả như hiện trạng ban đầu; có xác nhận của chủ mặt bằng',
    evidence:
      'Ảnh trước-sau cùng góc chụp + ảnh biên bản xác nhận của chủ mặt bằng',
    required: true,
    allowNA: true,
    perCabinet: false,
    minPhotos: 3,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },

  // ---------------------------------------------------------------- H
  {
    code: 'H1',
    group: 'H',
    title: 'Nguồn điện hợp pháp',
    criteria:
      'Có hợp đồng mua điện/thỏa thuận cấp điện hoặc xác nhận của chủ mặt bằng',
    evidence: 'Ảnh/bản scan hợp đồng hoặc văn bản xác nhận',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 1,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'H2',
    group: 'H',
    title: 'Checklist tự kiểm của Nhà thầu',
    criteria:
      'BM02 điền đầy đủ, người có thẩm quyền của Nhà thầu xác nhận trên Nền tảng',
    evidence: 'BM02 hoàn chỉnh trên CCTS',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 0,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'H3',
    group: 'H',
    title: 'An toàn tổng thể',
    criteria:
      'Không có nguy cơ điện giật, cháy nổ, cạnh sắc, ngập nước, vật cản ảnh hưởng vận hành',
    evidence: 'Xác nhận trong BM02; ảnh cận cảnh nếu có điểm cần lưu ý',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 0,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'H4',
    group: 'H',
    title: 'Hướng dẫn bàn giao chủ cơ sở',
    criteria: 'Chủ cơ sở ký xác nhận, biên bản có chữ ký hai bên',
    evidence: '01 ảnh chụp biên bản bàn giao',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 1,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
  {
    code: 'H5',
    group: 'H',
    title: 'Biên bản chốt số điện cơ sở',
    criteria: 'Ghi số điện sử dụng tại thời điểm bàn giao',
    evidence: '01 ảnh chụp rõ số điện trên công tơ',
    required: true,
    allowNA: false,
    perCabinet: false,
    minPhotos: 1,
    suggestVideo: false,
    maxVideoSeconds: MAX_VIDEO_SECONDS,
  },
];

export const CHECKLIST_BY_CODE: Record<string, ChecklistItem> = Object.fromEntries(
  CHECKLIST.map((i) => [i.code, i]),
);

export const itemsInGroup = (g: GroupKey) =>
  CHECKLIST.filter((i) => i.group === g);

/** BM03 mục 1 - bảng đối chiếu thông tin Trạm. */
export const RECONCILE_FIELDS = [
  { key: 'ma_tram', label: 'Mã Trạm', required: true },
  { key: 'ten_tram', label: 'Tên Trạm', required: false },
  { key: 'dia_chi', label: 'Địa chỉ', required: true },
  { key: 'toa_do', label: 'Tọa độ', required: true },
  { key: 'thiet_ke_dien_hinh', label: 'Thiết kế điển hình', required: false },
  { key: 'nha_thau', label: 'Nhà thầu', required: true },
] as const;

export type ReconcileFieldKey = (typeof RECONCILE_FIELDS)[number]['key'];

/**
 * 34 tỉnh/thành sau sáp nhập 01/07/2025: 6 thành phố trực thuộc trung ương rồi
 * 28 tỉnh. Lưu nguyên chuỗi vào stations.tinh_tp - cột text, không phải enum,
 * để đổi được khi đơn vị hành chính thay đổi tiếp.
 */
export const TINH_TP = [
  'Thành phố Hà Nội',
  'Thành phố Hải Phòng',
  'Thành phố Huế',
  'Thành phố Đà Nẵng',
  'Thành phố Hồ Chí Minh',
  'Thành phố Cần Thơ',
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Tĩnh',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long',
] as const;
