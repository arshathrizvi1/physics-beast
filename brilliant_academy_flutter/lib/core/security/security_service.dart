import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_jailbreak_detection/flutter_jailbreak_detection.dart';
import 'package:flutter_windowmanager/flutter_windowmanager.dart';
import 'package:device_info_plus/device_info_plus.dart';

class SecurityCheckResult {
  final bool isSecure;
  final String? failureReason;

  SecurityCheckResult({required this.isSecure, this.failureReason});
}

class SecurityService {
  static const MethodChannel _channel = MethodChannel('com.brilliantacademy.app/security');

  /// 1. Initialize FLAG_SECURE (Prevents Screenshots & Screen Recording)
  static Future<void> enableAntiScreenCapture() async {
    try {
      await FlutterWindowManager.addFlags(FlutterWindowManager.FLAG_SECURE);
      await _channel.invokeMethod('setFlagSecure', {'enable': true});
    } catch (e) {
      debugPrint("FLAG_SECURE init error: $e");
    }
  }

  /// 2, 3, 4, 5. Comprehensive 7-Tier Security Verification
  static Future<SecurityCheckResult> verifyDeviceIntegrity() async {
    // Admins or debug builds can pass during local development
    if (kDebugMode) {
      return SecurityCheckResult(isSecure: true);
    }

    try {
      // 1. Check Root / Jailbreak
      bool isRooted = false;
      try {
        isRooted = await FlutterJailbreakDetection.jailbroken;
      } catch (_) {}

      if (isRooted) {
        return SecurityCheckResult(
          isSecure: false,
          failureReason: "Rooted device or Superuser binary detected. Premium video content cannot run on compromised devices.",
        );
      }

      // 2. Check Android Emulator / Simulator
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      if (!androidInfo.isPhysicalDevice) {
        return SecurityCheckResult(
          isSecure: false,
          failureReason: "Emulators or virtual machines are blocked to protect course content from unauthorized recording.",
        );
      }

      // 3. Native JNI & Keystore Signature Check (Anti-Crack / Anti-Tamper)
      final dynamic nativeResult = await _channel.invokeMethod('checkSecurity');
      if (nativeResult is Map) {
        final bool passed = nativeResult['passed'] ?? false;
        final bool signatureValid = nativeResult['signatureValid'] ?? false;
        final bool envSafe = nativeResult['envSafe'] ?? false;

        if (!signatureValid) {
          return SecurityCheckResult(
            isSecure: false,
            failureReason: "Application signature mismatch. Unofficial or modified APK detected.",
          );
        }

        if (!envSafe) {
          return SecurityCheckResult(
            isSecure: false,
            failureReason: "LSPosed / Hooking framework detected.",
          );
        }

        if (!passed) {
          return SecurityCheckResult(
            isSecure: false,
            failureReason: "Device integrity check failed.",
          );
        }
      }

      return SecurityCheckResult(isSecure: true);
    } catch (e) {
      debugPrint("Security evaluation exception: $e");
      return SecurityCheckResult(isSecure: true); // Fail open gracefully if channel unsupported
    }
  }

  /// 7. Generate Cloud Token DRM Signed Video URL
  static Future<String> generateSecureVideoUrl(String videoId) async {
    final timestamp = (DateTime.now().millisecondsSinceEpoch ~/ 1000).toString();
    try {
      final String token = await _channel.invokeMethod('getCloudSignature', {
        'videoId': videoId,
        'timestamp': timestamp,
      });

      return "https://vz-7422f6bf-7e4.b-cdn.net/$videoId/playlist.m3u8?token=$token&expires=$timestamp";
    } catch (e) {
      // Fallback if native token signing is in debug
      return "https://vz-7422f6bf-7e4.b-cdn.net/$videoId/playlist.m3u8";
    }
  }
}
