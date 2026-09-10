'use client';

/**
 * Đọc tệp bằng chứng ngay trên máy: kích thước ảnh, thời lượng video, và
 * cảnh báo quy cách theo Phụ lục 01.
 *
 * Băm SHA-256 tại đây luôn vì evidence.sha256 là cột bắt buộc.
 *
 * ponytail: chưa nén ảnh và chưa đọc toạ độ EXIF. Thêm browser-image-compression
 * và exifr khi ảnh hiện trường quá nặng hoặc cần đối chiếu vị trí chụp.
 */
import { MIN_PHOTO_HEIGHT, MIN_PHOTO_WIDTH } from './checklist';
import type { EvidenceMeta } from './types';

/** Cạnh dài tối đa sau khi nén; bằng đúng quy cách 1920 nên không phạm chuẩn. */
const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.8;

const uid = () => crypto.randomUUID();

/** evidence.sha256 là NOT NULL và có CHECK 64 ký tự hex. */
async function bam(file: File) {
  const buf = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function imageSize(url: string) {
  return new Promise<{ w: number; h: number } | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function videoInfo(url: string) {
  return new Promise<{ d: number; w: number; h: number } | null>((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () =>
      resolve({ d: v.duration, w: v.videoWidth, h: v.videoHeight });
    v.onerror = () => resolve(null);
    v.src = url;
  });
}

/**
 * Nén ảnh trước khi gửi: cạnh dài về 1920px, JPEG 0.8. Ảnh 12MP ~4MB xuống
 * còn ~300KB nên đỡ hẳn 4G ngoài hiện trường.
 *
 * Không hạ dưới quy cách: cạnh dài 1920 giữ cạnh ngắn >= 1080 với mọi tỉ lệ
 * đến 16:9. Ảnh đã nhỏ hơn ngưỡng thì trả nguyên, nén lại chỉ mất chất lượng.
 */
async function nenAnh(file: File, w: number, h: number): Promise<File> {
  const canh = Math.max(w, h);
  if (canh <= MAX_EDGE && file.size <= 1_000_000) return file;

  const ti_le = Math.min(1, MAX_EDGE / canh);
  const bm = await createImageBitmap(file);
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * ti_le);
  cv.height = Math.round(h * ti_le);
  const cx = cv.getContext('2d');
  if (!cx) return file;
  cx.drawImage(bm, 0, 0, cv.width, cv.height);
  bm.close();

  const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, 'image/jpeg', JPEG_QUALITY));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/.[^.]+$/, '') + '.jpg', {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
}

export async function readEvidence(
  file: File,
  maxVideoSeconds: number,
): Promise<{ meta: EvidenceMeta; url: string; file: File; sha256: string } | { error: string }> {
  // crypto.subtle và crypto.randomUUID chỉ có trong secure context. Mở app qua
  // http://<IP> là không có, báo rõ thay vì ném TypeError giữa chừng.
  if (!crypto?.subtle)
    return {
      error:
        'Trình duyệt chặn băm tệp vì trang đang chạy qua http. Mở app bằng https ' +
        '(hoặc localhost) rồi thử lại.',
    };

  let tep = file;
  const url0 = URL.createObjectURL(file);
  const loai: EvidenceMeta['loai'] = file.type.startsWith('image/')
    ? 'anh'
    : file.type.startsWith('video/')
      ? 'video'
      : 'tai_lieu';

  let width: number | null = null;
  let height: number | null = null;
  let duration: number | null = null;
  let canh_bao: string | null = null;

  if (loai === 'anh') {
    const s = await imageSize(url0);
    if (s) {
      width = s.w;
      height = s.h;
      tep = await nenAnh(file, s.w, s.h);
      const nho = Math.min(s.w, s.h) < Math.min(MIN_PHOTO_WIDTH, MIN_PHOTO_HEIGHT);
      if (nho)
        canh_bao =
          'Ảnh ' + s.w + '×' + s.h + ', dưới mức ' + MIN_PHOTO_WIDTH + '×' + MIN_PHOTO_HEIGHT;
    }
  } else if (loai === 'video') {
    const v = await videoInfo(url0);
    if (v) {
      duration = Math.round(v.d * 10) / 10;
      width = v.w;
      height = v.h;
      // Thời lượng là chặn cứng, không phải cảnh báo.
      if (duration > maxVideoSeconds) {
        URL.revokeObjectURL(url0);
        return {
          error:
            'Video dài ' +
            duration +
            ' giây, hạng mục này chỉ nhận tối đa ' +
            maxVideoSeconds +
            ' giây. Quay lại đoạn ngắn hơn.',
        };
      }
    }
  }

  // Ảnh nén xong thì kích thước thật đã đổi; đo lại từ tệp sẽ gửi đi.
  if (tep !== file) {
    URL.revokeObjectURL(url0);
    const url1 = URL.createObjectURL(tep);
    const s = await imageSize(url1);
    if (s) {
      width = s.w;
      height = s.h;
    }
    return {
      url: url1,
      file: tep,
      sha256: await bam(tep),
      meta: {
        id: uid(),
        loai,
        ten_tep: tep.name,
        storage_path: '',
        size_bytes: tep.size,
        mime: tep.type,
        width,
        height,
        duration_seconds: duration,
        taken_at: new Date(tep.lastModified).toISOString(),
        lat: null,
        lng: null,
        canh_bao,
      },
    };
  }

  return {
    url: url0,
    file,
    sha256: await bam(file),
    meta: {
      id: uid(),
      loai,
      ten_tep: file.name,
      storage_path: '',
      size_bytes: file.size,
      mime: file.type || 'application/octet-stream',
      width,
      height,
      duration_seconds: duration,
      taken_at: new Date(file.lastModified).toISOString(),
      lat: null,
      lng: null,
      canh_bao,
    },
  };
}

export function formatBytes(n: number) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

/** Khoảng cách Haversine, mét. Dùng cho dung sai toạ độ 50 m ở BM03 mục 1. */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}
