import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const description =
    "Ten questions. One slider. Put your instinct somewhere on the line.";

  return {
    metadataBase: new URL(origin),
    title: "Give or Take — How close can you get?",
    description,
    openGraph: {
      title: "Give or Take",
      description,
      type: "website",
      images: [
        {
          url: new URL("/og.png", origin).toString(),
          width: 1536,
          height: 1024,
          alt: "Give or Take — How close can you get?",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Give or Take",
      description,
      images: [new URL("/og.png", origin).toString()],
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
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
