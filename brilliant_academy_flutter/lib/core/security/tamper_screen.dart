import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../constants/app_colors.dart';

class TamperScreen extends StatelessWidget {
  final String reason;
  final String? violationType;

  const TamperScreen({
    super.key,
    this.reason = "Security integrity check failed. The environment does not meet academy protection standards.",
    this.violationType,
  });

  @override
  Widget build(BuildContext context) {
    final isSideload = violationType == 'SIDELOAD_REJECTED';

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0C),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 36.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Alert Icon Badge
                Container(
                  width: 92,
                  height: 92,
                  decoration: BoxDecoration(
                    color: isSideload
                        ? const Color(0xFFF59E0B).withValues(alpha: 0.12)
                        : AppColors.danger.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSideload
                          ? const Color(0xFFF59E0B).withValues(alpha: 0.35)
                          : AppColors.danger.withValues(alpha: 0.35),
                      width: 2,
                    ),
                  ),
                  child: Icon(
                    isSideload ? Icons.download_for_offline_rounded : Icons.shield_outlined,
                    size: 48,
                    color: isSideload ? const Color(0xFFF59E0B) : AppColors.danger,
                  ),
                ),
                const SizedBox(height: 24),

                // Title
                Text(
                  isSideload ? "Direct APK Sideload Blocked" : "Security Violation Detected",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isSideload ? const Color(0xFFF59E0B) : AppColors.danger,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 14),

                // Detailed reason
                Text(
                  reason,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFFD4D4D8),
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 24),

                // Info card
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF141418),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF27272A)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.info_outline_rounded,
                        size: 20,
                        color: isSideload ? const Color(0xFFF59E0B) : AppColors.textMuted,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          isSideload
                              ? "To protect teachers' proprietary copyright and examination integrity, APK packages downloaded from web browsers or file managers cannot be run."
                              : "This Zero-Trust policy protects academy lectures and examination papers against reverse-engineering and cracked modifications.",
                          style: const TextStyle(
                            color: Color(0xFFA1A1AA),
                            fontSize: 12,
                            height: 1.45,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 36),

                // Exit Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {
                      SystemNavigator.pop();
                      exit(0);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isSideload ? const Color(0xFFD97706) : AppColors.danger,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: const Text(
                      "Exit Application",
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
