# CCTS — Nghiệm thu Trạm đổi pin (BM03)

Ứng dụng web dùng trên điện thoại để kỹ sư ChargeCore Vietnam (Bên B) lập
**Biên bản nghiệm thu BM03 — Phụ lục 04** tại hiện trường.

Phạm vi là **BM03 và chỉ BM03**. Không làm màn hình BM01 hay BM02 riêng.

---

## Chạy thử

```bash
npm install
npm run dev
```

Mở http://localhost:3000. Cần `.env.local` và một tài khoản do quản trị tạo sẵn
trong Supabase — xem mục *Chạy máy mình* bên dưới.

Muốn mở trên điện thoại thật (cùng Wi-Fi):

```bash
npm run dev -- -H 0.0.0.0
```

rồi vào `http://<IP-máy>:3000`. Camera và GPS cần HTTPS trên phần lớn trình
duyệt di động — trên `http://` theo IP nội bộ, Chrome Android vẫn cho chụp ảnh
nhưng Safari iOS thì chặn định vị. Deploy lên Vercel để thử đủ hai thứ.

Lệnh khác: `npm run build`, `npm run lint`.

---

## Đọc gì trước

**[SPEC.md](SPEC.md)** — lược đồ cơ sở dữ liệu đầy đủ (DDL), chính sách RLS,
quy ước lưu tệp, và các ràng buộc hợp đồng chi phối thiết kế. Đó là tài liệu
gốc; README này chỉ nói cách chạy.

**[supabase/schema.dbml](supabase/schema.dbml)** — dán vào https://dbdiagram.io/d
để xem quan hệ 7 bảng.

---

## Tình trạng hiện tại

Đã nối Supabase (project **FAC_Storage**, region Singapore).

Đã có:

- 5 màn hình theo SPEC mục 7, thiết kế cho điện thoại
- Đăng nhập bằng Supabase Auth; hồ sơ `profiles` do trigger `on_auth_user_created` tạo
- Biểu mẫu 4 bước, hạng mục nhân theo từng Tủ; nhóm B chấm ngay trong panel Tủ
- Đo GPS thật + Haversine, dung sai 50 m
- Ảnh/video băm SHA-256 rồi upload thẳng bucket `evidence` (riêng tư, URL ký khi xem)
- Trạm và Tủ đọc từ bảng `stations` / `station_cabinets`

Chưa có:

- Màn admin duyệt `submitted → issued` và ghi `ket_luan`
- Làm việc ngoại tuyến (mất mạng là mất thao tác đang gõ)
- Nén ảnh, đọc toạ độ EXIF

---

## Cấu trúc

```
src/
  app/
    login/page.tsx                 đăng nhập
    page.tsx                       danh sách biểu mẫu
    tram/[ma_tram]/page.tsx        chi tiết Trạm + lịch sử lượt
    bien-ban/[id]/page.tsx         biểu mẫu 4 bước
    bien-ban/[id]/xem/page.tsx     BM03 chỉ đọc, in được
    globals.css                    biến màu, giao diện sáng và tối
  components/
    ui.tsx                         nút, ô nhập, thẻ, thanh trên/dưới
    steps.tsx                      bước 1..4
    ItemCard.tsx                   một ô kết quả hạng mục + bằng chứng
  lib/
    checklist.ts       ★ 27 mã hạng mục, tiêu chí, quy cách bằng chứng
    types.ts             kiểu dữ liệu, đặt tên trùng cột trong Postgres
    store.ts           ☆ toàn bộ đường ra dữ liệu (Supabase)
    media.ts             đọc ảnh/video, Haversine
    supabase.ts          client dùng chung cho cả app
supabase/
  schema.dbml            sơ đồ quan hệ bảng
```

★ `checklist.ts` là nguồn duy nhất định nghĩa 27 mã. Sửa tiêu chí hay quy cách
bằng chứng ở đây, đừng rải trong giao diện.

☆ Giao diện **không** gọi thẳng `supabase-js` ở bất kỳ đâu — mọi thứ đi qua
`store.ts`.

---

## Chạy máy mình

Cần `.env.local` (không commit):

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Tài khoản do quản trị tạo trong Supabase Studio, không có tự đăng ký. Kỹ sư chỉ
gõ tên đăng nhập, app tự ghép đuôi `@chargecore.com.vn` (gõ cả email cũng được).

Upload đi **thẳng** từ trình duyệt lên Supabase Storage. Không đẩy qua route
handler của Next.js — Vercel giới hạn thân yêu cầu 4.5 MB, video sẽ hỏng.

### Ghi chú về hình dạng dữ liệu

`store.ts` gộp `inspection_cabinets` và `item_results` vào trong đối tượng
`Inspection` cho gọn. Trong Postgres đó là **hai bảng riêng** — xem SPEC mục 4.

Khoá một ô kết quả là `"C5"` hoặc `"B1#2"` (mã · vị trí Tủ), tương ứng cặp
`(code, cabinet_id)` với ràng buộc `unique nulls not distinct`.

---

## Một điểm cần chốt

SPEC mục 7 ghi hạng mục lặp theo Tủ là *B1, B2*. `checklist.ts` lại đặt
`perCabinet: true` cho **cả B1–B5**. Mã hiện chạy theo `checklist.ts`, nên Trạm
6 Tủ sinh 52 ô chấm thay vì 34. Chốt lại rồi sửa một trong hai chỗ.

---

## Bảo mật — bắt buộc

- `SUPABASE_SERVICE_ROLE_KEY` **không bao giờ** để trong biến `NEXT_PUBLIC_*`,
  không deploy lên Vercel. Chỉ dùng dưới máy để nạp BM01.
- `.env*` đã nằm trong `.gitignore`. Giữ nguyên.
- Bucket `evidence` để **private**, lấy ảnh bằng signed URL.
- Uỷ quyền nằm ở RLS trong Postgres, không nằm ở TypeScript.
