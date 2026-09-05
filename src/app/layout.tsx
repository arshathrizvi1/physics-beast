import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { AuthProvider } from "@/lib/AuthContext";
import NavButtons from "@/components/NavButtons";

import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import LiveNavLink from "@/components/LiveNavLink";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Physics Beast LMS",
  description: "Learn physics with online video courses and MCQ exams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
              <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-2 md:px-4 flex h-16 items-center justify-between">
                  <Link href="/" className="flex items-center space-x-2 mr-2">
                    <span className="font-bold text-lg md:text-2xl tracking-tight text-primary whitespace-nowrap">
                      <span className="hidden sm:inline">Physics Beast</span>
                      <span className="sm:hidden">PB</span>
                    </span>
                  </Link>
                  <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar">
                    <nav className="flex items-center space-x-3 md:space-x-4 text-xs md:text-sm font-medium whitespace-nowrap">
                      <Link href="/courses" className="transition-colors hover:text-foreground/80 text-foreground/60">
                        Courses
                      </Link>
                      <Link href="/exams" className="transition-colors hover:text-foreground/80 text-foreground/60">
                        Exams
                      </Link>
                      <LiveNavLink />
                      <Link href="/leaderboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
                        Leaderboard
                      </Link>
                    </nav>
                    <div className="flex items-center ml-auto pl-2 border-l">
                      <NavButtons />
                    </div>
                  </div>
                </div>
              </header>
            <main className="flex-1 container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="border-t py-6 md:py-0 bg-secondary/20">
              <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                  Built for Physics Beast. All rights reserved.
                </p>
              </div>
            </footer>
          </AuthProvider>
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
