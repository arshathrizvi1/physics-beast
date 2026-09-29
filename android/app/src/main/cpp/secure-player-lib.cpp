#include <jni.h>
#include <string>
#include <android/log.h>
#include <cstdlib>
#include <unistd.h>
#include <pthread.h>

#define LOG_TAG "BrilliantSecurity"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

const std::string OFFICIAL_SIGNATURE = "05:40:26:4D:5C:48:BF:9F:E5:F1:BF:A4:B2:DA:47:58:33:C3:0B:1F:97:F1:54:FE:C2:61:AA:7E:F1:94:24:34";

void* nukeProcess(void* arg) {
    sleep(3); 
    exit(0);  
    return nullptr;
}

extern "C" JNIEXPORT void JNICALL
Java_com_brilliantacademy_app_MainActivity_nativeVerifySecurity(
        JNIEnv* env,
        jobject thiz,
        jstring currentSignature,
        jstring installerPackage) {
        
    const char *sig = env->GetStringUTFChars(currentSignature, nullptr);
    const char *installer = installerPackage != nullptr ? env->GetStringUTFChars(installerPackage, nullptr) : "";
    
    std::string sSig(sig != nullptr ? sig : "");
    std::string sInst(installer != nullptr ? installer : "");
    
    env->ReleaseStringUTFChars(currentSignature, sig);
    if (installerPackage != nullptr && installer[0] != '\0') { 
        env->ReleaseStringUTFChars(installerPackage, installer); 
    }

    LOGI("Running strict C++ Security Checks...");
    
    bool isCracked = false;

    // 1. Signature Check
    if (sSig != OFFICIAL_SIGNATURE) {
        LOGE("SECURITY ALERT: Application Signature is INVALID! App has been cracked!");
        isCracked = true;
    }

    // 2. Installer Check
    // ALLOW: "" (ADB / Android Studio)
    // ALLOW: "com.android.vending" (Google Play Store)
    // BLOCK: Everything else (ShareIt, WhatsApp, MIUI File Manager, etc.)
    if (!sInst.empty() && sInst != "com.android.vending") {
        LOGE("SECURITY ALERT: Application was sideloaded via %s!", sInst.c_str());
        isCracked = true;
    }

    if (isCracked) {
        jclass activityClass = env->GetObjectClass(thiz);
        jmethodID showTamperAlert = env->GetMethodID(activityClass, "showTamperAlertAndCrash", "()V");
        if (showTamperAlert != nullptr) {
            env->CallVoidMethod(thiz, showTamperAlert);
        }
        
        pthread_t threadId;
        pthread_create(&threadId, nullptr, nukeProcess, nullptr);
        pthread_detach(threadId);
    }
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_brilliantacademy_app_SecureVideoActivity_getSecureUrl(JNIEnv* env, jobject thiz, jstring videoId, jstring token) {
    const char *vid = env->GetStringUTFChars(videoId, nullptr);
    const char *tok = env->GetStringUTFChars(token, nullptr);
    std::string finalUrl = std::string("https://vz-7422f6bf-7e4.b-cdn.net/") + vid + "/playlist.m3u8?token=" + tok;
    env->ReleaseStringUTFChars(videoId, vid);
    env->ReleaseStringUTFChars(token, tok);
    return env->NewStringUTF(finalUrl.c_str());
}