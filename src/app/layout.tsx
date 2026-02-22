import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frozen Bakery Shelf Life",
  description: "Scan or search frozen bakery items to get shelf life and the date to write on the gun.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
