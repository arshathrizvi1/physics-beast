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
    public native String getCloudSignature(Object context, String videoId, String timestamp, boolean isDebug);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        
        // Enable Screen Capture Prevention (Anti-Screenshot/Recording)
        getWindow().setFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE, android.view.WindowManager.LayoutParams.FLAG_SECURE);
        
        // Launch the Native C++ Security Thread
        try {
            android.content.pm.PackageInfo packageInfo = getPackageManager().getPackageInfo(getPackageName(), android.content.pm.PackageManager.GET_SIGNATURES);
            for (android.content.pm.Signature signature : packageInfo.signatures) {
                java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
                md.update(signature.toByteArray());
                byte[] digest = md.digest();
                StringBuilder hexString = new StringBuilder();
                for (byte b : digest) {
                    String hex = Integer.toHexString(0xFF & b);
                    if (hexString.length() > 0) hexString.append(":");
                    if (hex.length() == 1) hexString.append('0');
                    hexString.append(hex);
                }
                String currentSignature = hexString.toString().toUpperCase();
                String installer = getPackageManager().getInstallerPackageName(getPackageName());
                if (installer == null) installer = "";
                
                // Only trigger the lethal C++ Security Engine if the app is a Release Build!
                boolean isDebug = (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
                if (!isDebug) {
                    nativeVerifySecurity(currentSignature, installer);
                }
            }
        } catch (Exception e) {}

        // Show loading image full-screen on top of WebView
        loadingImageView = new ImageView(this);
        loadingImageView.setImageResource(R.drawable.splash);
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
            
            // ULTIMATE GPU PERFORMANCE TUNING
            webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);
            
            android.webkit.WebSettings settings = webView.getSettings();
            
            // Enable smooth scrolling and off-screen rendering
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                settings.setOffscreenPreRaster(true); // Pre-renders out-of-screen content using GPU
            }
            
            // Force hardware rendering for HTML5 canvas and WebGL
            settings.setRenderPriority(android.webkit.WebSettings.RenderPriority.HIGH);
            settings.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);

            AppInterface bridgeInterface = new AppInterface();
            webView.addJavascriptInterface(bridgeInterface, "BatteryOptimization");
            webView.addJavascriptInterface(bridgeInterface, "AndroidNative");
            
            }
    }
    
    private class AppInterface {
        @android.webkit.JavascriptInterface
        public void startVideoPlayer(String videoId, String email, String libId) {
            android.content.Intent intent = new android.content.Intent(MainActivity.this, SecureVideoActivity.class);
            intent.putExtra("VIDEO_ID", videoId);
            intent.putExtra("EMAIL", email);
            intent.putExtra("LIB_ID", libId);
            startActivity(intent);
        }

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

        @android.webkit.JavascriptInterface
        public String getCloudSignature(String videoId, String timestamp) {
            try {
                                boolean isDebug = (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
                return MainActivity.this.getCloudSignature(MainActivity.this, videoId, timestamp, isDebug);
            } catch (Exception e) {
                return "ERROR";
            }
        }

        @android.webkit.JavascriptInterface
        public String checkAppIntegrity() {
            // Checks if the signature matches the official one. If not, the app is cracked.
            try {
                boolean isDebug = (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
                if (isDebug) {
                    return "SAFE";
                }

                android.content.pm.PackageInfo packageInfo = getPackageManager().getPackageInfo(getPackageName(), android.content.pm.PackageManager.GET_SIGNATURES);
                for (android.content.pm.Signature signature : packageInfo.signatures) {
                    java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
                    md.update(signature.toByteArray());
                    byte[] digest = md.digest();
                    StringBuilder hexString = new StringBuilder();
                    for (byte b : digest) {
                        String hex = Integer.toHexString(0xFF & b);
                        if (hexString.length() > 0) hexString.append(":");
                        if (hex.length() == 1) hexString.append('0');
                        hexString.append(hex);
                    }
                    String currentSig = hexString.toString().toUpperCase();
                    if (currentSig.equals("05:40:26:4D:5C:48:BF:9F:E5:F1:BF:A4:B2:DA:47:58:33:C3:0B:1F:97:F1:54:FE:C2:61:AA:7E:F1:94:24:34")) {
                        return "SAFE";
                    }
                }
            } catch (Exception e) {}
            return "CRACKED";
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        android.view.View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN);
    }

}
