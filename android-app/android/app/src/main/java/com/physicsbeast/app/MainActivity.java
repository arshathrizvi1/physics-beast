package com.physicsbeast.app;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Prevent screenshots and screen recordings AT THE EARLIEST POSSIBLE POINT
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );

        registerPlugin(BackgroundPermissionPlugin.class);
        super.onCreate(savedInstanceState);

        // Only clean up stale service worker files — do NOT clearCache
        cleanServiceWorkerFiles();

        hideSystemUI();
    }

    /**
     * Removes only the on-disk Service Worker storage directories.
     * Does NOT call clearCache — that was causing the "page is loading" error
     * by forcing a full re-download of the entire app on every cold start.
     */
    private void cleanServiceWorkerFiles() {
        try {
            java.io.File dir1 = new java.io.File(getApplicationInfo().dataDir, "app_webview/Default/Service Worker");
            if (dir1.exists()) deleteRecursively(dir1);

            java.io.File dir2 = new java.io.File(getApplicationInfo().dataDir, "app_webview/Service Worker");
            if (dir2.exists()) deleteRecursively(dir2);

            Log.d(TAG, "Service Worker directories cleaned.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to clean Service Worker directories", e);
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

    private void hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
            WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
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
