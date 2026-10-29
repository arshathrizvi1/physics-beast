# How to Build the Brilliant Academy Flutter APK

This folder contains the complete, high-performance **native Flutter & Dart mobile application** for Brilliant Academy. It connects directly to your existing Firebase database and enforces all **7 security standards** natively.

---

### Prerequisites
1. **Flutter SDK**: [Download Flutter SDK](https://docs.flutter.dev/get-started/install/windows/mobile) (extract to e.g. `C:\src\flutter` and add its `bin` folder to your Windows System `PATH`).
2. **Android Studio**: Install Android Studio with **Flutter** and **Dart** plugins.

---

### Steps to Run and Build the APK in Android Studio:

1. **Open the Project:**
   * Launch **Android Studio**.
   * Click **Open** and select the folder:
     `D:\Projects\Brilliant Academy Website\brilliant_academy_flutter`

2. **Fetch Dependencies:**
   * Open the built-in terminal in Android Studio (or Windows Terminal in this folder) and run:
     ```bash
     flutter pub get
     ```

3. **Run on Device or Physical Phone:**
   * Connect an Android phone via USB (with USB Debugging turned on in developer settings).
   * Click the **Green Run (Play)** button in Android Studio, or execute:
     ```bash
     flutter run
     ```

4. **Build the Production Release APK:**
   * To build the optimized, standalone APK:
     ```bash
     flutter build apk --release
     ```
   * The final APK file will be generated at:
     `build/app/outputs/flutter-apk/app-release.apk`
   * To generate smaller, device-optimized APKs (recommended for students with low storage):
     ```bash
     flutter build apk --split-per-abi
     ```

---

### The 7 Security Standards Configured in this Project:
1. **Screen Capture & Screenshot Prevention (`FLAG_SECURE`)**: Set in `android/app/src/main/kotlin/com/brilliantacademy/app/MainActivity.kt` and `SecurityService.enableAntiScreenCapture()`.
2. **Anti-Root & Anti-Jailbreak**: Verified through `flutter_jailbreak_detection` and native C++ binary checks in `secure-player-lib.cpp`.
3. **Anti-Emulator & Simulator Shield**: Verified via `device_info_plus` and native hardware checks.
4. **Binary & Signature Verification**: Verifies SHA-256 certificate against the official release fingerprint (`05:40:26:4D:5C:48:BF:9F:...`).
5. **Anti-Debugging & DevTools Blocker**: Native C++ checks against LSPosed, Frida, and attached debuggers.
6. **Dynamic Moving Floating Watermark**: Overlays student email and UID with physics drift across all videos (`floating_watermark.dart`).
7. **Cloud Token DRM & Cryptographic URL Signing**: Native C++ HMAC SHA-256 video URL generator with timestamp expiry (`secure-player-lib.cpp`).
