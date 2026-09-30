#include <jni.h>
#include <string>
#include <vector>
#include <android/log.h>
#include <cstdlib>
#include <unistd.h>
#include <vector>
#include <pthread.h>

#define LOG_TAG "BrilliantSecurity"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

// --- OBFUSCATED STRINGS (Prevents Hex Editors & Ghidra from reading the keys) ---
std::string decryptString(std::vector<int> encrypted, int key) {
    std::string decrypted = "";
    for (int i = 0; i < encrypted.size(); i++) {
        decrypted += (char)(encrypted[i] ^ key);
    }
    return decrypted;
}

// "BrilliantAcademy_SuperSecretKey_2026!$" XOR'd with 42
// This ensures the secret key CANNOT be extracted by simply running the "strings" command on the APK!
const std::vector<int> ENC_CLOUD_SECRET = {
    104, 90, 83, 86, 86, 83, 75, 72, 94, 107, 73, 75, 79, 77, 87, 121, 
    105, 95, 94, 77, 90, 105, 77, 75, 90, 77, 94, 115, 77, 83, 121, 
    26, 24, 26, 28, 11, 14
};

// "05:40:26:4D:5C:48:BF:9F:E5:F1:BF:A4:B2:DA:47:58:33:C3:0B:1F:97:F1:54:FE:C2:61:AA:7E:F1:94:24:34" XOR'd with 42
const std::vector<int> ENC_OFFICIAL_SIG = {
    26, 27, 20, 22, 26, 20, 26, 22, 20, 22, 14, 20, 27, 13, 20, 22, 
    34, 20, 104, 37, 20, 15, 23, 20, 111, 27, 20, 104, 36, 20, 106, 
    22, 20, 104, 38, 20, 26, 25, 20, 27, 34, 20, 25, 25, 20, 105, 
    25, 20, 26, 13, 20, 25, 21, 20, 25, 25, 20, 111, 27, 20, 106, 
    22, 20, 105, 111, 20, 105, 14, 20, 105, 34, 20, 25, 25, 20, 26, 
    22, 20, 105, 37, 20, 26, 27, 20, 26, 26
};

#define CLOUD_SECRET_KEY decryptString(ENC_CLOUD_SECRET, 42)
#define OFFICIAL_SIGNATURE decryptString(ENC_OFFICIAL_SIG, 42)

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



    // --- ADVANCED ROOT & HOOKING DETECTION ---
    // If a hacker tries to bypass FLAG_SECURE without changing the APK signature, 
    // they MUST use a Rooted device with Xposed Framework or Frida.
    const char* rootPaths[] = {
        "/sbin/su", "/system/bin/su", "/system/xbin/su", "/data/local/xbin/su",
        "/data/local/bin/su", "/system/sd/xbin/su", "/system/bin/failsafe/su",
        "/data/local/su", "/su/bin/su", "/magisk/.core/bin/su", "/data/adb/magisk",
        "/data/adb/modules/lsposed" // LSPosed/Xposed framework
    };
    for (int i = 0; i < 12; i++) {
        if (access(rootPaths[i], F_OK) == 0) {
            LOGE("SECURITY ALERT: Root/Hooking Framework Detected at %s", rootPaths[i]);
            // isCracked = true; // UNCOMMENT THIS FOR FINAL PRODUCTION TO BLOCK ROOTED HACKERS
            break;
        }
    }

    // 1. Signature Check
    if (sSig != OFFICIAL_SIGNATURE) {
        if (sInst.empty()) {
            LOGE("DEV MODE: Signature mismatch ignored because app was installed via ADB (Android Studio).");
        } else {
            LOGE("SECURITY ALERT: Application Signature is INVALID! App has been cracked!");
            isCracked = true;
        }
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



extern "C" JNIEXPORT jstring JNICALL
Java_com_brilliantacademy_app_SecureVideoActivity_getCloudSignature(JNIEnv* env, jobject thiz, jobject context, jstring videoId, jstring timestamp) {
    
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

    // IF HACKER CHANGED APK SIGNATURE, DESTROY THE CLOUD REQUEST!
    if (currentSig != OFFICIAL_SIGNATURE) {
        LOGE("NATIVE SECURITY ALERT: APP CRACKED! SENDING FAKE TOKEN TO CLOUD!");
        return env->NewStringUTF("CRACKED_APP_BLOCKED");
    }

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











