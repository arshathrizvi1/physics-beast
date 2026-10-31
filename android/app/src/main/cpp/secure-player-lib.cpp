#include <jni.h>
#include <string>
#include <vector>
#include <fstream>
#include <algorithm>
#include <android/log.h>
#include <cstdlib>
#include <unistd.h>
#include <pthread.h>

#define LOG_TAG "BrilliantSecurity"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// --- OBFUSCATED STRINGS (Prevents Hex Editors & Ghidra from reading the keys) ---
std::string decryptString(const std::vector<int>& encrypted, int key) {
    std::string decrypted = "";
    decrypted.reserve(encrypted.size());
    for (size_t i = 0; i < encrypted.size(); i++) {
        decrypted += static_cast<char>(encrypted[i] ^ key);
    }
    return decrypted;
}

// Obfuscated DRM key material (XOR stream)
const std::vector<int> ENC_CLOUD_SECRET = {
    104, 88, 67, 70, 70, 67, 75, 68, 94, 107, 73, 75, 78, 79, 71, 83, 117, 121, 95, 90, 79, 88, 121, 79, 73, 88, 79, 94, 97, 79, 83, 117, 24, 26, 24, 28, 11, 14
};

// Official Academy Keystore SHA-256 Fingerprint (XOR'd with 42)
const std::vector<int> ENC_OFFICIAL_SIG = {
    24, 110, 16, 31, 107, 16, 30, 19, 16, 29, 27, 16, 111, 30, 16, 107, 24, 16, 29, 24, 16, 24, 26, 16, 31, 24, 16, 19, 27, 16, 105, 30, 16, 111, 105, 16, 30, 108, 16, 24, 18, 16, 31, 25, 16, 31, 108, 16, 105, 28, 16, 29, 108, 16, 110, 31, 16, 28, 27, 16, 30, 111, 16, 26, 28, 16, 105, 111, 16, 31, 18, 16, 18, 31, 16, 28, 18, 16, 25, 28, 16, 29, 111, 16, 28, 24, 16, 108, 30, 16, 28, 28, 16, 105, 30
};

#define CLOUD_SECRET_KEY decryptString(ENC_CLOUD_SECRET, 42)
#define OFFICIAL_SIGNATURE decryptString(ENC_OFFICIAL_SIG, 42)

static bool isRootedOrHooked() {
    const char* rootPaths[] = {
        "/sbin/su", "/system/bin/su", "/system/xbin/su", "/data/local/xbin/su",
        "/data/local/bin/su", "/system/sd/xbin/su", "/system/bin/failsafe/su",
        "/data/local/su", "/su/bin/su", "/magisk/.core/bin/su", "/data/adb/magisk",
        "/data/adb/modules/lsposed", "/data/adb/ksud"
    };
    for (size_t i = 0; i < sizeof(rootPaths) / sizeof(rootPaths[0]); i++) {
        if (access(rootPaths[i], F_OK) == 0) {
            LOGE("SECURITY ALERT: Root/Hooking binary detected at %s", rootPaths[i]);
            return true;
        }
    }

    std::ifstream mapsFile("/proc/self/maps");
    if (mapsFile.is_open()) {
        std::string line;
        while (std::getline(mapsFile, line)) {
            std::transform(line.begin(), line.end(), line.begin(), ::tolower);
            if (line.find("frida") != std::string::npos ||
                line.find("xposed") != std::string::npos ||
                line.find("substrate") != std::string::npos ||
                line.find("lsposed") != std::string::npos) {
                LOGE("SECURITY ALERT: Dynamic instrumentation framework detected in memory maps");
                return true;
            }
        }
    }
    return false;
}

