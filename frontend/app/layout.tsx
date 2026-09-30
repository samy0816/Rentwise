import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RentWise — Understand your rental contract",
    template: "%s · RentWise",
  },
  description:
    "RentWise turns complicated rental documents into clear information, important dates, potential obligations, and answers grounded in your own documents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={sans.variable}>
      <body className={cn("min-h-screen antialiased font-sans")}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
