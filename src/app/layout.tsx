import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { AuthProvider } from "@/lib/AuthContext";
import NavButtons from "@/components/NavButtons";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import LiveNavLink from "@/components/LiveNavLink";
import LenisProvider from "@/components/LenisProvider";
import FooterContent from "@/components/FooterContent";
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
                  <Link href="/" className="flex items-center gap-3 shrink-0 group">
                    <div className="w-10 h-10 overflow-hidden">
                      <Image
                        src="/logo.jpg"
                        alt="Brilliant Academy"
                        width={40}
                        height={40}
                        className="object-cover"
                        priority
                      />
                    </div>
                    <div className="hidden sm:flex flex-col uppercase tracking-widest font-serif leading-none justify-center">
                      <span className="text-[#d4af37] text-[15px] font-bold mb-1">
                        Brilliant
                      </span>
                      <span className="text-zinc-300 text-[10px] tracking-[0.2em]">
                        Academy
                      </span>
                    </div>
                  </Link>

                  {/* Nav Links */}
                  <div className="flex-1 flex items-center justify-end gap-6 overflow-hidden">
                    <nav className="hidden md:flex items-center gap-6 text-sm font-semibold whitespace-nowrap">
                      {[
                        { href: "/courses", label: "Courses" },
                        { href: "/about", label: "About" },
                        { href: "/reviews", label: "Reviews" },
                        { href: "/exams", label: "Exams" },
                      ].map(({ href, label }) => (
                        <Link
                          key={href}
                          href={href}
                          className="text-zinc-300 hover:text-[#d4af37] transition-all duration-200"
                        >
                          {label}
                        </Link>
                      ))}
                      <LiveNavLink />
                      <Link
                        href="/leaderboard"
                        className="text-zinc-300 hover:text-[#d4af37] transition-all duration-200"
                      >
                        Leaderboard
                      </Link>
                    </nav>

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

              <footer className="border-t border-zinc-900 py-12 bg-[#070707]">
                <FooterContent />
              </footer>
            </LenisProvider>
          </AuthProvider>
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
