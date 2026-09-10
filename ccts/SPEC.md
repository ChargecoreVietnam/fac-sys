# CCTS — Ứng dụng nghiệm thu Trạm đổi pin

**Bản giao cho dev.** Thiết kế đã chốt; phần còn lại là dựng.

Sơ đồ CSDL có kiểu và giải thích lý do thiết kế:
<https://claude.ai/code/artifact/00614cea-f982-41f5-a716-a118108d572e>

---

## 1. Bối cảnh

Hợp đồng V-Green (Bên A) ↔ ChargeCore Việt Nam / CCVN (Bên B).
**Chúng ta là Bên B — đơn vị đi nghiệm thu.**

Ba biểu mẫu trong hợp đồng:

| Mẫu | Của ai | Trong dự án này |
|---|---|---|
| BM01 — Danh sách Trạm | Bên A gửi sang | Dữ liệu đầu vào, admin nạp, chỉ đọc |
| BM02 — Hồ sơ nghiệm thu | Nhà thầu tự kiểm | **Ứng dụng này thay thế.** Kỹ sư CCVN nhập trực tiếp |
| BM03 — Biên bản nghiệm thu | Bên B phát hành | **Đầu ra duy nhất** |

Vì CCVN vừa hướng dẫn vừa thẩm định, không cần bên thứ ba nộp BM02 rồi mới đối chiếu. Kỹ sư hiện trường ghi thẳng số liệu thực tế, và đó *là* BM02. Không dựng màn hình riêng cho BM02.

**Người dùng:** kỹ sư hiện trường (Site Engineer), dùng điện thoại, đứng tại Trạm. Mọi quyết định giao diện ưu tiên tình huống đó.

### Các điều khoản hợp đồng chi phối thiết kế

Dev không cần đọc hợp đồng, nhưng cần biết bốn điều này vì chúng là lý do tồn tại của nhiều ràng buộc:

- **Điều 1.4** — CCTS là *hệ thống ghi nhận gốc*. Bản ghi đã phát hành không được sửa. Đây là lý do dùng RLS chứ không kiểm tra ở tầng ứng dụng.
- **Điều 7** — mỗi Kết quả nghiệm thu = **01 Lượt** = 943.200 đ. `inspections.luot_thu` là đơn vị tính tiền.
- **Điều 7.3** — Tủ không có điện hoặc không online vẫn tính đủ 01 Lượt. Vì vậy `inspection_cabinets.online` là **căn cứ hoá đơn**, không phải ghi chú kỹ thuật.
- **Điều 8.5** — lưu bằng chứng 5 năm. Không có chức năng xoá cứng ở bất cứ đâu.

---

## 2. Tech stack

Đã cài sẵn trong `package.json`. **Không cài gì ở mức global** — mọi thứ nằm trong thư mục dự án.

| | |
|---|---|
| Framework | Next.js 16.3.4, App Router, `src/`, TypeScript |
| UI | Tailwind CSS 4 |
| CSDL / Auth / Storage | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) |
| Nén ảnh | `browser-image-compression` |
| Đọc EXIF/GPS | `exifr` |
| Node | 20+ |

```
ccts/
├── src/
│   ├── app/                 # route (App Router)
│   └── lib/
│       ├── checklist.ts     # ✅ đã có — nguồn duy nhất của 27 mã hạng mục
│       ├── supabase/        # ⬜ client trình duyệt + server
│       ├── storage.ts       # ⬜ lớp bọc lưu trữ (xem §6)
│       └── evidence.ts      # ⬜ nén, đọc EXIF, tính SHA-256
└── supabase/
    ├── schema.dbml          # ✅ đã có — dán vào dbdiagram.io
    └── schema.sql           # ⬜ DDL trong §4 dưới đây
```

### Biến môi trường

