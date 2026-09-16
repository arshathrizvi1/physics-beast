"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Shield, Bell, BatteryCharging, Rocket, CheckCircle2, XCircle, RefreshCw, Smartphone } from "lucide-react";

/**
 * PermissionGate — shown on app launch inside Capacitor Android only.
 * Blocks access until battery optimization, auto-start, and notification permissions are granted.
 */
export default function PermissionGate({ children }: { children: React.ReactNode }) {
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [checking, setChecking] = useState(true);
  const [allGranted, setAllGranted] = useState(false);
  const [batteryOk, setBatteryOk] = useState(false);
  const [notificationOk, setNotificationOk] = useState(false);
  const [autoStartVisited, setAutoStartVisited] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({ manufacturer: "", model: "", sdkVersion: 0 });

  const checkPermissions = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).Capacitor) return;

    setChecking(true);
    try {
      const BackgroundPermission = (window as any).Capacitor.Plugins.BackgroundPermission;
      if (!BackgroundPermission) {
        setAllGranted(true);
        setChecking(false);
        return;
      }

      // Check battery optimization
      const batteryResult = await BackgroundPermission.checkBatteryOptimization();
      setBatteryOk(batteryResult.isIgnoring === true);

      // Check notification permission
      const notifResult = await BackgroundPermission.checkNotificationPermission();
      setNotificationOk(notifResult.granted === true);

      // Get device info
      const info = await BackgroundPermission.getManufacturer();
      setDeviceInfo(info);

      // Check if auto-start was previously visited
      const visited = localStorage.getItem("autostart_permission_visited") === "true";
      setAutoStartVisited(visited);

      // All OK?
      const allOk = batteryResult.isIgnoring && notifResult.granted && visited;
      setAllGranted(allOk);
      
      if (allOk) {
        localStorage.setItem("permissions_all_granted", "true");
      }
    } catch (err) {
      console.error("Permission check failed:", err);
      setAllGranted(true); // Don't block on error
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isCap = !!(window as any).Capacitor?.isNativePlatform?.();
    setIsCapacitor(isCap);

    if (!isCap) {
      setAllGranted(true);
      setChecking(false);
      return;
    }

    // If previously all granted, do a quick re-check on cold start only
    const wasGranted = localStorage.getItem("permissions_all_granted") === "true";
    if (wasGranted) {
      // Still verify on cold start
      checkPermissions();
    } else {
      checkPermissions();
    }
  }, [checkPermissions]);

  const handleBatteryPermission = async () => {
    try {
      const BackgroundPermission = (window as any).Capacitor.Plugins.BackgroundPermission;
      await BackgroundPermission.requestBatteryOptimization();
      // Re-check after a short delay (user needs to interact with the settings)
      setTimeout(checkPermissions, 1500);
    } catch (err) {
      console.error("Battery permission request failed:", err);
    }
  };

  const handleNotificationPermission = async () => {
    try {
      const BackgroundPermission = (window as any).Capacitor.Plugins.BackgroundPermission;
      await BackgroundPermission.requestNotificationPermission();
      setTimeout(checkPermissions, 1500);
    } catch (err) {
      console.error("Notification permission request failed:", err);
    }
  };

  const handleAutoStartPermission = async () => {
    try {
      const BackgroundPermission = (window as any).Capacitor.Plugins.BackgroundPermission;
      await BackgroundPermission.requestAutoStart();
      localStorage.setItem("autostart_permission_visited", "true");
      setAutoStartVisited(true);
      setTimeout(checkPermissions, 1500);
    } catch (err) {
      console.error("Auto-start permission request failed:", err);
    }
  };

  // Not in Capacitor or all permissions granted
  if (!isCapacitor || allGranted) {
    return <>{children}</>;
  }

  // Still checking
  if (checking) {
    return (
      <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-lg font-bold">Checking permissions...</div>
      </div>
    );
  }

  const needsAutoStart = !["samsung", "google", "pixel"].includes(deviceInfo.manufacturer?.toLowerCase() || "");

  return (
    <div className="fixed inset-0 z-[200] bg-background overflow-y-auto">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto border border-primary/30">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">App Permissions Required</h1>
          <p className="text-muted-foreground text-sm">
            To track your study time accurately and send notifications, please enable the following permissions.
          </p>
        </div>

        {/* Device Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/20 rounded-lg px-3 py-2">
          <Smartphone className="w-4 h-4" />
          <span>{deviceInfo.manufacturer} {deviceInfo.model}</span>
        </div>

        {/* Permission Cards */}
        <div className="space-y-3">
          {/* Battery Optimization */}
          <div className={`rounded-xl border-2 p-4 transition-colors ${batteryOk ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${batteryOk ? "bg-green-500/20" : "bg-amber-500/20"}`}>
                  <BatteryCharging className={`w-5 h-5 ${batteryOk ? "text-green-500" : "text-amber-500"}`} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Battery Unrestricted</h3>
                  <p className="text-xs text-muted-foreground">Allow background study tracking</p>
                </div>
              </div>
              {batteryOk ? (
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              ) : (
                <button
                  onClick={handleBatteryPermission}
                  className="bg-amber-500 text-black font-bold text-xs px-3 py-2 rounded-lg shrink-0 hover:bg-amber-400 transition-colors"
                >
                  Enable
                </button>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className={`rounded-xl border-2 p-4 transition-colors ${notificationOk ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${notificationOk ? "bg-green-500/20" : "bg-amber-500/20"}`}>
                  <Bell className={`w-5 h-5 ${notificationOk ? "text-green-500" : "text-amber-500"}`} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Notifications</h3>
                  <p className="text-xs text-muted-foreground">Receive class & exam alerts</p>
                </div>
              </div>
              {notificationOk ? (
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              ) : (
                <button
                  onClick={handleNotificationPermission}
                  className="bg-amber-500 text-black font-bold text-xs px-3 py-2 rounded-lg shrink-0 hover:bg-amber-400 transition-colors"
                >
                  Enable
                </button>
              )}
            </div>
          </div>

          {/* Auto-Start (only for phones that need it) */}
          {needsAutoStart && (
            <div className={`rounded-xl border-2 p-4 transition-colors ${autoStartVisited ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${autoStartVisited ? "bg-green-500/20" : "bg-amber-500/20"}`}>
                    <Rocket className={`w-5 h-5 ${autoStartVisited ? "text-green-500" : "text-amber-500"}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Auto-Start</h3>
                    <p className="text-xs text-muted-foreground">Start on boot for {deviceInfo.manufacturer}</p>
                  </div>
                </div>
                {autoStartVisited ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                ) : (
                  <button
                    onClick={handleAutoStartPermission}
                    className="bg-amber-500 text-black font-bold text-xs px-3 py-2 rounded-lg shrink-0 hover:bg-amber-400 transition-colors"
                  >
                    Open Settings
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Refresh / Continue */}
        <div className="space-y-3 pt-2">
          <button
            onClick={checkPermissions}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm hover:brightness-110 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Permission Status
          </button>
          <p className="text-center text-xs text-muted-foreground">
            After enabling each permission, tap &ldquo;Refresh&rdquo; to update the status.
          </p>
        </div>
      </div>
    </div>
  );
}
