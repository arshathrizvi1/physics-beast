package com.physicsbeast.app;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final int NOTIFICATION_PERMISSION_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundPermissionPlugin.class);
        super.onCreate(savedInstanceState);

        // Strictly prevent screenshots and screen recordings across all Android versions
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
        
        clearServiceWorkerCache();
        
        hideSystemUI();
    }

    private void clearServiceWorkerCache() {
        try {
            java.io.File dataDir = new java.io.File(getApplicationInfo().dataDir, "app_webview/Default/Service Worker");
            if (dataDir.exists()) {
                deleteRecursively(dataDir);
                Log.d(TAG, "Service Worker cache deleted successfully.");
            }
            
            // Also clear the general WebView cache for good measure (doesn't clear IndexedDB)
            android.webkit.WebView webView = this.bridge.getWebView();
            if (webView != null) {
                webView.clearCache(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to delete Service Worker cache", e);
        }
    }

    private void deleteRecursively(java.io.File fileOrDirectory) {
        if (fileOrDirectory.isDirectory()) {
            java.io.File[] children = fileOrDirectory.listFiles();
            if (children != null) {
                for (java.io.File child : children) {
                    deleteRecursively(child);
                }
            }
        }
        fileOrDirectory.delete();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_CODE);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    private void hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
            WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
            // Only hide status bar, keep navigation bar
            controller.hide(WindowInsetsCompat.Type.statusBars());
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        } else {
            View decorView = getWindow().getDecorView();
            decorView.setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
            );
        }
    }
}
