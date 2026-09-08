package com.physicsbeast.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && (
            Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction()) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())
        )) {
            Log.d(TAG, "Device booted! Initializing background notification service...");
            // LocalNotifications & Capacitor Services automatically re-register scheduled alarms on BOOT_COMPLETED.
        }
    }
}
