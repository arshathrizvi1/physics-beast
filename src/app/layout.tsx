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
              <PremiumNavbar />

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