`.env.local` (không commit):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # chỉ dùng cho script nạp BM01, không đưa ra client
```

---

## 3. `checklist.ts` — đọc trước khi code

`src/lib/checklist.ts` đã viết xong và là **nguồn duy nhất** cho 27 Mã hạng mục. Giao diện đọc từ đây, không hard-code danh sách ở chỗ khác.

Mỗi `ChecklistItem` mang sẵn quy cách bằng chứng:

```ts
interface ChecklistItem {
  code: string;          // 'A1' … 'H3'
  group: GroupKey;       // 'A'…'H' — 8 nhóm của BM03 mục 3
  title: string;
  criteria: string;      // tiêu chí đạt, hiện cho kỹ sư đọc
  evidence: string;      // mô tả bằng chứng cần chụp
  required: boolean;     // hạng mục (*) bắt buộc để kết luận Đạt
  allowNA: boolean;      // có được tick N/A không
  perCabinet: boolean;   // true → nhân theo số Tủ (chỉ B1, B2)
  minPhotos: number;     // số ảnh tối thiểu — cảnh báo, KHÔNG chặn
  suggestVideo: boolean;
  maxVideoSeconds: number;
  measurement?: { label: string; unit: string };  // chỉ C5, C6
}
```

Hằng số kèm theo: `GPS_TOLERANCE_M = 50`, `MAX_VIDEO_SECONDS = 60`, `MIN_PHOTO_WIDTH = 1920`, `MIN_PHOTO_HEIGHT = 1080`, và `RECONCILE_FIELDS` (6 hàng của BM03 mục 1).

---

## 4. Cơ sở dữ liệu

Bảy bảng. Quy ước đặt tên: **có trên biểu mẫu giấy → tiếng Việt không dấu** (`ma_tram`, `ket_luan`, `nguoi_nghiem_thu_ten`); **hạ tầng → tiếng Anh** (`id`, `status`, `storage_path`, `created_at`).

```
stations ──┬─→ station_cabinets ┄┄┐
           │                      ┊ (cabinet_id, nullable)
           └─→ inspections ──┬───→ inspection_cabinets
                             │            ┊
profiles ────────────────────┘            ┊ (cabinet_id, nullable)
                             │            ┊
                             └───→ item_results ──→ evidence
```

### 4.1 DDL

Đặt vào `supabase/schema.sql`, chạy qua SQL Editor của Supabase.

```sql
-- ============================================================
-- CCTS · Nghiệm thu Trạm đổi pin · lược đồ BM03
-- PostgreSQL 15+ (bắt buộc, vì NULLS NOT DISTINCT)
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- profiles -----------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  ho_ten      text not null,
  chuc_vu     text not null,
  role        text not null default 'se' check (role in ('se','admin')),
  created_at  timestamptz not null default now()
);

-- ---------- stations (nạp từ BM01) ---------------------------
create table stations (
  id                  uuid primary key default gen_random_uuid(),
  ma_tram             text not null unique,
  ten_tram            text not null,
  dia_chi             text not null,
  xa_phuong           text,
  tinh_tp             text,
  lat                 double precision not null,
  lng                 double precision not null,
  thiet_ke_dien_hinh  text,
  so_tu               smallint not null check (so_tu between 1 and 6),
  nha_thau            text not null,
  nha_thau_phone      text not null,
  created_at          timestamptz not null default now()
);

create index stations_tinh_tp_idx on stations (tinh_tp);

-- ---------- station_cabinets (Tủ theo BM01) ------------------
create table station_cabinets (
  id          uuid primary key default gen_random_uuid(),
  station_id  uuid not null references stations(id) on delete cascade,
  vi_tri      smallint not null check (vi_tri between 1 and 6),
  sn          text not null,
  unique (station_id, vi_tri)
);

