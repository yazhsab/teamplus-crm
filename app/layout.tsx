import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeamPlus | CRM & Operations",
  description:
    "TeamPlus workspace for customers, quotations, artwork, production, delivery and payments.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
