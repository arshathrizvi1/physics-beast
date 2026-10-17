export type DeviceType = 'pc_web' | 'mobile_web' | 'android_app';

export interface PlayerTargetDevices {
  enabled: boolean;        // Master toggle for this player
  pcWeb: boolean;          // Windows / Mac / Linux PC browser
  mobileWeb: boolean;      // Android / iOS Mobile Web Browser
  androidApp: boolean;     // Native Android APK / Capacitor app
}

export interface VideoPlayerSettings {
  defaultPlayer?: 'bunny' | 'r2' | 'youtube'; // The primary player that opens first when allowed
  bunny: PlayerTargetDevices;
  r2?: PlayerTargetDevices;
  youtube: PlayerTargetDevices;
}

export const defaultPlayerSettings: VideoPlayerSettings = {
  defaultPlayer: 'bunny',
  bunny: {
    enabled: true,
    pcWeb: true,
    mobileWeb: true,
    androidApp: true,
  },
  r2: {
    enabled: true,
    pcWeb: true,
    mobileWeb: true,
    androidApp: true,
  },
  youtube: {
    enabled: true,
    pcWeb: true,
    mobileWeb: true,
    androidApp: true,
  },
};

export function extractYoutubeId(url: string | undefined | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}


/**
 * Accurately detects whether the client is:
 * 1. 'android_app' (Running inside Android Native APK / Capacitor WebView)
 * 2. 'mobile_web' (Running in a mobile browser such as Chrome on Android / Safari on iOS)
 * 3. 'pc_web' (Running on a desktop / laptop PC browser)
 */
export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'pc_web';
  
  const isAndroidNative = !!(window as any).AndroidNative;
  const isCapacitorNative = !!((window as any).Capacitor && typeof (window as any).Capacitor.isNativePlatform === 'function' && (window as any).Capacitor.isNativePlatform());
  const ua = (navigator.userAgent || '').toLowerCase();
  const isWebView = ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));

  if (isAndroidNative || isCapacitorNative || isWebView) {
    return 'android_app';
  }

  const isMobile = /android|iphone|ipad|ipod|windows phone|mobile/i.test(ua) || 
                  (window.innerWidth <= 768);

  if (isMobile) {
    return 'mobile_web';
  }

  return 'pc_web';
}

/**
 * Checks if a specific player target device configuration permits playback on the given device.
 */
export function isPlayerPermitted(
  settings: PlayerTargetDevices | undefined,
  device: DeviceType
): boolean {
  if (!settings) return true;
  if (settings.enabled === false) return false;

  switch (device) {
    case 'pc_web':
      return settings.pcWeb !== false;
    case 'mobile_web':
      return settings.mobileWeb !== false;
    case 'android_app':
      return settings.androidApp !== false;
    default:
      return true;
  }
}

export function getDeviceLabel(device: DeviceType): string {
  switch (device) {
    case 'pc_web':
      return 'PC Web Browser';
    case 'mobile_web':
      return 'Mobile Web Browser';
    case 'android_app':
      return 'Android App';
    default:
      return 'Current Device';
  }
}