-- ---------- inspections (1 hàng = 1 BM03 = 1 Lượt) -----------
create table inspections (
  id                        uuid primary key default gen_random_uuid(),
  station_id                uuid not null references stations(id) on delete restrict,
  inspector_id              uuid not null references profiles(id) on delete restrict,

  luot_thu                  smallint not null default 1 check (luot_thu > 0),
  so_bien_ban               text not null unique,
  status                    text not null default 'draft'
                              check (status in ('draft','issued')),

  -- BM03 mục 1
  doi_chieu                 jsonb not null default '{}'::jsonb,

  -- BM02 Phần 1 — cả ba đều (*) trên biểu mẫu
  nha_thau                  text not null,
  nguoi_lap_ho_so           text not null,
  nha_thau_phone            text not null,

  -- BM03 mục 2
  nguoi_nghiem_thu_ten      text not null,
  nguoi_nghiem_thu_chuc_vu  text not null,
  tu_thoi_gian              timestamptz not null,
  den_thoi_gian             timestamptz not null,

  -- BM03 mục 4 và 5
  ket_luan                  text check (ket_luan in
                              ('dat','khong_dat','khong_du_dieu_kien','sai_thong_tin')),
  ket_luan_ghi_chu          text,
  yeu_cau_khac_phuc         text,

  ngay_phat_hanh            timestamptz,
  created_at                timestamptz not null default now(),

  unique (station_id, luot_thu),
  constraint inspections_thoi_gian_hop_le check (den_thoi_gian >= tu_thoi_gian),
  constraint inspections_issued_co_ket_luan
    check (status = 'draft' or ket_luan is not null),
  constraint inspections_issued_co_ngay
    check (status = 'draft' or ngay_phat_hanh is not null)
);

create index inspections_station_idx on inspections (station_id, luot_thu desc);
create index inspections_status_idx  on inspections (status, ngay_phat_hanh desc);
create index inspections_nha_thau_idx on inspections (nha_thau);

-- ---------- inspection_cabinets (BM02 Phần 2) ----------------
-- FW và trạng thái online là giá trị THỜI ĐIỂM, không phải
-- thuộc tính của Tủ → phải gắn với từng lượt nghiệm thu.
create table inspection_cabinets (
  id             uuid primary key default gen_random_uuid(),
  inspection_id  uuid not null references inspections(id) on delete cascade,
  cabinet_id     uuid references station_cabinets(id) on delete set null,
  vi_tri         smallint not null check (vi_tri between 1 and 6),
  sn             text not null,
  loai_tu        smallint check (loai_tu in (6, 12)),
  fw_version     text,
  online         boolean not null default false,
  unique (inspection_id, vi_tri)
);

create index inspection_cabinets_inspection_idx
  on inspection_cabinets (inspection_id);

-- ---------- item_results (BM03 mục 3) ------------------------
create table item_results (
  id             uuid primary key default gen_random_uuid(),
  inspection_id  uuid not null references inspections(id) on delete cascade,
  code           text not null,
  cabinet_id     uuid references inspection_cabinets(id) on delete cascade,
  ket_qua        text not null check (ket_qua in ('dat','khong_dat','na')),
  ghi_chu        text,
  gia_tri_do     jsonb,
  created_at     timestamptz not null default now(),

  -- BẮT BUỘC nulls not distinct: unique thường coi hai NULL là
  -- khác nhau, nên (inspection, 'A1', NULL) sẽ chèn được nhiều lần.
  unique nulls not distinct (inspection_id, code, cabinet_id)
);

create index item_results_inspection_idx on item_results (inspection_id);

-- ---------- evidence -----------------------------------------
create table evidence (
  id                uuid primary key default gen_random_uuid(),
  item_result_id    uuid not null references item_results(id) on delete cascade,
  loai              text not null check (loai in ('anh','video','tai_lieu')),
  storage_path      text not null unique,
  sha256            text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes        bigint not null check (size_bytes > 0),
  mime              text not null,
  width             integer,
  height            integer,
  duration_seconds  numeric(5,2),
  taken_at          timestamptz,
  lat               double precision,
  lng               double precision,
  created_at        timestamptz not null default now()
);

create index evidence_item_result_idx on evidence (item_result_id);
```

### 4.2 Hai cột jsonb

```ts
// inspections.doi_chieu — BM03 mục 1, sáu hàng, khoá cố định
type DoiChieuKey =
  | 'ma_ten_tram' | 'dia_chi' | 'toa_do'
  | 'thiet_ke_dien_hinh' | 'so_tu_sn' | 'nha_thau';

interface DoiChieuRow {
  bm01:    string;   // chép từ stations lúc mở biên bản
  bm02:    string;   // giá trị kỹ sư ghi nhận tại Trạm
  khop:    boolean;  // ô tick "Khớp"
  ghi_chu: string;
}

