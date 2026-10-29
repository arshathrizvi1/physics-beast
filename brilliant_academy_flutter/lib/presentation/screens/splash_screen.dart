import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/security/security_service.dart';
import '../../core/security/tamper_screen.dart';
import '../../services/auth_service.dart';
import 'auth/login_screen.dart';
import 'main_shell.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  String _statusMessage = "Securing application environment...";

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    // 1. Enforce FLAG_SECURE
    await SecurityService.enableAntiScreenCapture();

    setState(() {
      _statusMessage = "Verifying 7-Tier Security Standards...";
    });

    await Future.delayed(const Duration(milliseconds: 600));

    // 2. Evaluate Device Integrity (Root, Emulator, Signature, DevTools)
    final securityResult = await SecurityService.verifyDeviceIntegrity();

    if (!securityResult.isSecure) {
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => TamperScreen(
            reason: securityResult.failureReason ?? "Security integrity check failed.",
          ),
        ),
      );
      return;
    }

    setState(() {
      _statusMessage = "Loading student academy session...";
    });

    await Future.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;

    final auth = Provider.of<AuthService>(context, listen: false);

    if (auth.isAuthenticated) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const MainShell()),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Academy Logo Container
            Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                gradient: AppColors.goldGradient,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.gold.withOpacity(0.35),
                    blurRadius: 24,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: const Icon(
                Icons.school_rounded,
                size: 48,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              "BRILLIANT ACADEMY",
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              "Sri Lanka's Premier Advanced Level Learning Platform",
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 48),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                color: AppColors.gold,
                strokeWidth: 2.5,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _statusMessage,
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
