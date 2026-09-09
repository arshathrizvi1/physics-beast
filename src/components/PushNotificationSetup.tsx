"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export function PushNotificationSetup() {
  const { user } = useAuth();

  useEffect(() => {
    // Only run on Capacitor (Android/iOS) native devices
    const isCapacitor = typeof window !== "undefined" && ((window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor);
    
    if (!isCapacitor || !user?.uid) return;

    // Dynamically import to avoid breaking the Next.js SSR build
    import("@capacitor/push-notifications").then(({ PushNotifications }) => {
      // Request permissions
      PushNotifications.requestPermissions().then((result) => {
        if (result.receive === 'granted') {
          // Register with Apple / Google to receive push via APNS/FCM
          PushNotifications.register();
        }
      });

      // On success, we should be able to receive notifications
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        // Save token to Firestore so backend can send notifications
        if (user?.uid) {
          setDoc(doc(db, "users", user.uid), {
            fcmToken: token.value,
            fcmTokenUpdatedAt: Date.now()
          }, { merge: true }).catch(err => console.error("Error saving FCM token", err));
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
      });
    }).catch(err => console.log("PushNotifications module not available", err));
    
  }, [user?.uid]);

  return null;
}
