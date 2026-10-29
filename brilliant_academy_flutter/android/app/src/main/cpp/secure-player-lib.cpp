#include <jni.h>
#include <string>
#include <vector>
#include <android/log.h>
#include <cstdlib>
#include <unistd.h>

#define LOG_TAG "BrilliantSecurity"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// Obfuscated string decoder
std::string decryptString(std::vector<int> encrypted, int key) {
    std::string decrypted = "";
    for (size_t i = 0; i < encrypted.size(); i++) {
        decrypted += (char)(encrypted[i] ^ key);
    }
    return decrypted;
}

// "BrilliantAcademy_SuperSecretKey_2026!$" XOR'd with 42
const std::vector<int> ENC_CLOUD_SECRET = {
    104, 88, 67, 70, 70, 67, 75, 68, 94, 107, 73, 75, 78, 79, 71, 83, 117, 121, 95, 90, 79, 88, 121, 79, 73, 88, 79, 94, 97, 79, 83, 117, 24, 26, 24, 28, 11, 14
};

// Official release signing certificate SHA-256 XOR'd with 42
const std::vector<int> ENC_OFFICIAL_SIG = {
    24, 110, 16, 31, 107, 16, 30, 19, 16, 29, 27, 16, 111, 30, 16, 107, 24, 16, 29, 24, 16, 24, 26, 16, 31, 24, 16, 19, 27, 16, 105, 30, 16, 111, 105, 16, 30, 108, 16, 24, 18, 16, 31, 25, 16, 31, 108, 16, 105, 28, 16, 29, 108, 16, 110, 31, 16, 28, 27, 16, 30, 111, 16, 26, 28, 16, 105, 111, 16, 31, 18, 16, 18, 31, 16, 28, 18, 16, 25, 28, 16, 29, 111, 16, 28, 24, 16, 108, 30, 16, 28, 28, 16, 105, 30
};

#define CLOUD_SECRET_KEY decryptString(ENC_CLOUD_SECRET, 42)
#define OFFICIAL_SIGNATURE decryptString(ENC_OFFICIAL_SIG, 42)

extern "C" JNIEXPORT jboolean JNICALL
Java_com_brilliantacademy_app_MainActivity_nativeCheckEnvironment(
        JNIEnv* env,
        jobject thiz) {
    // 1. Root & Hooking checks in C++
    const char* rootPaths[] = {
        "/sbin/su", "/system/bin/su", "/system/xbin/su", "/data/local/xbin/su",
        "/data/local/bin/su", "/system/sd/xbin/su", "/system/bin/failsafe/su",
        "/data/local/su", "/su/bin/su", "/magisk/.core/bin/su", "/data/adb/magisk",
        "/data/adb/modules/lsposed", "/system/app/Superuser.apk"
    };

    for (int i = 0; i < 13; i++) {
        if (access(rootPaths[i], F_OK) == 0) {
            LOGE("SECURITY ALERT: Root or LSPosed binary detected at %s", rootPaths[i]);
            return JNI_FALSE;
        }
    }
    return JNI_TRUE;
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_brilliantacademy_app_MainActivity_nativeGetCloudSignature(
        JNIEnv* env,
        jobject thiz,
        jstring videoId,
        jstring timestamp) {

    const char *vid = env->GetStringUTFChars(videoId, nullptr);
    const char *ts = env->GetStringUTFChars(timestamp, nullptr);

    std::string rawData = CLOUD_SECRET_KEY + std::string(vid) + std::string(ts);

    env->ReleaseStringUTFChars(videoId, vid);
    env->ReleaseStringUTFChars(timestamp, ts);

    jclass mdClass = env->FindClass("java/security/MessageDigest");
    jmethodID getInstanceMid = env->GetStaticMethodID(mdClass, "getInstance", "(Ljava/lang/String;)Ljava/security/MessageDigest;");
    jobject mdObj = env->CallStaticObjectMethod(mdClass, getInstanceMid, env->NewStringUTF("SHA-256"));

    jclass stringClass = env->FindClass("java/lang/String");
    jmethodID getBytesMid = env->GetMethodID(stringClass, "getBytes", "(Ljava/lang/String;)[B");
    jbyteArray dataBytes = (jbyteArray) env->CallObjectMethod(env->NewStringUTF(rawData.c_str()), getBytesMid, env->NewStringUTF("UTF-8"));

    jmethodID updateMid = env->GetMethodID(mdClass, "update", "([B)V");
    env->CallVoidMethod(mdObj, updateMid, dataBytes);

    jmethodID digestMid = env->GetMethodID(mdClass, "digest", "()[B");
    jbyteArray hashBytes = (jbyteArray) env->CallObjectMethod(mdObj, digestMid);

    jsize len = env->GetArrayLength(hashBytes);
    jbyte* bytes = env->GetByteArrayElements(hashBytes, nullptr);

    std::string hexStr = "";
    char hexCharsLow[] = "0123456789abcdef";
    for (int i = 0; i < len; i++) {
        int v = bytes[i] & 0xFF;
        hexStr += hexCharsLow[v >> 4];
        hexStr += hexCharsLow[v & 0x0F];
    }
    env->ReleaseByteArrayElements(hashBytes, bytes, JNI_ABORT);

    return env->NewStringUTF(hexStr.c_str());
}
