import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "net2phone AI — See Where AI Changes Everything for Your Business",
  description:
    "Upload your call history and get a free AI readiness report. See exactly where AI agents can recover missed revenue.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE?.trim();
  return (
    <html lang="en">
      <body>
        {recaptchaSiteKey && (
          <Script
            src={`https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`}
            strategy="afterInteractive"
          />
        )}
        {children}
      </body>
    </html>
  );
}
