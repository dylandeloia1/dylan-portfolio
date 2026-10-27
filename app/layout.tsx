import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dylan D'Eloia — Software Engineer",
  description: "Portfolio Website",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-body antialiased">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