type DoiChieu = Record<DoiChieuKey, DoiChieuRow>;

// item_results.gia_tri_do — MẢNG, vì C5/C6 đo nhiều điểm
interface GiaTriDo {
  diem:    string;      // "L-N tủ điện", "mạch L1-PE"…
  gia_tri: number;
  don_vi:  'V' | 'MΩ';
}
```

`doi_chieu[k].bm01` được **chép vào** jsonb, không tham chiếu sang `stations`. Nếu Bên A sửa BM01 sau khi biên bản đã ký, bản in cũ vẫn phải hiện đúng thứ đã ký (Điều 1.4). Cùng lý do với `nguoi_nghiem_thu_ten` — chép từ `profiles` lúc lưu, không join khi in.

Hàng `nha_thau` của `doi_chieu`: phía `bm02` ghép từ ba cột thật khi lưu, dạng
`"{nha_thau} / {nguoi_lap_ho_so} – {nha_thau_phone}"`.

### 4.3 Vài điểm dễ sai

- **`unique nulls not distinct`** — bỏ sót thì có kết quả trùng lặp ở cả 25 mã không theo Tủ, và **không có lỗi nào báo ra**.
- **`duration_seconds numeric(5,2)`, không phải float.** So sánh với mốc cứng 30 s / 60 s; ở float thì `30.000000001 > 30` sẽ loại nhầm video hợp lệ.
- **`size_bytes bigint`** — `int4` tràn ở 2,1 GB.
- **`online` default `false`, không phải NULL.** "Chưa biết" và "không online" dẫn tới cùng một hệ quả hợp đồng, nên bắt kỹ sư tick để xác nhận online.
- **`inspection_cabinets.cabinet_id` nullable** — kỹ sư có thể đọc được một SN không có trong BM01. Đó là `sai_thong_tin` (Điều 6d); lược đồ phải biểu diễn được sự lệch, không được ép khớp.
- **`item_results.cabinet_id` trỏ sang `inspection_cabinets`**, không phải `station_cabinets`. Kết quả B1 nói về cái Tủ *kỹ sư đã kiểm tra*.
- **`code` là `text` + check ở tầng ứng dụng, không phải enum Postgres.** Điều 15.5 cho phép sửa phụ lục; `alter type` trên bảng nhiều triệu hàng rất đau.
- **Không có `stations.status`.** Trạng thái Trạm suy ra từ lượt nghiệm thu gần nhất. Bản sao thứ hai của sự thật luôn là bản sai.
- **Không có `evidence.gps_distance_m`.** Khoảng cách suy ra từ `lat/lng` ở `evidence` và `stations`.

### 4.4 Sinh `luot_thu` và `so_bien_ban`

```sql
luot_thu = coalesce(max(luot_thu), 0) + 1
           from inspections where station_id = $1
```

Có tranh chấp khi hai kỹ sư mở cùng lúc — `unique (station_id, luot_thu)` sẽ chặn; bắt lỗi `23505` và thử lại. Đừng khoá bảng.

`so_bien_ban` đề xuất `CCVN-{ma_tram}-L{luot_thu}` — suy ra được, duy nhất, đọc được. **Cần Bên A xác nhận định dạng** (xem §9).

---

## 5. RLS

Bật RLS trên cả bảy bảng. **Tính bất biến phải nằm ở đây, không nằm trong React** — kiểm tra ở giao diện chặn được nhầm lẫn, không chặn được lệnh gọi API thẳng.

```sql
alter table profiles            enable row level security;
alter table stations            enable row level security;
alter table station_cabinets    enable row level security;
alter table inspections         enable row level security;
alter table inspection_cabinets enable row level security;
alter table item_results        enable row level security;
alter table evidence            enable row level security;

-- helper: biên bản còn nháp và thuộc về người đang đăng nhập
create or replace function is_draft_owner(insp uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from inspections i
    where i.id = insp
      and i.status = 'draft'
      and i.inspector_id = auth.uid()
  );
