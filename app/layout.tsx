import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "RetailMind AI | Retail intelligence, evolved",
  description:
    "An explainable multi-agent retail analytics platform with episodic memory, reflection and adaptive tool selection.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
