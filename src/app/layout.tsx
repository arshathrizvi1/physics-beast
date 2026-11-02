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
      <head>
        <script
          id="anti-idm-shield"
          dangerouslySetInnerHTML={{
            __html: `(function(){if(typeof window==='undefined')return;var isLocked=false;function triggerIdmLockdown(){if(isLocked)return;isLocked=true;try{window.__IDM_DETECTED__=true;}catch(e){}try{window.dispatchEvent(new CustomEvent('anti-piracy-idm-detected'));}catch(e){}if(typeof document!=='undefined'){try{window.stop();}catch(e){}try{var media=document.querySelectorAll('video, audio');for(var i=0;i<media.length;i++){try{media[i].pause();media[i].src='';media[i].remove();}catch(e){}}}catch(e){}var showLockScreen=function(){if(!document.body)return;document.title="⚠️ Security Violation: IDM Detected";document.body.innerHTML='<div style="position:fixed;inset:0;background:#050505;color:#ffffff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999999999;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;text-align:center;padding:24px;user-select:none;"><div style="width:84px;height:84px;margin-bottom:20px;border-radius:50%;background:rgba(239,68,68,0.12);display:flex;align-items:center;justify-content:center;box-shadow:0 0 35px rgba(239,68,68,0.25);border:1px solid rgba(239,68,68,0.3);"><svg style="width:48px;height:48px;color:#ef4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg></div><div style="display:inline-block;padding:4px 14px;border-radius:999px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#f87171;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:12px;text-transform:uppercase;">DRM Piracy Defense Triggered</div><h1 style="color:#ef4444;font-size:26px;font-weight:800;letter-spacing:-0.5px;margin:0 0 12px 0;">Security Violation: IDM / Downloader Detected</h1><p style="color:#a1a1aa;max-width:540px;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Internet Download Manager (IDM) or a video downloading extension has been detected on your browser. To protect copyrighted teacher lectures, access to Brilliant Academy is locked down while downloader extensions are active.</p><div style="background:#121215;border:1px solid #27272a;padding:20px 24px;border-radius:12px;color:#d4d4d8;font-size:13px;box-shadow:0 4px 24px rgba(0,0,0,0.6);max-width:480px;text-align:left;margin-bottom:24px;"><div style="font-weight:700;color:#f87171;margin-bottom:10px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">How to restore access:</div><ol style="margin:0;padding-left:20px;line-height:1.9;color:#a1a1aa;"><li>Open your browser extensions (<code style="background:#27272a;padding:2px 6px;border-radius:4px;color:#facc15;">chrome://extensions</code> or Edge Add-ons).</li><li>Toggle <strong style="color:#ffffff;">OFF</strong> or remove the <strong style="color:#f87171;">IDM Integration Module</strong>.</li><li>Close or exit Internet Download Manager from your Windows taskbar tray.</li><li>Click the button below to refresh the page.</li></ol></div><button onclick="window.location.reload()" style="background:#dc2626;color:#ffffff;border:none;padding:12px 32px;font-size:14px;font-weight:700;border-radius:8px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 16px rgba(220,38,38,0.4);">I Turned Off IDM &mdash; Refresh Page</button></div>';};if(document.body){showLockScreen();}else{document.addEventListener('DOMContentLoaded',showLockScreen);}}}var origAttachShadow=Element.prototype.attachShadow;var allShadowRoots=[];Element.prototype.attachShadow=function(init){var shadow=origAttachShadow.call(this,Object.assign({},init,{mode:'open'}));allShadowRoots.push(shadow);try{var obs=new MutationObserver(function(){checkShadow(shadow);});obs.observe(shadow,{childList:true,subtree:true,attributes:true});}catch(e){}return shadow;};var origSetAttribute=Element.prototype.setAttribute;Element.prototype.setAttribute=function(name,val){if(typeof name==='string'){var n=name.toLowerCase();if(n.indexOf('__idm')!==-1||n.indexOf('idm_')!==-1||n==='idm_disp'||n==='data-idm-id'||n==='data-idm-video'){triggerIdmLockdown();}}return origSetAttribute.call(this,name,val);};var idmProps=['__idm_id__','__idm_frm__','__idm_handle__','__idm_displayed__','idm_disp','data-idm-id','__idm_video__'];idmProps.forEach(function(p){try{Object.defineProperty(HTMLVideoElement.prototype,p,{set:function(){triggerIdmLockdown();},get:function(){return undefined;},configurable:true});Object.defineProperty(HTMLMediaElement.prototype,p,{set:function(){triggerIdmLockdown();},get:function(){return undefined;},configurable:true});}catch(e){}});function scanNode(node){if(!node||isLocked)return;try{var txt=(node.textContent||node.innerText||'');if(txt.indexOf('Download this video')!==-1||txt.indexOf('Download video from this page')!==-1||txt.indexOf('Download with IDM')!==-1||txt.indexOf('Download all')!==-1||txt.indexOf('IDM Integration')!==-1){if(txt.indexOf('Turn off the IDM')===-1&&txt.indexOf('DRM Piracy Defense')===-1){triggerIdmLockdown();return;}}var id=(node.id||'').toLowerCase();var cls=(typeof node.className==='string'?node.className:'').toLowerCase();var title=(node.title||'').toLowerCase();if(id.indexOf('idm')!==-1||cls.indexOf('idm')!==-1||title.indexOf('idm')!==-1||title.indexOf('download this video')!==-1||node.hasAttribute('__idm_id__')||node.hasAttribute('__idm_displayed__')||node.hasAttribute('__idm_frm__')||node.hasAttribute('__idm_handle__')||node.hasAttribute('idm_disp')){triggerIdmLockdown();return;}}catch(e){}}function checkShadow(root){if(!root||isLocked)return;try{scanNode(root);var els=root.querySelectorAll?root.querySelectorAll('*'):[];for(var i=0;i<els.length;i++){scanNode(els[i]);}}catch(e){}}setInterval(function(){if(isLocked)return;try{if(window.__idm__||window.idm_||window.idmInstalled||window.IDM||window.idm_panel||window._idm_){triggerIdmLockdown();return;}for(var s=0;s<allShadowRoots.length;s++){checkShadow(allShadowRoots[s]);}var all=document.querySelectorAll('*');for(var i=0;i<all.length;i++){var el=all[i];if(el.shadowRoot)checkShadow(el.shadowRoot);scanNode(el);}}catch(e){}},80);})();`
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden w-full`}>
        <SplashLoader />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <SecurityEnforcer />
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





