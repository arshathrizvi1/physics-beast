import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import LenisProvider from "@/components/LenisProvider";
import FooterContent from "@/components/FooterContent";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import PremiumNavbar from "@/components/PremiumNavbar";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brilliant Academy LMS",
  description: "Learn Today, Build Tomorrow",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden w-full`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <LenisProvider>
              <PremiumNavbar />

              <main className="flex-1">
                {children}
              </main>

              <footer className="border-t border-border/50 py-12 bg-[#070707] pb-24 md:pb-12">
                <FooterContent />
              </footer>
              <MobileBottomNav />
            </LenisProvider>
          </AuthProvider>
          <ThemeToggle />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}

