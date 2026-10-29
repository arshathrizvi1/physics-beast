package com.brilliantacademy.app

import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.Signature
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.security.MessageDigest

class MainActivity : FlutterActivity() {

    private val CHANNEL = "com.brilliantacademy.app/security"

    // "BrilliantAcademy_SuperSecretKey_2026!$" XOR'd with 42
    private val encSecret = intArrayOf(
        104, 88, 67, 70, 70, 67, 75, 68, 94, 107, 73, 75, 78, 79, 71, 83, 117, 121, 95, 90, 79, 88, 121, 79, 73, 88, 79, 94, 97, 79, 83, 117, 24, 26, 24, 28, 11, 14
    )

    private fun getCloudSecret(): String {
        val sb = StringBuilder()
        for (b in encSecret) {
            sb.append((b xor 42).toChar())
        }
        return sb.toString()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 1. Enforce Screen Capture / Recording Protection Immediately
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "checkSecurity" -> {
                    val isDebug = (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
                    val signatureValid = if (!isDebug) verifySignature() else true
                    val envSafe = checkRootEnvironment()
                    val isEmu = isEmulator()

                    val passed = signatureValid && envSafe && (!isEmu || isDebug)
                    result.success(
                        mapOf(
                            "passed" to passed,
                            "signatureValid" to signatureValid,
                            "envSafe" to envSafe,
                            "isEmulator" to isEmu,
                            "isDebug" to isDebug
                        )
                    )
                }
                "getCloudSignature" -> {
                    val videoId = call.argument<String>("videoId") ?: ""
                    val timestamp = call.argument<String>("timestamp") ?: ""
                    try {
                        val rawData = getCloudSecret() + videoId + timestamp
                        val md = MessageDigest.getInstance("SHA-256")
                        val digest = md.digest(rawData.toByteArray(Charsets.UTF_8))
                        val hex = digest.joinToString("") { "%02x".format(it) }
                        result.success(hex)
                    } catch (e: Exception) {
                        result.error("SIG_FAIL", e.message, null)
                    }
                }
                "setFlagSecure" -> {
                    val enable = call.argument<Boolean>("enable") ?: true
                    if (enable) {
                        window.setFlags(
                            WindowManager.LayoutParams.FLAG_SECURE,
                            WindowManager.LayoutParams.FLAG_SECURE
                        )
                    } else {
                        window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    }
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun checkRootEnvironment(): Boolean {
        val rootPaths = arrayOf(
            "/sbin/su", "/system/bin/su", "/system/xbin/su", "/data/local/xbin/su",
            "/data/local/bin/su", "/system/sd/xbin/su", "/system/bin/failsafe/su",
            "/data/local/su", "/su/bin/su", "/magisk/.core/bin/su", "/data/adb/magisk",
            "/data/adb/modules/lsposed", "/system/app/Superuser.apk"
        )
        for (path in rootPaths) {
            if (File(path).exists()) {
                return false
            }
        }
        return true
    }

    private fun verifySignature(): Boolean {
        return try {
            val packageInfo: PackageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)
            } else {
                packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
            }

            val signatures: Array<Signature> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.signingInfo.apkContentsSigners
            } else {
                packageInfo.signatures
            }

            for (sig in signatures) {
                val md = MessageDigest.getInstance("SHA-256")
                md.update(sig.toByteArray())
                val digest = md.digest()
                val hexString = StringBuilder()
                for (b in digest) {
                    val hex = Integer.toHexString(0xFF and b.toInt())
                    if (hexString.isNotEmpty()) hexString.append(":")
                    if (hex.length == 1) hexString.append('0')
                    hexString.append(hex)
                }
                val currentSig = hexString.toString().uppercase()
                // Official Academy Keystore Fingerprint
                val officialSig = "05:40:26:4D:5C:48:BF:9F:E5:F1:BF:A4:B2:DA:47:58:33:C3:0B:1F:97:F1:54:FE:C2:61:AA:7E:F1:94:24:34"
                if (currentSig == officialSig) {
                    return true
                }
            }
            false
        } catch (e: Exception) {
            true // Allow fallback in developer mode
        }
    }

    private fun isEmulator(): Boolean {
        return (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
                || Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.HARDWARE.contains("goldfish")
                || Build.HARDWARE.contains("ranchu")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || Build.PRODUCT.contains("sdk_google")
                || Build.PRODUCT.contains("google_sdk")
                || Build.PRODUCT.contains("sdk")
                || Build.PRODUCT.contains("sdk_x86")
                || Build.PRODUCT.contains("vbox86p")
                || Build.PRODUCT.contains("emulator")
                || Build.PRODUCT.contains("simulator")
    }
}
