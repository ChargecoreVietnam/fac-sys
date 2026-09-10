import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

// Be Vietnam Pro được vẽ riêng cho dấu tiếng Việt nên không bị so le chân dấu.
const sans = Be_Vietnam_Pro({
  variable: '--font-bvp',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

// Mã hạng mục, SN và số đo xếp thẳng cột.
const mono = IBM_Plex_Mono({
  variable: '--font-plex',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CCTS · Nghiệm thu Trạm đổi pin',
  description: 'Biên bản nghiệm thu BM03 tại hiện trường - ChargeCore Vietnam',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
