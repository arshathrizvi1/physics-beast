import 'package:flutter/material.dart';

class AppColors {
  static const Color background = Color(0xFF09090B);
  static const Color surface = Color(0xFF121216);
  static const Color card = Color(0xFF18181D);
  static const Color cardBorder = Color(0x33D4AF37); // Website golden border
  static const Color cardBorderMuted = Color(0xFF26262D);

  // Brand Accents - Exact Website Royal Gold Palette
  static const Color gold = Color(0xFFD4AF37);
  static const Color goldLight = Color(0xFFF9E596);
  static const Color goldYellow = Color(0xFFFFD700);
  static const Color goldDark = Color(0xFFB5952F);
  
  static const Color cyan = Color(0xFF38BDF8);
  static const Color emerald = Color(0xFF10B981);
  static const Color danger = Color(0xFFEF4444);

  // Text
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA1A1AA);
  static const Color textMuted = Color(0xFF71717A);
  
  // Gradients
  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFFFFD700), Color(0xFFD4AF37), Color(0xFFFDB931)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldButtonGradient = LinearGradient(
    colors: [Color(0xFFD4AF37), Color(0xFFF9E596)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF1A1A1F), Color(0xFF121216)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient headerGradient = LinearGradient(
    colors: [Color(0xFF111111), Color(0xFF2B2417), Color(0xFF1A1A1F)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
