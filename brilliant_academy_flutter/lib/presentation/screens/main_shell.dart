import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/theme_x.dart';
import '../../core/widgets/app_bottom_nav.dart';
import '../../core/widgets/app_dialog.dart';
import '../../services/auth_service.dart';
import 'home/home_screen.dart';
import 'courses/courses_screen.dart';
import 'live/live_screen.dart';
import 'exams/exams_screen.dart';
import 'profile/profile_screen.dart';
import 'auth/login_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;
  StreamSubscription<String>? _sessionSub;

  late final List<Widget> _screens = [
    HomeScreen(onExploreCourses: () => setState(() => _currentIndex = 1)),
    CoursesScreen(),
    LiveScreen(),
    ExamsScreen(),
    ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    final authService = Provider.of<AuthService>(context, listen: false);
    _sessionSub = authService.onSessionRevoked.listen((reason) {
      _showSessionRevokedDialog(reason);
    });
  }

  void _showSessionRevokedDialog(String reason) {
    if (!mounted) return;
    showAppDialog(
      context: context,
      title: "Session Terminated",
      message: reason,
      icon: Icons.devices_rounded,
      iconColor: context.tokens.danger,
      confirmText: "Sign In Again",
      onConfirm: () {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      },
    );
  }

  @override
  void dispose() {
    _sessionSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    return PopScope(
      canPop: _currentIndex == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _currentIndex != 0) {
          setState(() => _currentIndex = 0);
        }
      },
      child: Scaffold(
        backgroundColor: tokens.bg,
        body: Stack(
          children: [
            // Screen contents
            Positioned.fill(
              child: IndexedStack(
                index: _currentIndex,
                children: _screens,
              ),
            ),

            // Floating Navigation Bar (Adapts smoothly to Light and Dark mode)
            Positioned(
              left: 0,
              right: 0,
              bottom: 12,
              child: SafeArea(
                top: false,
                child: AppBottomNav(
                  currentIndex: _currentIndex,
                  onTabSelected: (index) {
                    setState(() => _currentIndex = index);
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
