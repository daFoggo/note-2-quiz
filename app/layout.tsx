import { Toaster } from "@/components/ui/sonner";
import { APP_CONFIG } from "@/lib/config/app";
import { ClerkThemeProvider } from "@/lib/contexts/clerk-theme-context";
import { ThemeProvider } from "@/lib/contexts/theme-context";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SWRConfig } from "swr";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <NuqsAdapter>
            <SWRConfig>
              <ClerkThemeProvider>
                <ClerkProvider>
                  {children}
                  <Toaster position="top-center" richColors />
                </ClerkProvider>
              </ClerkThemeProvider>
            </SWRConfig>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
