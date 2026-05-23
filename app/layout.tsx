import type { Metadata } from "next";
import { Toaster } from "sonner";

import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sunbites POS",
  description: "Sunbites Kitchen POS & Admin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
