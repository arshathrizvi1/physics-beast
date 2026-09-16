package com.physicsbeast.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";
    private static final String PERIODIC_SYNC_WORK_NAME = "study_time_periodic_sync";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && (
            Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction()) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())
        )) {
            Log.d(TAG, "Device booted! Syncing pending study time and re-scheduling periodic sync.");

            // 1. Trigger an immediate one-shot sync of any pending study time
            SharedPreferences prefs = context.getSharedPreferences("study_time_prefs", Context.MODE_PRIVATE);
            int pending = prefs.getInt("pending_study_minutes", 0);
            if (pending > 0) {
                Log.d(TAG, "Found " + pending + " pending minutes. Triggering immediate sync.");
                OneTimeWorkRequest immediateSyncWork =
                    new OneTimeWorkRequest.Builder(StudySyncWorker.class).build();
                WorkManager.getInstance(context).enqueue(immediateSyncWork);
            }

            // 2. Re-schedule the periodic 3-hour sync
            PeriodicWorkRequest periodicSync =
                new PeriodicWorkRequest.Builder(StudySyncWorker.class, 3, TimeUnit.HOURS)
                    .build();
            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    PERIODIC_SYNC_WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    periodicSync
                );
            Log.d(TAG, "Periodic study sync re-scheduled (every 3 hours).");
        }
    }
}
