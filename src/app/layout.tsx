import type { Metadata } from "next";
import "../styles/index.css";

export const metadata: Metadata = {
  title: "User dashboard",
  description:
    "Connect and engage with others through a simple, user-friendly chat platform designed for seamless communication and social interaction.",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
