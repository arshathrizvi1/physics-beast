package com.physicsbeast.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * WorkManager Worker that syncs accumulated study time from SharedPreferences to Firebase Firestore.
 * Uses the Firestore REST API to avoid needing the full Firebase SDK in the worker context.
 * Runs every 3 hours via PeriodicWorkRequest and also on-demand via OneTimeWorkRequest.
 */
public class StudySyncWorker extends Worker {
    private static final String TAG = "StudySyncWorker";
    private static final String PREFS_NAME = "study_time_prefs";
    private static final String KEY_PENDING_MINUTES = "pending_study_minutes";
    private static final String KEY_PENDING_XP = "pending_xp";
    private static final String KEY_USER_UID = "study_user_uid";
    private static final String KEY_LAST_SYNC = "last_sync_timestamp";

    // Firebase project config
    private static final String FIREBASE_PROJECT_ID = "physics-beastsl";
    private static final String FIREBASE_API_KEY = "AIzaSyCHn_BSTqOSQVgKMfRqGn_ANjhLJXJk1mA";

    public StudySyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        SharedPreferences prefs = getApplicationContext()
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        int pendingMinutes = prefs.getInt(KEY_PENDING_MINUTES, 0);
        int pendingXp = prefs.getInt(KEY_PENDING_XP, 0);
        String uid = prefs.getString(KEY_USER_UID, "");

        if (pendingMinutes == 0 && pendingXp == 0) {
            Log.d(TAG, "Nothing to sync. Skipping.");
            return Result.success();
        }

        if (uid == null || uid.isEmpty()) {
            Log.w(TAG, "No user UID set. Cannot sync.");
            return Result.retry();
        }

        Log.d(TAG, "Syncing " + pendingMinutes + " minutes and " + pendingXp + " XP for user " + uid);

        try {
            boolean success = syncToFirestore(uid, pendingMinutes, pendingXp);
            if (success) {
                // Clear the pending counters
                prefs.edit()
                    .putInt(KEY_PENDING_MINUTES, 0)
                    .putInt(KEY_PENDING_XP, 0)
                    .putLong(KEY_LAST_SYNC, System.currentTimeMillis())
                    .apply();
                Log.d(TAG, "Sync successful. Cleared pending data.");
                return Result.success();
            } else {
                Log.w(TAG, "Sync failed. Will retry.");
                return Result.retry();
            }
        } catch (Exception e) {
            Log.e(TAG, "Sync error", e);
            return Result.retry();
        }
    }

    /**
     * Syncs study time to Firestore using the REST API.
     * Uses PATCH with fieldTransforms to atomically increment values.
     */
    private boolean syncToFirestore(String uid, int minutes, int xp) {
        HttpURLConnection conn = null;
        try {
            String todayStr = getTodayDateString();

            // Use Firestore REST API with commit endpoint for atomic increments
            String urlStr = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID
                + "/databases/(default)/documents:commit?key=" + FIREBASE_API_KEY;

            // Build the commit request with fieldTransforms for increment
            String jsonBody = "{"
                + "\"writes\": [{"
                + "  \"transform\": {"
                + "    \"document\": \"projects/" + FIREBASE_PROJECT_ID + "/databases/(default)/documents/users/" + uid + "\","
                + "    \"fieldTransforms\": ["
                + "      {\"fieldPath\": \"totalStudyTimeMins\", \"increment\": {\"integerValue\": \"" + minutes + "\"}},"
                + "      {\"fieldPath\": \"todayStudyTimeMins\", \"increment\": {\"integerValue\": \"" + minutes + "\"}},"
                + "      {\"fieldPath\": \"totalXp\", \"increment\": {\"integerValue\": \"" + xp + "\"}},"
                + "      {\"fieldPath\": \"studyHistory." + todayStr + "\", \"increment\": {\"integerValue\": \"" + minutes + "\"}}"
                + "    ]"
                + "  }"
                + "}]"
                + "}";

            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);

            OutputStream os = conn.getOutputStream();
            os.write(jsonBody.getBytes("UTF-8"));
            os.flush();
            os.close();

            int responseCode = conn.getResponseCode();
            Log.d(TAG, "Firestore response code: " + responseCode);

            return responseCode >= 200 && responseCode < 300;

        } catch (Exception e) {
            Log.e(TAG, "Firestore sync failed", e);
            return false;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private String getTodayDateString() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        sdf.setTimeZone(TimeZone.getDefault());
        return sdf.format(new Date());
    }
}
