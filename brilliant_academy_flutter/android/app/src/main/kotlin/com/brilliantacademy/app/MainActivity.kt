package com.brilliantacademy.app

import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.Signature
import android.os.Build
import android.os.Bundle
import android.os.Debug
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.BufferedReader
import java.io.File
import java.io.FileReader
import java.security.MessageDigest

class MainActivity : FlutterActivity() {

    private val CHANNEL = "com.brilliantacademy.app/security"

    // Obfuscated DRM signing key material (XOR stream)
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
        // Screenshots allowed for development as requested
        window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }

    override fun onResume() {
        super.onResume()
        // Screenshots allowed for development as requested
        window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        // Screenshots allowed for development as requested
        window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "checkSecurity" -> {
                    val isDebug = (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
                    val signatureValid = if (!isDebug) verifySignature() else true
                    val envSafe = checkRootEnvironment() && !isDebuggerOrHookAttached(isDebug)
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
                    val isDebug = (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
                    val signatureValid = if (!isDebug) verifySignature() else true
                    val envSafe = checkRootEnvironment() && !isDebuggerOrHookAttached(isDebug)
                    if (!signatureValid || !envSafe) {
                        result.error("COMPROMISED_DEVICE", "Zero-Trust Device Integrity check failed.", null)
                        return@setMethodCallHandler
                    }

                    val videoId = call.argument<String>("videoId") ?: ""
                    val timestamp = call.argument<String>("timestamp") ?: ""
                    if (videoId.isBlank() || timestamp.isBlank()) {
                        result.error("INVALID_ARGS", "Missing videoId or timestamp", null)
                        return@setMethodCallHandler
                    }
                    try {
                        val rawData = getCloudSecret() + videoId + timestamp
                        val md = MessageDigest.getInstance("SHA-256")
                        val digest = md.digest(rawData.toByteArray(Charsets.UTF_8))
                        val hex = digest.joinToString("") { "%02x".format(it) }
                        result.success(hex)
                    } catch (e: Exception) {
                        result.error("SIG_FAIL", "Signature generation failed", null)
                    }
                }
                "setFlagSecure" -> {
                    val enable = call.argument<Boolean>("enable") ?: false
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
        if (Build.TAGS != null && Build.TAGS.contains("test-keys")) {
            return false
        }
        val rootPaths = arrayOf(
            "/sbin/su", "/system/bin/su", "/system/xbin/su", "/data/local/xbin/su",
            "/data/local/bin/su", "/system/sd/xbin/su", "/system/bin/failsafe/su",
            "/data/local/su", "/su/bin/su", "/magisk/.core/bin/su", "/data/adb/magisk",
            "/data/adb/modules/lsposed", "/system/app/Superuser.apk", "/data/adb/ksud"
        )
        for (path in rootPaths) {
            if (File(path).exists()) {
                return false
            }
        }
        return true
    }

    private fun isDebuggerOrHookAttached(isDebugBuild: Boolean): Boolean {
        if (!isDebugBuild && (Debug.isDebuggerConnected() || Debug.waitingForDebugger())) {
            return true
        }
        // Native ptrace attach detection (TracerPid != 0)
        try {
            BufferedReader(FileReader("/proc/self/status")).use { reader ->
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    if (line!!.startsWith("TracerPid:")) {
                        val pid = line!!.substringAfter("TracerPid:").trim().toIntOrNull() ?: 0
                        if (pid != 0 && !isDebugBuild) return true
                        break
                    }
                }
            }
        } catch (_: Exception) {}
        try {
            BufferedReader(FileReader("/proc/self/maps")).use { reader ->
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    val lower = line!!.lowercase()
                    if (lower.contains("frida") ||
                        lower.contains("xposed") ||
                        lower.contains("substrate") ||
                        lower.contains("lsposed")
                    ) {
                        return true
                    }
                }
            }
        } catch (_: Exception) {
            // Ignore unreadable /proc/self/maps on restricted SELinux profiles
        }
        return false
    }

    private fun verifySignature(): Boolean {
        return try {
            val packageInfo: PackageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES)
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
            }

            val signatures: Array<Signature> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.signingInfo?.apkContentsSigners ?: emptyArray()
            } else {
                @Suppress("DEPRECATION")
                packageInfo.signatures ?: emptyArray()
            }

            // Official Academy Keystore Fingerprint
            val officialSig = "05:40:26:4D:5C:48:BF:9F:E5:F1:BF:A4:B2:DA:47:58:33:C3:0B:1F:97:F1:54:FE:C2:61:AA:7E:F1:94:24:34"

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
                if (currentSig == officialSig) {
                    return true
                }
            }
            false
        } catch (e: Exception) {
            // Fail-closed: never grant signature validity on exception
            false
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
