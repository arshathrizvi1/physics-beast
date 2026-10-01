import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import SplashLoader from "@/components/SplashLoader";
import LenisProvider from "@/components/LenisProvider";
import FooterContent from "@/components/FooterContent";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import PremiumNavbar from "@/components/PremiumNavbar";
import { CustomToastProvider } from "@/components/providers/ToastProvider";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
import { AndroidBackButtonHandler } from "@/components/AndroidBackButtonHandler";
import { AndroidSwipeReloadHandler } from "@/components/AndroidSwipeReloadHandler";
import { MobilePermissionPrompt } from "@/components/MobilePermissionPrompt";
import { PushNotificationSetup } from "@/components/PushNotificationSetup";
import { PasskeyShim } from "@/components/PasskeyShim";
import { ServiceWorkerCleanup } from "@/components/ServiceWorkerCleanup";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeToggle } from "@/components/ThemeToggle";
import PermissionGate from "@/components/PermissionGate";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: '%s | Brilliant Academy',
    default: 'Brilliant Academy | Advanced Level Physics & Online Classes Sri Lanka',
  },
  description: "Join Brilliant Academy for the best Advanced Level (A/L) Physics and Science online classes in Sri Lanka. Expert teachers, live sessions, and comprehensive study materials.",
  keywords: ["A/L Physics", "Online Classes Sri Lanka", "Brilliant Academy", "Advanced Level", "LMS", "Online Education", "Physics Tuition", "Sri Lanka"],
  authors: [{ name: "Brilliant Academy" }],
  creator: "Brilliant Academy",
  openGraph: {
    type: "website",
    locale: "en_LK",
    url: "https://brillliantacademy.site/",
    title: "Brilliant Academy | Premium Online A/L Classes",
    description: "Master Advanced Level Physics with Sri Lanka's leading online educational platform. Join thousands of students today.",
    siteName: "Brilliant Academy",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Brilliant Academy LMS",
  },
  applicationName: "Brilliant Academy LMS",
  verification: {
    google: "mL8cyyAyZ9u1E2t781IfntHrU5PGtz7VgQG3q2q4rAU",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body suppressHydrationWarning className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden w-full`}>
        <SplashLoader />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <PermissionGate>
            <NotificationProvider>
              <LenisProvider>
                <CustomToastProvider />
                <ServiceWorkerCleanup />
                <PushNotificationSetup />
                <PasskeyShim />
                <AndroidBackButtonHandler />
                <AndroidSwipeReloadHandler />
                <MobilePermissionPrompt />
                <PremiumNavbar />

                <main className="flex-1 min-h-[calc(100vh-10rem)]">
                  {children}
                </main>

                <footer className="border-t border-border/50 py-4 bg-zinc-100 dark:bg-[#070707] print:hidden mt-auto">
                  <FooterContent />
                </footer>
                <MobileBottomNav />
              </LenisProvider>
            </NotificationProvider>
            </PermissionGate>
          </AuthProvider>
          <SpeedInsights />
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}





