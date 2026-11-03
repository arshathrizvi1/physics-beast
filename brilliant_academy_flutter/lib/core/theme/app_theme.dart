import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'app_tokens.dart';
import 'app_typography.dart';
import 'app_spacing.dart';

class AppTheme {
  static ThemeData buildTheme(AppTokens tokens, Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final textTheme = AppTypography.createTextTheme(
      tokens.textPrimary,
      tokens.textSecondary,
      tokens.textMuted,
    );

    final overlayStyle = SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
      statusBarBrightness: isDark ? Brightness.dark : Brightness.light,
      systemNavigationBarColor: tokens.bg,
      systemNavigationBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
      systemNavigationBarDividerColor: Colors.transparent,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: tokens.bg,
      primaryColor: tokens.gold,
      cardColor: tokens.surface,
      canvasColor: tokens.bg,
      dividerColor: tokens.border,
      extensions: [tokens],
      textTheme: textTheme,
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: tokens.gold,
        onPrimary: tokens.onGold,
        secondary: tokens.info,
        onSecondary: Colors.white,
        error: tokens.danger,
        onError: Colors.white,
        surface: tokens.surface,
        onSurface: tokens.textPrimary,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: tokens.bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: overlayStyle,
        iconTheme: IconThemeData(color: tokens.textPrimary),
        titleTextStyle: textTheme.headlineSmall?.copyWith(
          color: tokens.textPrimary,
          fontWeight: FontWeight.w700,
        ),
      ),
      cardTheme: CardThemeData(
        color: tokens.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.roundedLg,
          side: BorderSide(
            color: isDark ? tokens.border : Colors.transparent,
            width: 1,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: tokens.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: textTheme.bodySmall?.copyWith(color: tokens.textMuted),
        border: OutlineInputBorder(
          borderRadius: AppRadius.roundedMd,
          borderSide: BorderSide(color: tokens.border, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.roundedMd,
          borderSide: BorderSide(color: tokens.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.roundedMd,
          borderSide: BorderSide(color: tokens.gold, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.roundedMd,
          borderSide: BorderSide(color: tokens.danger, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: AppRadius.roundedMd,
          borderSide: BorderSide(color: tokens.danger, width: 1.5),
        ),
      ),
    );
  }

  static ThemeData get light => buildTheme(AppTokens.light, Brightness.light);
  static ThemeData get dark => buildTheme(AppTokens.dark, Brightness.dark);
}
