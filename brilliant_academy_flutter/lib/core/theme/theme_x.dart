import 'package:flutter/material.dart';
import 'app_tokens.dart';

extension ThemeX on BuildContext {
  /// Direct access to design tokens (colors, gradients, shadows)
  AppTokens get tokens {
    final t = Theme.of(this).extension<AppTokens>();
    assert(t != null, "AppTokens extension is missing from ThemeData");
    return t ?? (isDark ? AppTokens.dark : AppTokens.light);
  }

  /// Direct access to typography scale
  TextTheme get text => Theme.of(this).textTheme;

  /// Whether current theme is dark
  bool get isDark => Theme.of(this).brightness == Brightness.dark;

  /// Screen dimensions and insets
  MediaQueryData get mediaQuery => MediaQuery.of(this);
  double get screenWidth => mediaQuery.size.width;
  double get screenHeight => mediaQuery.size.height;
  double get topPadding => mediaQuery.padding.top;
  double get bottomPadding => mediaQuery.padding.bottom;
}
