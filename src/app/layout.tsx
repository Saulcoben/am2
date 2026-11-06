import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AM · Mecatrónica para niños",
  description:
    "Prototipo de panel para la escuela AM de mecatrónica para niños (sede Dosquebradas): asistencia por franjas, créditos por niño y caja de efectivo para el Admin.",
  keywords: ["mecatrónica", "niños", "asistencia", "créditos", "caja", "Dosquebradas", "prototipo"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-center" theme="dark" richColors closeButton />
      </body>
    </html>
  );
}
