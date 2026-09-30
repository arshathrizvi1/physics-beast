package com.brilliantacademy.app;

import android.os.Bundle;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.widget.ImageView;
import android.widget.Toast;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class MainActivity extends BridgeActivity {
    private ImageView loadingImageView;

    // Load the Unbreakable C++ Security Engine
    static {
        System.loadLibrary("secureplayer");
    }

    private native void nativeVerifySecurity(String currentSignature, String installerPackage);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Show loading image full-screen on top of WebView
        loadingImageView = new ImageView(this);
        loadingImageView.setImageResource(R.drawable.loading_bg);
        loadingImageView.setScaleType(ImageView.ScaleType.CENTER_CROP); // Fill screen, no stretch
        loadingImageView.setBackgroundColor(Color.BLACK);
        loadingImageView.setElevation(9999f);

        addContentView(loadingImageView, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        // Security checks
        try {
            String signature = getAppSignature();
            String installer = getInstallerPackageName();
            if (installer == null) installer = "";
            nativeVerifySecurity(signature, installer);
        } catch (Exception e) {
            Log.e("BrilliantSecurity", "Failed to run security checks", e);
            finishAffinity();
        }
    }

    // Called natively from C++ if the app is cracked or sideloaded
    public void showTamperAlertAndCrash() {
        new Handler(Looper.getMainLooper()).post(() -> {
            Toast.makeText(this, "CRITICAL: This app is compromised or downloaded from an unofficial source! It will now terminate.", Toast.LENGTH_LONG).show();
            Toast.makeText(this, "Please download the official app from the Google Play Store.", Toast.LENGTH_LONG).show();
        });
    }

    private String getAppSignature() {
        try {
            PackageInfo packageInfo = getPackageManager().getPackageInfo(getPackageName(), PackageManager.GET_SIGNATURES);
            for (Signature signature : packageInfo.signatures) {
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                md.update(signature.toByteArray());
                byte[] digest = md.digest();
                StringBuilder hexString = new StringBuilder();
                for (byte b : digest) {
                    String hex = Integer.toHexString(0xFF & b);
                    if (hex.length() == 1) {
                        hexString.append('0');
                    }
                    hexString.append(hex).append(":");
                }
                return hexString.toString().substring(0, hexString.length() - 1).toUpperCase();
            }
        } catch (PackageManager.NameNotFoundException | NoSuchAlgorithmException e) {
            e.printStackTrace();
        }
        return "";
    }

    private String getInstallerPackageName() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                return getPackageManager().getInstallSourceInfo(getPackageName()).getInstallingPackageName();
            } else {
                return getPackageManager().getInstallerPackageName(getPackageName());
            }
        } catch (Exception e) {
            return "";
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            AppInterface bridgeInterface = new AppInterface();
            webView.addJavascriptInterface(bridgeInterface, "BatteryOptimization"); // For SplashLoader
            webView.addJavascriptInterface(bridgeInterface, "AndroidNative"); // For MobilePermissionPrompt
        }
    }

    private class AppInterface {
        @android.webkit.JavascriptInterface
        public boolean hasBatteryPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.os.PowerManager pm = (android.os.PowerManager) getSystemService(android.content.Context.POWER_SERVICE);
                return pm.isIgnoringBatteryOptimizations(getPackageName());
            }
            return true;
        }

        @android.webkit.JavascriptInterface
        public void openBatterySettings() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.content.Intent intent = new android.content.Intent();
                intent.setAction(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(android.net.Uri.parse("package:" + getPackageName()));
                startActivity(intent);
            }
        }

                @android.webkit.JavascriptInterface
        public void openAutoStartSettings() {
            try {
                android.content.Intent intent = new android.content.Intent();
                String manufacturer = android.os.Build.MANUFACTURER;
                if ("xiaomi".equalsIgnoreCase(manufacturer)) {
                    intent.setComponent(new android.content.ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"));
                } else if ("oppo".equalsIgnoreCase(manufacturer)) {
                    intent.setComponent(new android.content.ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"));
                } else if ("vivo".equalsIgnoreCase(manufacturer)) {
                    intent.setComponent(new android.content.ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"));
                } else if ("Letv".equalsIgnoreCase(manufacturer)) {
                    intent.setComponent(new android.content.ComponentName("com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity"));
                } else if ("Honor".equalsIgnoreCase(manufacturer)) {
                    intent.setComponent(new android.content.ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"));
                } else {
                    // Fallback to normal settings if autostart page doesn't exist natively
                    intent.setAction(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(android.net.Uri.parse("package:" + getPackageName()));
                }
                startActivity(intent);
            } catch (Exception e) {
                try {
                    android.content.Intent fallback = new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    fallback.setData(android.net.Uri.parse("package:" + getPackageName()));
                    startActivity(fallback);
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        }

        @android.webkit.JavascriptInterface
        public void hideLoadingScreen() {
            runOnUiThread(() -> {
                if (loadingImageView != null && loadingImageView.getParent() != null) {
                    ((ViewGroup) loadingImageView.getParent()).removeView(loadingImageView);
                    loadingImageView = null;
                }
            });
        }
    }
}
