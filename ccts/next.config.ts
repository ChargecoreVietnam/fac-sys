import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mở trên điện thoại cùng Wi-Fi: dev server chặn origin lạ nếu không khai báo.
  allowedDevOrigins: ["192.168.1.27", "*.local"],
};

export default nextConfig;
