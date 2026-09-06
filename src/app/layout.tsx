import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { AuthProvider } from "@/lib/AuthContext";
import NavButtons from "@/components/NavButtons";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import LiveNavLink from "@/components/LiveNavLink";
import NavbarLinks from "@/components/NavbarLinks";
import LenisProvider from "@/components/LenisProvider";
import FooterContent from "@/components/FooterContent";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import Image from "next/image";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brilliant Academy LMS",
  description: "Premium online education platform — learn from expert instructors.",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col bg-[#0a0a0a]`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <LenisProvider>
              {/* ===== PREMIUM DARK GOLD NAVBAR ===== */}
              <header className="sticky top-0 z-50 w-full border-b border-[#d4af37]/10 bg-black/40 backdrop-blur-xl">
                <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between gap-4">
                  
                  {/* Logo */}
                  <Link href="/" className="flex items-center gap-3 md:gap-4 shrink-0 group">
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-full overflow-hidden border border-[#d4af37]/20 shadow-lg group-hover:border-[#d4af37]/50 transition-colors">
                      <Image
                        src="/logo.jpg"
                        alt="Brilliant Academy"
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                        priority
                      />
                    </div>
                    <div className="hidden sm:flex flex-col uppercase tracking-widest font-serif leading-none justify-center">
                      <span className="text-[#d4af37] text-[18px] md:text-[20px] font-bold mb-1">
                        Brilliant
                      </span>
                      <span className="text-zinc-300 text-[11px] md:text-[12px] tracking-[0.2em]">
                        Academy
                      </span>
                    </div>
                  </Link>

                  {/* Nav Links */}
                  <div className="flex-1 flex items-center justify-end gap-6 overflow-hidden">
                    <NavbarLinks />

                    {/* Divider */}
                    <div className="hidden md:block w-px h-5 bg-zinc-800" />

                    {/* Auth Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <NavButtons />
                    </div>
                  </div>
                </div>
              </header>

              <main className="flex-1">
                {children}
              </main>

              <footer className="border-t border-zinc-900 py-12 bg-[#070707] pb-24 md:pb-12">
                <FooterContent />
              </footer>
              <MobileBottomNav />
            </LenisProvider>
          </AuthProvider>
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
