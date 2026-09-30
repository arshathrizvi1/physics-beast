import sys

path_java = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\java\com\brilliantacademy\app\MainActivity.java'
with open(path_java, 'r', encoding='utf-8') as f:
    content_java = f.read()

content_java = content_java.replace(
    'public native String getCloudSignature(Object context, String videoId, String timestamp);',
    'public native String getCloudSignature(Object context, String videoId, String timestamp, String installer);'
)

content_java = content_java.replace(
    'return MainActivity.this.getCloudSignature(MainActivity.this, videoId, timestamp);',
    'return MainActivity.this.getCloudSignature(MainActivity.this, videoId, timestamp, getInstallerPackageName());'
)

with open(path_java, 'w', encoding='utf-8') as f:
    f.write(content_java)


path_cpp = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\cpp\secure-player-lib.cpp'
with open(path_cpp, 'r', encoding='utf-8') as f:
    content_cpp = f.read()

old_sig = 'Java_com_brilliantacademy_app_MainActivity_getCloudSignature(JNIEnv* env, jobject thiz, jobject context, jstring videoId, jstring timestamp) {'
new_sig = 'Java_com_brilliantacademy_app_MainActivity_getCloudSignature(JNIEnv* env, jobject thiz, jobject context, jstring videoId, jstring timestamp, jstring installerPackage) {'
content_cpp = content_cpp.replace(old_sig, new_sig)

old_bypass = '''    // --- BYPASS SIGNATURE CHECK FOR ANDROID STUDIO DEV BUILDS ---
    jmethodID getInstallerPackageNameMid = env->GetMethodID(packageManagerClass, "getInstallerPackageName", "(Ljava/lang/String;)Ljava/lang/String;");
    jstring installerPackage = (jstring) env->CallObjectMethod(packageManager, getInstallerPackageNameMid, packageName);
    std::string sInst = "";
    if (installerPackage != nullptr) {
        const char *inst = env->GetStringUTFChars(installerPackage, nullptr);
        sInst = inst;
        env->ReleaseStringUTFChars(installerPackage, inst);
    }
    
    if (currentSig != OFFICIAL_SIGNATURE) {
        if (sInst.empty()) {
            LOGE("DEV MODE: Signature mismatch ignored because app was installed via ADB (Android Studio).");
        } else {
            LOGE("NATIVE SECURITY ALERT: APP CRACKED! SENDING FAKE TOKEN TO CLOUD!");
            return env->NewStringUTF("CRACKED_APP_BLOCKED");
        }
    }'''

new_bypass = '''    // --- BYPASS SIGNATURE CHECK FOR ANDROID STUDIO DEV BUILDS ---
    std::string sInst = "";
    if (installerPackage != nullptr) {
        const char *inst = env->GetStringUTFChars(installerPackage, nullptr);
        if (inst != nullptr) {
            sInst = inst;
            env->ReleaseStringUTFChars(installerPackage, inst);
        }
    }
    
    if (currentSig != OFFICIAL_SIGNATURE) {
        if (sInst.empty()) {
            LOGE("DEV MODE: Signature mismatch ignored because app was installed via ADB (Android Studio).");
        } else {
            LOGE("NATIVE SECURITY ALERT: APP CRACKED! SENDING FAKE TOKEN TO CLOUD!");
            return env->NewStringUTF("CRACKED_APP_BLOCKED");
        }
    }'''

content_cpp = content_cpp.replace(old_bypass, new_bypass)

with open(path_cpp, 'w', encoding='utf-8') as f:
    f.write(content_cpp)

print("Java and C++ bridged successfully!")
