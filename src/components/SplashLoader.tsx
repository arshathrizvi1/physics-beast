'use client';
import { useEffect } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';

export default function SplashLoader() {
  useEffect(() => {
    // Hide standard Capacitor Splash Screen
    SplashScreen.hide().catch(() => {});

    // Hide the custom Native Android Canvas Animation (BrilliantLoadingView)
    const interval = setInterval(() => {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.BatteryOptimization && window.BatteryOptimization.hideLoadingScreen) {
        // @ts-ignore
        window.BatteryOptimization.hideLoadingScreen();
        clearInterval(interval);
      }
    }, 100);

    // Backup clear just in case
    setTimeout(() => clearInterval(interval), 5000);
  }, []);

  return null;
}
