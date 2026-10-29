import 'package:flutter/material.dart';

class AppColors {
  static const Color background = Color(0xFF09090B);
  static const Color surface = Color(0xFF121217);
  static const Color card = Color(0xFF181820);
  static const Color cardBorder = Color(0xFF272733);

  // Brand Accents
  static const Color gold = Color(0xFFF59E0B);
  static const Color goldLight = Color(0xFFFBBF24);
  static const Color goldDark = Color(0xFFB45309);
  
  static const Color cyan = Color(0xFF38BDF8);
  static const Color emerald = Color(0xFF10B981);
  static const Color danger = Color(0xFFEF4444);

  // Text
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA1A1AA);
  static const Color textMuted = Color(0xFF71717A);
  
  // Gradients
  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFFDE047)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF181822), Color(0xFF121218)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
