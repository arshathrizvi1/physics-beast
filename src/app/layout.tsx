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
              <header className="sticky top-0 z-50 w-full border-b border-[#d4af37]/20 bg-[#0a0a0a]/95 backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
                <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between gap-4">
                  
                  {/* Logo */}
                  <Link href="/" className="flex items-center gap-3 shrink-0 group">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#d4af37]/30 shadow-[0_0_10px_rgba(212,175,55,0.2)] group-hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300">
                      <Image
                        src="/logo.jpg"
                        alt="Brilliant Academy"
                        width={40}
                        height={40}
                        className="object-cover"
                        priority
                      />
                    </div>
                    <div className="hidden sm:block">
                      <span className="font-extrabold text-xl md:text-2xl tracking-tight text-[#d4af37] leading-none drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]">
                        Brilliant Academy
                      </span>
                    </div>
                  </Link>

                  {/* Nav Links */}
                  <div className="flex-1 flex items-center justify-end gap-2 overflow-hidden">
                    <nav className="hidden md:flex items-center gap-1 text-sm font-medium whitespace-nowrap">
                      {[
                        { href: "/courses", label: "Courses" },
                        { href: "/about", label: "About" },
                        { href: "/reviews", label: "Reviews" },
                        { href: "/exams", label: "Exams" },
                      ].map(({ href, label }) => (
                        <Link
                          key={href}
                          href={href}
                          className="px-3 py-2 rounded-lg text-zinc-400 hover:text-[#d4af37] hover:bg-[#d4af37]/10 transition-all duration-200 text-sm font-medium"
                        >
                          {label}
                        </Link>
                      ))}
                      <LiveNavLink />
                      <Link
                        href="/leaderboard"
                        className="px-3 py-2 rounded-lg text-zinc-400 hover:text-[#d4af37] hover:bg-[#d4af37]/10 transition-all duration-200 text-sm font-medium"
                      >
                        Leaderboard
                      </Link>
                    </nav>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-6 bg-zinc-700 mx-1" />

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