$$;
```

Quy tắc:

| Bảng | select | insert | update | delete |
|---|---|---|---|---|
| `profiles` | chính mình; admin xem tất cả | admin | admin | — |
| `stations`, `station_cabinets` | mọi tài khoản đã đăng nhập | admin | admin | admin |
| `inspections` | mọi tài khoản đã đăng nhập | `inspector_id = auth.uid()` | `status='draft'` **và** `inspector_id = auth.uid()` | — |
| 3 bảng con | như biên bản cha | `is_draft_owner(...)` | `is_draft_owner(...)` | `is_draft_owner(...)` |

Không có policy `delete` cho `inspections` — Điều 8.5 giữ 5 năm.

Chuyển `draft → issued` là hành động một chiều: sau khi `status='issued'`, chính policy `update` khoá luôn mọi thay đổi tiếp theo, kể cả việc đổi lại `status`. Đúng ý đồ.

**Đọc trước khi viết policy:** cột `status` nằm trong `USING` của policy update, nên biểu thức `WITH CHECK` cũng cần chặn `status` bị đổi ngược về `draft`. Cách gọn: cho phép update chỉ khi hàng *hiện tại* là draft, và thêm trigger `before update` từ chối mọi thay đổi khi `OLD.status = 'issued'`.

---

## 6. Lưu trữ tệp

Bucket Supabase Storage tên `evidence`, **private**. Đọc bằng signed URL, hạn ngắn.

```
evidence/{inspection_id}/{code}/{evidence_id}.{ext}
```

Không đưa `ma_tram` vào đường dẫn — mã có thể chứa ký tự lạ, và đường dẫn phải bất biến kể cả khi Bên A sửa BM01.

### Lớp bọc — `src/lib/storage.ts`

Toàn bộ dự án đi qua module này, không gọi thẳng `supabase.storage` ở chỗ khác:

```ts
export interface StorageAdapter {
  upload(path: string, file: Blob, mime: string): Promise<void>;
  signedUrl(path: string, expiresInSeconds: number): Promise<string>;
  remove(path: string): Promise<void>;
}
```

Lý do: video chiếm phần lớn dung lượng. Ước tính ~6.000 Trạm → ảnh đã nén ~150 GB, nhưng 7 video/Trạm × 30 MB ≈ **1.260 GB**. Nếu phí egress của Supabase thành vấn đề, chuyển sang Cloudflare R2 (egress 0 đ) chỉ là sửa một file.

### ⚠️ Nâng giới hạn kích thước tệp trước khi bật video

Supabase Storage mặc định chặn quanh **50 MB/tệp**. Ảnh nén còn ~500 KB nên không sao, nhưng video 1080p 30 giây chưa nén có thể vượt. Nâng hạn mức bucket **trước** khi bật quay video, nếu không kỹ sư gặp lỗi tải lên ngay tại hiện trường.

### Xử lý tệp phía client — `src/lib/evidence.ts`

Thứ tự bắt buộc:

1. Đọc EXIF bằng `exifr` **trước khi nén** → `taken_at`, `lat`, `lng`.
2. Nén bằng `browser-image-compression`, **chỉ thu nhỏ nếu lớn hơn 1920×1080, không bao giờ nhỏ hơn**. Phụ lục 01 mục A đòi "ảnh nguyên gốc, không chỉnh sửa, tối thiểu 1920×1080". Giữ EXIF (`preserveExif: true`).
3. Tính SHA-256 **trên bytes cuối cùng sẽ tải lên** (`crypto.subtle.digest`), không phải bytes gốc.
4. Upload.
5. **Chỉ chèn hàng `evidence` sau khi upload thành công.** Không có cột `upload_status` — hàng tồn tại nghĩa là tệp tồn tại.

Nếu upload lỗi: giữ tệp trong bộ nhớ, hiện nút thử lại. Ứng dụng **chỉ chạy online**, không làm offline-first ngày 1.

---

## 7. Màn hình

Toàn bộ thiết kế cho điện thoại. Nút bấm to, ít gõ phím, chụp ảnh bằng
`<input type="file" accept="image/*" capture="environment">`.

| Route | Nội dung |
|---|---|
| `/login` | Email + mật khẩu. Tài khoản do admin tạo sẵn, không có tự đăng ký |
| `/` | Danh sách Trạm. Tìm theo mã/tên/địa chỉ, lọc theo tỉnh |
| `/tram/[ma_tram]` | Chi tiết Trạm + lịch sử các lượt. Nút "Bắt đầu lượt mới" |
| `/bien-ban/[id]` | Biểu mẫu chính, 5 bước — xem dưới |
| `/bien-ban/[id]/xem` | BM03 chỉ đọc, bố cục như bản in |

### Biểu mẫu `/bien-ban/[id]`

**Bước 1 — Thông tin Trạm (BM03 mục 1).**
6 hàng từ `RECONCILE_FIELDS`. Mỗi hàng: cột BM01 điền sẵn từ `stations` (chỉ đọc), ô nhập cho giá trị kỹ sư ghi nhận, ô tick "Khớp", ô ghi chú.
Hàng `toa_do`: lấy GPS thiết bị, tính Haversine tới `stations.lat/lng`, tự tick "Khớp" nếu ≤ 50 m — vẫn cho kỹ sư sửa tay.
Cuối bước: `nha_thau`, `nguoi_lap_ho_so`, `nha_thau_phone` — cả ba bắt buộc.

**Bước 2 — Danh sách Tủ (BM02 Phần 2).**
Sinh sẵn `stations.so_tu` hàng, mỗi hàng: vị trí, SN (điền sẵn từ `station_cabinets`, sửa được), loại Tủ 6/12 ngăn, phiên bản FW, tick Online.
SN sửa khác BM01 → cảnh báo rõ ràng và để `cabinet_id = null`.

**Bước 3 — Người nghiệm thu (BM03 mục 2).**
Họ tên và chức vụ điền sẵn từ `profiles`, **vẫn sửa được** — kỹ sư có thể mượn máy đồng nghiệp. Chọn thời gian từ/đến.

**Bước 4 — Kết quả theo hạng mục (BM03 mục 3).**
Nhóm theo `GROUPS`. Mỗi mã: tick Đạt / Không đạt / N/A (chỉ hiện N/A khi `allowNA`), ô ghi chú, khu vực bằng chứng.
- `perCabinet: true` (B1, B2) → nhân thành N thẻ theo số Tủ ở bước 2.
- `measurement` (C5, C6) → bảng nhập nhiều dòng `GiaTriDo`. **C5 cảnh báo nếu giá trị ngoài 209–231 V** (tiêu chí "220V ±5%").
- Hiện `criteria` và `evidence` cho kỹ sư đọc tại chỗ.
- `minPhotos` là **cảnh báo, không chặn**. Video **chặn cứng** theo `maxVideoSeconds`.

**Bước 5 — Kết luận (BM03 mục 4 và 5).**
4 lựa chọn loại trừ nhau từ `INSPECTION_VERDICT_LABEL`. Chọn `khong_du_dieu_kien` hoặc `sai_thong_tin` → mở ô `ket_luan_ghi_chu`. Chọn `khong_dat` → mở ô `yeu_cau_khac_phuc` (mục 5, một dòng chữ tự do, không phải bảng).

Chặn phát hành khi: còn mã `required` chưa có kết quả; hoặc chọn `dat` mà vẫn còn mã `required` bị `khong_dat`.

Nút **Phát hành**: hộp thoại xác nhận nêu rõ *không sửa được sau khi phát hành và tính 01 Lượt theo Điều 7*, rồi đặt `status='issued'`, `ngay_phat_hanh=now()`.

---

## 8. Ngoài phạm vi ngày 1

Cố ý cắt, đừng làm:

- Xuất PDF — BM03 xem trên web là đủ; in bằng `Ctrl+P` với `@media print`
- Offline-first / service worker
- Tài khoản cho Nhà thầu
- Đồng bộ sang CMS của Bên A
- Bất kỳ màn hình BM02 riêng nào
- Chữ ký số — mục 2 là chữ đánh máy

---

## 9. Triển khai

**Không có backend riêng.** Supabase *là* backend: Postgres + Auth + Storage + RLS. Next.js chỉ render giao diện và vài route handler mỏng. Không Express, không API server, không Docker.

```
Điện thoại kỹ sư
   │
   ├── HTML/JS ─────────────→ Vercel            vài trăm KB
   │
   ├── truy vấn dữ liệu ────→ Supabase Postgres  JSON nhỏ, qua PostgREST
   │
   └── ẢNH / VIDEO ─────────→ Supabase Storage   ~99% dung lượng
                              (KHÔNG đi qua Vercel)