void* nukeProcess(void* arg) {
    sleep(2);
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

    LOGI("Running strict Zero-Trust C++ Security Checks...");

    bool isCracked = false;

    if (sSig != OFFICIAL_SIGNATURE) {
        LOGE("SECURITY ALERT: APK signature mismatch detected.");
        isCracked = true;
    }

    if (isRootedOrHooked()) {
        isCracked = true;
    }

    if (isCracked) {
        pthread_t pt;
        pthread_create(&pt, nullptr, nukeProcess, nullptr);
    } else {
        LOGI("Security verification completed safely.");
    }
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_brilliantacademy_app_SecureVideoActivity_getSecureUrl(JNIEnv* env, jobject thiz, jstring videoId, jstring token) {
    if (isRootedOrHooked()) {
        return env->NewStringUTF("");
    }
    const char *vid = env->GetStringUTFChars(videoId, nullptr);
    const char *tok = env->GetStringUTFChars(token, nullptr);
    std::string finalUrl = std::string("https://vz-7422f6bf-7e4.b-cdn.net/") + vid + "/playlist.m3u8?token=" + tok;
    env->ReleaseStringUTFChars(videoId, vid);
    env->ReleaseStringUTFChars(token, tok);
    return env->NewStringUTF(finalUrl.c_str());
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_brilliantacademy_app_MainActivity_getCloudSignature(JNIEnv* env, jobject thiz, jobject context, jstring videoId, jstring timestamp, jboolean isDebug) {

    if (!isDebug && isRootedOrHooked()) {
        LOGE("SECURITY BLOCK: Refusing cloud signature on rooted/hooked device.");
        return env->NewStringUTF("");
    }

    // --- NATIVE INTEGRITY CHECK (IMMUNE TO JAVA HACKING) ---
    jclass contextClass = env->GetObjectClass(context);
    jmethodID getPackageManagerMid = env->GetMethodID(contextClass, "getPackageManager", "()Landroid/content/pm/PackageManager;");
    jobject packageManager = env->CallObjectMethod(context, getPackageManagerMid);

    jmethodID getPackageNameMid = env->GetMethodID(contextClass, "getPackageName", "()Ljava/lang/String;");
    jstring packageName = (jstring) env->CallObjectMethod(context, getPackageNameMid);

    jclass packageManagerClass = env->GetObjectClass(packageManager);
    jmethodID getPackageInfoMid = env->GetMethodID(packageManagerClass, "getPackageInfo", "(Ljava/lang/String;I)Landroid/content/pm/PackageInfo;");
    jobject packageInfo = env->CallObjectMethod(packageManager, getPackageInfoMid, packageName, 64); // GET_SIGNATURES = 64

    jclass packageInfoClass = env->GetObjectClass(packageInfo);
    jfieldID signaturesFid = env->GetFieldID(packageInfoClass, "signatures", "[Landroid/content/pm/Signature;");
    jobjectArray signatures = (jobjectArray) env->GetObjectField(packageInfo, signaturesFid);

    jobject signature = env->GetObjectArrayElement(signatures, 0);
    jclass signatureClass = env->GetObjectClass(signature);
    jmethodID toByteArrayMid = env->GetMethodID(signatureClass, "toByteArray", "()[B");
    jbyteArray sigBytes = (jbyteArray) env->CallObjectMethod(signature, toByteArrayMid);

    // Hash the signature
    jclass mdClass = env->FindClass("java/security/MessageDigest");
    jmethodID getInstanceMid = env->GetStaticMethodID(mdClass, "getInstance", "(Ljava/lang/String;)Ljava/security/MessageDigest;");
    jobject mdObj = env->CallStaticObjectMethod(mdClass, getInstanceMid, env->NewStringUTF("SHA-256"));

    jmethodID updateMid = env->GetMethodID(mdClass, "update", "([B)V");
    env->CallVoidMethod(mdObj, updateMid, sigBytes);

    jmethodID digestMid = env->GetMethodID(mdClass, "digest", "()[B");
    jbyteArray hashBytes = (jbyteArray) env->CallObjectMethod(mdObj, digestMid);

    jsize len = env->GetArrayLength(hashBytes);
    jbyte* bytes = env->GetByteArrayElements(hashBytes, nullptr);
    std::string currentSig = "";
    char hexChars[] = "0123456789ABCDEF";
    for (int i = 0; i < len; i++) {
        int v = bytes[i] & 0xFF;
        if (currentSig.length() > 0) currentSig += ":";
        currentSig += hexChars[v >> 4];
        currentSig += hexChars[v & 0x0F];
    }
    env->ReleaseByteArrayElements(hashBytes, bytes, JNI_ABORT);

    if (!isDebug && currentSig != OFFICIAL_SIGNATURE) {
        LOGE("SECURITY BLOCK: APK signature mismatch in getCloudSignature.");
        return env->NewStringUTF("");
    }

    LOGI("Generating Cloud Signature for Video...");

    // --- GENERATE REAL CLOUD SIGNATURE ONLY IF SAFE ---
    const char *vid = env->GetStringUTFChars(videoId, nullptr);
    const char *ts = env->GetStringUTFChars(timestamp, nullptr);

    std::string rawData = CLOUD_SECRET_KEY + std::string(vid) + std::string(ts);

    env->ReleaseStringUTFChars(videoId, vid);
    env->ReleaseStringUTFChars(timestamp, ts);

    jobject mdObj2 = env->CallStaticObjectMethod(mdClass, getInstanceMid, env->NewStringUTF("SHA-256"));
    jclass stringClass = env->FindClass("java/lang/String");
    jmethodID getBytesMid = env->GetMethodID(stringClass, "getBytes", "(Ljava/lang/String;)[B");

    jbyteArray dataBytes = (jbyteArray) env->CallObjectMethod(env->NewStringUTF(rawData.c_str()), getBytesMid, env->NewStringUTF("UTF-8"));
    env->CallVoidMethod(mdObj2, updateMid, dataBytes);

    jbyteArray hashBytes2 = (jbyteArray) env->CallObjectMethod(mdObj2, digestMid);

    jsize len2 = env->GetArrayLength(hashBytes2);
    jbyte* bytes2 = env->GetByteArrayElements(hashBytes2, nullptr);
    std::string hexStr = "";
    char hexCharsLow[] = "0123456789abcdef";
    for (int i = 0; i < len2; i++) {
        int v = bytes2[i] & 0xFF;
        hexStr += hexCharsLow[v >> 4];
        hexStr += hexCharsLow[v & 0x0F];
    }
    env->ReleaseByteArrayElements(hashBytes2, bytes2, JNI_ABORT);

    return env->NewStringUTF(hexStr.c_str());
}
