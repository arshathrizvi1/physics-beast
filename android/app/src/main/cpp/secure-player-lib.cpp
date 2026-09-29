#include <jni.h>
#include <string>
#include <android/log.h>
#include <cstdlib>

#define LOG_TAG "BrilliantSecurity"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// The exact SHA-256 Signature Hash of your official Windows Keystore
const std::string OFFICIAL_SIGNATURE = "05:40:26:4D:5C:48:BF:9F:E5:F1:BF:A4:B2:DA:47:58:33:C3:0B:1F:97:F1:54:FE:C2:61:AA:7E:F1:94:24:34";

extern "C" JNIEXPORT void JNICALL
Java_com_brilliantacademy_app_MainActivity_nativeVerifySecurity(
        JNIEnv* env,
        jobject thiz,
        jstring currentSignature,
        jstring installerPackage) {
        
    const char *sig = env->GetStringUTFChars(currentSignature, nullptr);
    const char *installer = env->GetStringUTFChars(installerPackage, nullptr);
    
    std::string sSig(sig != nullptr ? sig : "");
    std::string sInst(installer != nullptr ? installer : "");
    
    env->ReleaseStringUTFChars(currentSignature, sig);
    env->ReleaseStringUTFChars(installerPackage, installer);

    bool isCracked = false;

    // 1. Verify Signature (Anti-Tamper)
    if (sSig != OFFICIAL_SIGNATURE) {
        LOGE("SECURITY ALERT: Application Signature is INVALID! App has been cracked!");
        isCracked = true;
    }

    // 2. Verify Installer (Anti-Sideloading / Shareit)
    // Allowed: Google Play Store (com.android.vending), ADB (null or empty for developers)
    if (!sInst.empty() && sInst != "com.android.vending") {
        LOGE("SECURITY ALERT: Application was sideloaded via %s! Shareit/APKPure blocked!", sInst.c_str());
        isCracked = true;
    }

    if (isCracked) {
        // Find the Java class to show the Toast error message before crashing
        jclass activityClass = env->GetObjectClass(thiz);
        jmethodID showTamperAlert = env->GetMethodID(activityClass, "showTamperAlertAndCrash", "()V");
        if (showTamperAlert != nullptr) {
            env->CallVoidMethod(thiz, showTamperAlert);
        }
        
        // Wait 2 seconds for the Toast to show, then fatally crash the C++ layer
        // This is unrecoverable and cannot be easily bypassed by Java modders
        exit(0); 
    }
    
    LOGI("Security Check Passed. App is authentic.");
}

// Future Video Player Methods go here
extern "C" JNIEXPORT jstring JNICALL
Java_com_brilliantacademy_app_SecureVideoActivity_getSecureUrl(
        JNIEnv* env,
        jobject thiz,
        jstring videoId,
        jstring token) {
    const char *vid = env->GetStringUTFChars(videoId, nullptr);
    const char *tok = env->GetStringUTFChars(token, nullptr);
    std::string finalUrl = std::string("https://vz-7422f6bf-7e4.b-cdn.net/") + vid + "/playlist.m3u8?token=" + tok;
    env->ReleaseStringUTFChars(videoId, vid);
    env->ReleaseStringUTFChars(token, tok);
    return env->NewStringUTF(finalUrl.c_str());
}