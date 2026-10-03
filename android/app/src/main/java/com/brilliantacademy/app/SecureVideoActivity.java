package com.brilliantacademy.app;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

public class SecureVideoActivity extends AppCompatActivity {

    static {
        System.loadLibrary("secureplayer");
    }

    public native String getCloudSignature(Object context, String videoId, String timestamp);

    private PlayerView playerView;
    private ExoPlayer exoPlayer;
    private TextView watermarkText;
    private TextView crackedWarningText;
    private Handler watermarkHandler = new Handler();
    private Runnable watermarkRunnable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Anti-Screen Recording & Screenshots (TEMPORARILY DISABLED FOR DEBUGGING)
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        
        setContentView(R.layout.activity_secure_video);
        
        playerView = findViewById(R.id.player_view);
        crackedWarningText = findViewById(R.id.cracked_warning_text);
        watermarkText = findViewById(R.id.watermark_text);

        // Check if app is cracked
        if (isAppCracked()) {
            playerView.setVisibility(View.GONE);
            crackedWarningText.setVisibility(View.VISIBLE);
            Toast.makeText(this, "APP CRACKED! Video Playback Blocked.", Toast.LENGTH_LONG).show();
            
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                System.exit(0);
            }, 3000);
            return;
        }

        String videoId = "test_video";
        String email = "student@brilliantacademy.com";
        String libId = "764707";
        if (getIntent() != null && getIntent().getData() != null) {
            videoId = getIntent().getData().getLastPathSegment();
            String queryEmail = getIntent().getData().getQueryParameter("email");
            if (queryEmail != null && !queryEmail.isEmpty()) {
                email = queryEmail;
            }
            String queryLib = getIntent().getData().getQueryParameter("lib");
            if (queryLib != null && !queryLib.isEmpty()) {
                libId = queryLib;
            }
        }
        
        // Start Floating Watermark
        startFloatingWatermark(email);

        // Initialize ExoPlayer
        exoPlayer = new ExoPlayer.Builder(this).build();
        playerView.setPlayer(exoPlayer);

        // Execute CLOUD DRM HANDSHAKE
        fetchSecureVideoUrl(videoId, libId);
    }

    private void fetchSecureVideoUrl(String videoId, String libId) {
        new Thread(() -> {
            try {
                String timestamp = String.valueOf(System.currentTimeMillis() / 1000L);
                
                // Get the Cryptographic Signature from C++
                String secureSignature = getCloudSignature(SecureVideoActivity.this, videoId, timestamp);
                
                // Call Vercel API
                URL url = new URL("https://www.brillliantacademy.site/api/bunny/sign?videoId=" + videoId + "&libraryId=" + libId);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestProperty("x-timestamp", timestamp);
                conn.setRequestProperty("x-secure-signature", secureSignature);
                
                if (conn.getResponseCode() == 200) {
                    BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = in.readLine()) != null) response.append(line);
                    in.close();
                    
                    JSONObject json = new JSONObject(response.toString());
                    String hlsUrl = json.optString("hlsUrl");
                    
                    new Handler(Looper.getMainLooper()).post(() -> {
                        if (hlsUrl != null && !hlsUrl.isEmpty()) {
                            MediaItem mediaItem = new MediaItem.Builder()
                                    .setUri(Uri.parse(hlsUrl))
                                    .setMimeType(MimeTypes.APPLICATION_M3U8)
                                    .build();
                            exoPlayer.setMediaItem(mediaItem);
                            exoPlayer.prepare();
                            exoPlayer.play();
                        } else {
                            Toast.makeText(SecureVideoActivity.this, "ERROR: Missing hlsUrl from Vercel API", Toast.LENGTH_LONG).show();
                        }
                    });
                } else {
                    new Handler(Looper.getMainLooper()).post(() -> {
                        Toast.makeText(SecureVideoActivity.this, "CLOUD DRM BLOCKED: Invalid Signature!", Toast.LENGTH_LONG).show();
                    });
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private boolean isAppCracked() {
        try {
            // DEV MODE: Bulletproof check for Android Studio Debug Builds
            boolean isDebug = (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            if (isDebug) {
                return false;
            }

            PackageInfo packageInfo = getPackageManager().getPackageInfo(getPackageName(), PackageManager.GET_SIGNATURES);
            for (Signature signature : packageInfo.signatures) {
                MessageDigest md = MessageDigest.getInstance("SHA-256");
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
                if (!currentSig.equals("2D:5A:49:71:E4:A2:72:20:52:91:C4:EC:4F:28:53:5F:C6:7F:D5:61:4E:06:CE:58:85:68:36:7E:62:F4:66:C4")) {
                    return true;
                }
            }
        } catch (Exception e) { return true; }
        
        
        return false;
    }

    private void startFloatingWatermark(String email) {
        if (watermarkText == null) return;
        watermarkText.setText(email);
        
        // FORCE ELEVATION TO FLOAT OVER EXOPLAYER
        watermarkText.setElevation(100f);
        watermarkText.bringToFront();
        watermarkText.setVisibility(View.VISIBLE);

        watermarkRunnable = new Runnable() {
            @Override
            public void run() {
                if (playerView != null && playerView.getWidth() > 0 && playerView.getHeight() > 0) {
                    int maxX = playerView.getWidth() - watermarkText.getWidth();
                    int maxY = playerView.getHeight() - watermarkText.getHeight();
                    if (maxX > 0 && maxY > 0) {
                        float randomX = (float) (Math.random() * maxX);
                        float randomY = (float) (Math.random() * maxY);
                        watermarkText.animate()
                            .x(randomX)
                            .y(randomY)
                            .setDuration(2500)
                            .start();
                    }
                }
                if (watermarkHandler != null) {
                    watermarkHandler.postDelayed(this, 3000);
                }
            }
        };
        watermarkHandler.post(watermarkRunnable);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (exoPlayer != null) {
            exoPlayer.release();
            exoPlayer = null;
        }
        if (watermarkHandler != null && watermarkRunnable != null) {
            watermarkHandler.removeCallbacks(watermarkRunnable);
        }
    }
}

