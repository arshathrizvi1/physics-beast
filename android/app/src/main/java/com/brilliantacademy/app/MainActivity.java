package com.brilliantacademy.app;

import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.content.pm.InstallSourceInfo;
import android.os.Build;
import android.app.AlertDialog;
import android.content.DialogInterface;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (!verifyInstaller(this)) {
            new AlertDialog.Builder(this)
                .setTitle("Security Violation")
                .setMessage("This app must be installed from the official Google Play Store. Sideloading or sharing the APK via Shareit is strictly prohibited.")
                .setCancelable(false)
                .setPositiveButton("Exit", new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {
                        finishAffinity();
                    }
                })
                .show();
            return;
        }
    }

    private boolean verifyInstaller(android.content.Context context) {
        try {
            String installer = null;
            PackageManager pm = context.getPackageManager();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                InstallSourceInfo info = pm.getInstallSourceInfo(context.getPackageName());
                installer = info.getInstallingPackageName();
            } else {
                installer = pm.getInstallerPackageName(context.getPackageName());
            }

            // Allow ADB (Android Studio) for your development
            if (installer == null) return true;
            
            // Allow official Google Play Store
            if (installer.equals("com.android.vending")) return true;

            // Block everything else (Shareit, Chrome, File Managers)
            return false;
        } catch (Exception e) {
            return false;
        }
    }

        class NativeBridge {
        @JavascriptInterface
        public boolean hasBatteryPermission() {
            try {
                android.os.PowerManager pm = (android.os.PowerManager) getSystemService(android.content.Context.POWER_SERVICE);
                if (pm != null) {
                    return pm.isIgnoringBatteryOptimizations(getPackageName());
                }
            } catch (Exception e) {}
            return false;
        }

        @JavascriptInterface
        public void openBatterySettings() {
            try {
                Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                startActivity(intent);
            } catch (Exception e) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    fallback.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(fallback);
                } catch (Exception ex) {}
            }
        }

        @JavascriptInterface
        public void openAutoStartSettings() {
            try {
                // Try Xiaomi / OEM AutoStart
                Intent intent = new Intent();
                intent.setComponent(new ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"));
                startActivity(intent);
            } catch (Exception e) {
                try {
                    // Fallback to general app settings
                    Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    fallback.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(fallback);
                } catch (Exception ex) {}
            }
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // FLAG_SECURE disabled for development screenshots
        // getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
    }

    @Override
    public void onStart() {
        super.onStart();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new NativeBridge(), "AndroidNative");
        }
    }
}