package com.brilliantacademy.app;

import android.os.Bundle;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.PackageInfo;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class MainActivity extends BridgeActivity {

    // Load the Unbreakable C++ Security Engine
    static {
        System.loadLibrary("secureplayer");
    }

    private native void nativeVerifySecurity(String currentSignature, String installerPackage);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Disable Screenshots/Screen Recording (Uncomment for Production)
        // getWindow().setFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE, android.view.WindowManager.LayoutParams.FLAG_SECURE);

        // Run C++ Native Security Lock immediately on startup
        try {
            String signature = getAppSignature();
            String installer = getInstallerPackageName();
            if (installer == null) installer = ";
            nativeVerifySecurity(signature, installer);
        } catch (Exception e) {
            Log.e("BrilliantSecurity", "Failed to run security checks", e);
            finishAffinity(); // Crash if checking fails
        }
    }

    // Called natively from C++ if the app is cracked or sideloaded
    public void showTamperAlertAndCrash() {
        new Handler(Looper.getMainLooper()).post(() -> {
            Toast.makeText(this, "ðŸš¨ CRITICAL: This app is compromised or downloaded from an unofficial source! It will now terminate.", Toast.LENGTH_LONG).show();
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
            webView.addJavascriptInterface(new NativeBridge(), "AndroidNative");
        }
    }

    private class NativeBridge {
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
    }
}