```

| Thành phần | Nơi chạy |
|---|---|
| Frontend + SSR | Vercel |
| CSDL, Auth, Storage | Supabase |

### ⚠️ Upload phải đi thẳng client → Supabase Storage

Dùng `supabase.storage.from('evidence').upload()` ở phía trình duyệt. **Không proxy qua Next.js route handler.** Serverless function của Vercel giới hạn **request body 4,5 MB** — mọi video sẽ fail, và ảnh nặng cũng vậy. Đi thẳng còn giữ băng thông Vercel gần bằng 0.

### ⚠️ Region — chọn sai thì phải làm lại

Cả hai đặt ở **Singapore**:

- Supabase project → `ap-southeast-1`
- Vercel function region → `sin1`

HCM → Singapore ~30–50 ms; HCM → `us-east-1` 200 ms+. Biểu mẫu 5 bước gọi DB liên tục, chọn nhầm region là kỹ sư đứng giữa Trạm chờ từng thao tác.

**Region của Supabase không đổi được sau khi tạo project.** Phải đúng ngay lần đầu.

### Gói dịch vụ

- **Supabase Free không dùng được**: chỉ 1 GB storage, và project *tự ngủ sau 7 ngày không hoạt động*. Cần **Pro (~$25/tháng)** — 8 GB DB, 100 GB storage, 250 GB egress.
- **Vercel Hobby miễn phí nhưng ToS cấm dùng thương mại.** Dự án có hợp đồng khách hàng → **Pro (~$20/tháng)**. Ngày 1 test trên Hobby thì được.

Ở quy mô đầy đủ (~6.000 Trạm, ước 1,4 TB gồm video), phần vượt hạn mức storage khoảng $30/tháng; **egress mới là chỗ đau**, và đó chính là lý do `storage.ts` (§6) được tách riêng để đổi sang Cloudflare R2 sau này. Kiểm tra lại số trên trang pricing trước khi báo cáo chi phí.

### Deploy

```bash
npx vercel            # lần đầu, liên kết project
npx vercel --prod
```

Đặt biến môi trường ở §2 trong Vercel Project Settings. `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng cho script nạp BM01 chạy tại máy local — **không đặt lên Vercel**, không để lọt vào biến `NEXT_PUBLIC_*`.

