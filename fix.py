import sys

# 1. Fix secure-player-lib.cpp
path_cpp = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\cpp\secure-player-lib.cpp'
with open(path_cpp, 'r', encoding='utf-8') as f:
    content_cpp = f.read()

old_cpp = '''    // IF HACKER CHANGED APK SIGNATURE, DESTROY THE CLOUD REQUEST!
    if (currentSig != OFFICIAL_SIGNATURE) {
        LOGE("NATIVE SECURITY ALERT: APP CRACKED! SENDING FAKE TOKEN TO CLOUD!");
        return env->NewStringUTF("CRACKED_APP_BLOCKED");
    }'''

new_cpp = '''    // --- BYPASS SIGNATURE CHECK FOR ANDROID STUDIO DEV BUILDS ---
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

if old_cpp in content_cpp:
    with open(path_cpp, 'w', encoding='utf-8') as f:
        f.write(content_cpp.replace(old_cpp, new_cpp))
    print("Fixed secure-player-lib.cpp")
else:
    print("Could not find old_cpp block")

# 2. Fix page.tsx
path_tsx = r'C:\Projects\Brilliant Academy\physics-beast\src\app\course\[id]\page.tsx'
with open(path_tsx, 'r', encoding='utf-8') as f:
    content_tsx = f.read()

old_tsx = '''                        <>
                          {activeServer === 'bunny' && activeVideo.platform === 'bunny' && (
                            <iframe 
                              src={bunnyEmbedUrl || activeVideo.url} 
                              className="w-full h-full border-0 relative z-[50]"
                              allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                              allowFullScreen={true}
                            />
                          )}'''

new_tsx = '''                        <>
                          {activeServer === 'bunny' && activeVideo.platform === 'bunny' && (
                            bunnyEmbedUrl === 'CRACKED' ? (
                                <div className="w-full h-full bg-black flex flex-col items-center justify-center p-6 text-center pointer-events-auto relative z-[60]">
                                    <h3 className="text-2xl font-bold text-red-600 mb-2">APP INTEGRITY COMPROMISED</h3>
                                    <p className="text-zinc-400">Video playback has been permanently blocked due to unauthorized modification of the app.</p>
                                </div>
                            ) : (
                                <iframe 
                                  src={bunnyEmbedUrl || activeVideo.url} 
                                  className="w-full h-full border-0 relative z-[50]"
                                  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                                  allowFullScreen={true}
                                />
                            )
                          )}'''

if old_tsx in content_tsx:
    with open(path_tsx, 'w', encoding='utf-8') as f:
        f.write(content_tsx.replace(old_tsx, new_tsx))
    print("Fixed page.tsx")
else:
    print("Could not find old_tsx block")
