package com.physicsbeast.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StudyTime")
public class StudyTimePlugin extends Plugin {
    private static final String TAG = "StudyTimePlugin";
    private static final String PREFS_NAME = "study_time_prefs";
    private static final String KEY_PENDING_MINUTES = "pending_study_minutes";
    private static final String KEY_PENDING_XP = "pending_xp";
    private static final String KEY_USER_UID = "study_user_uid";
    private static final String KEY_LAST_SYNC = "last_sync_timestamp";

    private SharedPreferences getPrefs() {
        return getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void recordMinute(PluginCall call) {
        SharedPreferences prefs = getPrefs();
        int current = prefs.getInt(KEY_PENDING_MINUTES, 0);
        int currentXp = prefs.getInt(KEY_PENDING_XP, 0);
        prefs.edit()
            .putInt(KEY_PENDING_MINUTES, current + 1)
            .putInt(KEY_PENDING_XP, currentXp + 1) // XP_PER_STUDY_MINUTE = 1
            .apply();
        
        JSObject ret = new JSObject();
        ret.put("pendingMinutes", current + 1);
        ret.put("pendingXp", currentXp + 1);
        Log.d(TAG, "Recorded study minute. Pending: " + (current + 1));
        call.resolve(ret);
    }

    @PluginMethod
    public void getPendingMinutes(PluginCall call) {
        SharedPreferences prefs = getPrefs();
        int pending = prefs.getInt(KEY_PENDING_MINUTES, 0);
        int pendingXp = prefs.getInt(KEY_PENDING_XP, 0);
        long lastSync = prefs.getLong(KEY_LAST_SYNC, 0);
        
        JSObject ret = new JSObject();
        ret.put("pendingMinutes", pending);
        ret.put("pendingXp", pendingXp);
        ret.put("lastSync", lastSync);
        call.resolve(ret);
    }

    @PluginMethod
    public void setUserId(PluginCall call) {
        String uid = call.getString("uid", "");
        if (uid == null || uid.isEmpty()) {
            call.reject("uid is required");
            return;
        }
        getPrefs().edit().putString(KEY_USER_UID, uid).apply();
        Log.d(TAG, "Set user UID: " + uid);
        call.resolve();
    }

    @PluginMethod
    public void syncNow(PluginCall call) {
        // Trigger an immediate one-shot WorkManager sync
        try {
            androidx.work.OneTimeWorkRequest syncWork =
                new androidx.work.OneTimeWorkRequest.Builder(StudySyncWorker.class)
                    .build();
            androidx.work.WorkManager.getInstance(getContext())
                .enqueue(syncWork);
            Log.d(TAG, "Immediate sync enqueued");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to enqueue immediate sync", e);
            call.reject("Failed to enqueue sync: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearPending(PluginCall call) {
        getPrefs().edit()
            .putInt(KEY_PENDING_MINUTES, 0)
            .putInt(KEY_PENDING_XP, 0)
            .putLong(KEY_LAST_SYNC, System.currentTimeMillis())
            .apply();
        Log.d(TAG, "Pending study time cleared");
        call.resolve();
    }
}
