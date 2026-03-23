import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "net2phone AI — See Where AI Changes Everything for Your Business",
  description:
    "Upload your call history and get a free AI readiness report. See exactly where AI agents can recover missed revenue.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
