import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTypography {
  static TextTheme createTextTheme(Color textPrimary, Color textSecondary, Color textMuted) {
    // Heading font: Plus Jakarta Sans (with Inter fallback)
    TextStyle heading(double size, double height, FontWeight weight, Color color, [double? letterSpacing]) {
      try {
        return GoogleFonts.plusJakartaSans(
          fontSize: size,
          height: height,
          fontWeight: weight,
          color: color,
          letterSpacing: letterSpacing,
        );
      } catch (_) {
        return TextStyle(
          fontFamily: 'sans-serif',
          fontSize: size,
          height: height,
          fontWeight: weight,
          color: color,
          letterSpacing: letterSpacing,
        );
      }
    }

    // Body font: Inter
    TextStyle body(double size, double height, FontWeight weight, Color color, [double? letterSpacing]) {
      try {
        return GoogleFonts.inter(
          fontSize: size,
          height: height,
          fontWeight: weight,
          color: color,
          letterSpacing: letterSpacing,
        );
      } catch (_) {
        return TextStyle(
          fontFamily: 'sans-serif',
          fontSize: size,
          height: height,
          fontWeight: weight,
          color: color,
          letterSpacing: letterSpacing,
        );
      }
    }

    return TextTheme(
      displayLarge: heading(30, 1.15, FontWeight.w800, textPrimary, -0.5),
      displayMedium: heading(26, 1.2, FontWeight.w800, textPrimary, -0.4),
      displaySmall: heading(24, 1.2, FontWeight.w800, textPrimary, -0.3),
      headlineMedium: heading(20, 1.25, FontWeight.w700, textPrimary, -0.2),
      headlineSmall: heading(18, 1.3, FontWeight.w700, textPrimary),
      titleLarge: heading(17, 1.3, FontWeight.w700, textPrimary),
      titleMedium: body(15, 1.4, FontWeight.w600, textPrimary),
      titleSmall: body(14, 1.4, FontWeight.w600, textSecondary),
      bodyLarge: body(16, 1.45, FontWeight.w400, textPrimary),
      bodyMedium: body(15, 1.45, FontWeight.w400, textSecondary),
      bodySmall: body(13, 1.35, FontWeight.w500, textMuted),
      labelLarge: body(13, 1.3, FontWeight.w600, textPrimary, 0.2),
      labelMedium: body(12, 1.2, FontWeight.w600, textSecondary, 0.3),
      labelSmall: body(12, 1.2, FontWeight.w600, textMuted, 0.4),
    );
  }
}
