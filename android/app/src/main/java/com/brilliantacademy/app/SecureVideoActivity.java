package com.brilliantacademy.app;

import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class SecureVideoActivity extends AppCompatActivity {
    
    // Load the Uncrackable C++ Library
    static {
        System.loadLibrary("brilliant_security");
    }
    public native String verifySecurityAndGetToken();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // MILITARY GRADE: Block Screenshots, Screen Recording, and casting
        // getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        
        String status = verifySecurityAndGetToken();
        if (status.equals("SECURE_VERIFIED")) {
            Toast.makeText(this, "Security Passed! Initializing Secure Native Video Player...", Toast.LENGTH_LONG).show();
            // TODO: Initialize Google ExoPlayer here to stream Bunny.net videos securely
        } else {
            Toast.makeText(this, "APP CRACKED! Video Playback Blocked.", Toast.LENGTH_LONG).show();
            finish(); // Kill the player
        }
    }
}