Tự host (VPS) thì cần thêm `output: 'standalone'` trong `next.config.ts`. Không khuyến nghị cho ngày 1.

---

## 10. Cần chốt trước khi chạy

1. **Dự án Supabase** — URL, anon key, service role key. Chưa có thì chưa chạy được gì. Tạo ở region `ap-southeast-1`.
2. **Định dạng `so_bien_ban`** — đề xuất `CCVN-{ma_tram}-L{luot_thu}`. Bên A có quy ước riêng không?
3. **File BM01 thật** để viết script nạp `stations` + `station_cabinets`. Cột theo Phụ lục 02: `Mã trạm, Tên trạm, Địa chỉ, Lat, Long, Nhà thầu lắp đặt / Tên và SĐT, SN1…SN5 (có thể có SN6)`.
4. **Danh sách kỹ sư** — họ tên, chức vụ, email để admin tạo tài khoản.
5. **Nâng giới hạn kích thước tệp của bucket** nếu bật video.
6. **Tên miền** — `ccts.chargecore.vn` hay tương tự? Cần trỏ CNAME về Vercel.
7. **V-Green có yêu cầu dữ liệu lưu tại Việt Nam không?** Hợp đồng chỉ nói lưu 5 năm (Điều 8.5) và đồng bộ sang CMS, không nói nơi lưu. Nếu Bên A có ràng buộc nội bộ về vị trí dữ liệu thì phải biết **trước khi tạo Supabase project** — đổi region nghĩa là làm lại từ đầu.
