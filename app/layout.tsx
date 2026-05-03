import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI D&D Campaign Manager",
  description: "Run immersive AI-assisted D&D campaigns for 1-10 players",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
