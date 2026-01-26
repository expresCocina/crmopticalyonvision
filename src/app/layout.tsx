import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CRM Óptica Lyon Visión",
  description: "Sistema CRM para Óptica Lyon Visión",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={cn("min-h-screen bg-background font-sans antialiased flex", fontSans.variable)}>
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-screen w-full overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto p-3 md:p-6 bg-muted/30">
            {children}
          </div>
        </main>
        <Toaster />
      </body>
    </html>
  );
}
