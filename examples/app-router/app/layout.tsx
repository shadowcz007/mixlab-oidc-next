import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "mixlab-oidc-next demo",
  description: "Next.js 15 App Router + MixLab OIDC SDK demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}