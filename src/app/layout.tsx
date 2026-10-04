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

import { Viewport } from "next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};

import { PasskeyShim } from "@/components/PasskeyShim";
import { ServiceWorkerCleanup } from "@/components/ServiceWorkerCleanup";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeToggle } from "@/components/ThemeToggle";
import PermissionGate from "@/components/PermissionGate";
import { SecurityEnforcer } from "@/components/SecurityEnforcer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: '%s | Brilliant Academy',
    default: 'Brilliant Academy | Classes in Rakwana (Grade 6-11 & ICT)',
  },
  description: `Join Brilliant Academy Rakwana for the best Mathematics, Science, and ICT classes in Sri Lanka. Expert teaching for Grade 6-11 (O/L) and Advanced Level (A/L) ICT.`,
  keywords: ["Rakwana class", "Classes in Rakwana", "Brilliant Academy Rakwana", "O/L Maths Rakwana", "O/L Science Rakwana", "ICT Classes Rakwana", "Grade 6-11 Tuition", "Sri Lanka Online Classes"],
  authors: [{ name: "Brilliant Academy" }],
  creator: "Brilliant Academy",
  openGraph: {
    type: "website",
    locale: "en_LK",
    url: "https://brillliantacademy.site/",
    title: "Brilliant Academy | Rakwana's Premier Educational Institute",
    description: `Master Maths, Science, and ICT with Brilliant Academy Rakwana. Join physical and online classes today.`,
    siteName: "Brilliant Academy",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body suppressHydrationWarning className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden w-full`}>
        <SecurityEnforcer />
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





