import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:device_info_plus/device_info_plus.dart';

class SecurityCheckResult {
  final bool isSecure;
  final String? failureReason;

  SecurityCheckResult({required this.isSecure, this.failureReason});
}

class SecurityService {
  static const MethodChannel _channel = MethodChannel('com.brilliantacademy.app/security');

  /// 1. AntiScreenCapture (Screenshots allowed for development)
  static Future<void> enableAntiScreenCapture() async {
    // Disabled in development to allow screenshots and screencaps
    return;
  }

  /// 2, 3, 4, 5. Comprehensive Zero-Trust Device Integrity Verification (Fail-Closed)
  static Future<SecurityCheckResult> verifyDeviceIntegrity() async {
    if (kDebugMode) {
      return SecurityCheckResult(isSecure: true);
    }

    try {
      // 1. Check Android Emulator / Simulator via device info
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      if (!androidInfo.isPhysicalDevice) {
        return SecurityCheckResult(
          isSecure: false,
          failureReason: "Emulators or virtual machines are blocked to protect course content from unauthorized recording.",
        );
      }

      // 2. Native Root, Hooking & Keystore Signature Check
      final dynamic nativeResult = await _channel.invokeMethod('checkSecurity');
      if (nativeResult is! Map) {
        return SecurityCheckResult(
          isSecure: false,
          failureReason: "Native security bridge did not return a valid attestation payload.",
        );
      }

      final bool passed = nativeResult['passed'] == true;
      final bool signatureValid = nativeResult['signatureValid'] == true;
      final bool envSafe = nativeResult['envSafe'] == true;

      if (!signatureValid) {
        return SecurityCheckResult(
          isSecure: false,
          failureReason: "Application signature mismatch. Unofficial or modified APK detected.",
        );
      }

      if (!envSafe) {
        return SecurityCheckResult(
          isSecure: false,
          failureReason: "Rooted device, Frida/Xposed hook, or Superuser binary detected. Premium video content cannot run on compromised devices.",
        );
      }

      if (!passed) {
        return SecurityCheckResult(
          isSecure: false,
          failureReason: "Zero-Trust device integrity check failed.",
        );
      }

      return SecurityCheckResult(isSecure: true);
    } catch (e) {
      debugPrint("Security evaluation exception (Fail-Closed): $e");
      return SecurityCheckResult(
        isSecure: false,
        failureReason: "Unable to verify device security posture.",
      );
    }
  }

  /// 7. Generate Cloud Token DRM Signed Video URL
  static Future<String> generateSecureVideoUrl(String videoId) async {
    final timestamp = (DateTime.now().millisecondsSinceEpoch ~/ 1000).toString();
    try {
      final String? token = await _channel.invokeMethod<String>('getCloudSignature', {
        'videoId': videoId,
        'timestamp': timestamp,
      });

      if (token == null || token.isEmpty) {
        throw PlatformException(code: 'EMPTY_SIG', message: 'Empty DRM signature returned');
      }

      return "https://vz-7422f6bf-7e4.b-cdn.net/$videoId/playlist.m3u8?token=$token&expires=$timestamp";
    } catch (e) {
      if (kDebugMode) {
        return "https://vz-7422f6bf-7e4.b-cdn.net/$videoId/playlist.m3u8";
      }
      throw StateError("DRM signature generation refused on untrusted device.");
    }
  }
}
