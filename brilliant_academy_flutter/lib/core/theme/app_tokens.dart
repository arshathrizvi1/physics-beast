import 'package:flutter/material.dart';

@immutable
class AppTokens extends ThemeExtension<AppTokens> {
  final Color bg;
  final Color surface;
  final Color surfaceAlt;
  final Color border;
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;
  final Color gold;
  final Color goldText;
  final Color onGold;
  final Color success;
  final Color danger;
  final Color live;
  final Color info;

  // Subject Accents
  final Color subjectPhysics;
  final Color subjectMaths;
  final Color subjectChemistry;
  final Color subjectIct;
  final Color subjectBiology;

  // Gradients
  final LinearGradient goldGradient;
  final LinearGradient liveGradient;

  // Shadows
  final List<BoxShadow> e1;
  final List<BoxShadow> e2;
  final List<BoxShadow> goldGlow;

  const AppTokens({
    required this.bg,
    required this.surface,
    required this.surfaceAlt,
    required this.border,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.gold,
    required this.goldText,
    required this.onGold,
    required this.success,
    required this.danger,
    required this.live,
    required this.info,
    required this.subjectPhysics,
    required this.subjectMaths,
    required this.subjectChemistry,
    required this.subjectIct,
    required this.subjectBiology,
    required this.goldGradient,
    required this.liveGradient,
    required this.e1,
    required this.e2,
    required this.goldGlow,
  });

  static const light = AppTokens(
    bg: Color(0xFFFAF8F3),
    surface: Color(0xFFFFFFFF),
    surfaceAlt: Color(0xFFF3EFE6),
    border: Color(0xFFE8E1D0),
    textPrimary: Color(0xFF14120B),
    textSecondary: Color(0xFF5B5546),
    textMuted: Color(0xFF8A8372),
    gold: Color(0xFFC9A227),
    goldText: Color(0xFF8A6A0E),
    onGold: Color(0xFF1A1405),
    success: Color(0xFF047857),
    danger: Color(0xFFDC2626),
    live: Color(0xFFE11D48),
    info: Color(0xFF0284C7),
    subjectPhysics: Color(0xFFC9A227),
    subjectMaths: Color(0xFF0284C7),
    subjectChemistry: Color(0xFF047857),
    subjectIct: Color(0xFF7C3AED),
    subjectBiology: Color(0xFFDB2777),
    goldGradient: LinearGradient(
      colors: [Color(0xFFE9C84A), Color(0xFFC9A227)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
    liveGradient: LinearGradient(
      colors: [Color(0xFFE11D48), Color(0xFFBE123C)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
    e1: [
      BoxShadow(
        color: Color(0x0F14120B),
        blurRadius: 12,
        offset: Offset(0, 2),
      ),
    ],
    e2: [
      BoxShadow(
        color: Color(0x1A14120B),
        blurRadius: 28,
        offset: Offset(0, 8),
      ),
    ],
    goldGlow: [
      BoxShadow(
        color: Color(0x33C9A227),
        blurRadius: 16,
        offset: Offset(0, 4),
      ),
    ],
  );

  static const dark = AppTokens(
    bg: Color(0xFF0B0B0E),
    surface: Color(0xFF131318),
    surfaceAlt: Color(0xFF1A1A21),
    border: Color(0xFF2A2A33),
    textPrimary: Color(0xFFF5F3EC),
    textSecondary: Color(0xFFA8A59A),
    textMuted: Color(0xFF77746B),
    gold: Color(0xFFD4AF37),
    goldText: Color(0xFFF2D675),
    onGold: Color(0xFF1A1405),
    success: Color(0xFF34D399),
    danger: Color(0xFFF87171),
    live: Color(0xFFFB7185),
    info: Color(0xFF38BDF8),
    subjectPhysics: Color(0xFFD4AF37),
    subjectMaths: Color(0xFF38BDF8),
    subjectChemistry: Color(0xFF34D399),
    subjectIct: Color(0xFFA78BFA),
    subjectBiology: Color(0xFFF472B6),
    goldGradient: LinearGradient(
      colors: [Color(0xFFF2D675), Color(0xFFD4AF37)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
    liveGradient: LinearGradient(
      colors: [Color(0xFFFB7185), Color(0xFFE11D48)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
    e1: [
      BoxShadow(
        color: Color(0x33000000),
        blurRadius: 10,
        offset: Offset(0, 2),
      ),
    ],
    e2: [
      BoxShadow(
        color: Color(0x66000000),
        blurRadius: 24,
        offset: Offset(0, 8),
      ),
    ],
    goldGlow: [
      BoxShadow(
        color: Color(0x33D4AF37),
        blurRadius: 16,
        offset: Offset(0, 4),
      ),
    ],
  );

  @override
  AppTokens copyWith({
    Color? bg,
    Color? surface,
    Color? surfaceAlt,
    Color? border,
    Color? textPrimary,
    Color? textSecondary,
    Color? textMuted,
    Color? gold,
    Color? goldText,
    Color? onGold,
    Color? success,
    Color? danger,
    Color? live,
    Color? info,
    Color? subjectPhysics,
    Color? subjectMaths,
    Color? subjectChemistry,
    Color? subjectIct,
    Color? subjectBiology,
    LinearGradient? goldGradient,
    LinearGradient? liveGradient,
    List<BoxShadow>? e1,
    List<BoxShadow>? e2,
    List<BoxShadow>? goldGlow,
  }) {
    return AppTokens(
      bg: bg ?? this.bg,
      surface: surface ?? this.surface,
      surfaceAlt: surfaceAlt ?? this.surfaceAlt,
      border: border ?? this.border,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textMuted: textMuted ?? this.textMuted,
      gold: gold ?? this.gold,
      goldText: goldText ?? this.goldText,
      onGold: onGold ?? this.onGold,
      success: success ?? this.success,
      danger: danger ?? this.danger,
      live: live ?? this.live,
      info: info ?? this.info,
      subjectPhysics: subjectPhysics ?? this.subjectPhysics,
      subjectMaths: subjectMaths ?? this.subjectMaths,
      subjectChemistry: subjectChemistry ?? this.subjectChemistry,
      subjectIct: subjectIct ?? this.subjectIct,
      subjectBiology: subjectBiology ?? this.subjectBiology,
      goldGradient: goldGradient ?? this.goldGradient,
      liveGradient: liveGradient ?? this.liveGradient,
      e1: e1 ?? this.e1,
      e2: e2 ?? this.e2,
      goldGlow: goldGlow ?? this.goldGlow,
    );
  }

  @override
  AppTokens lerp(ThemeExtension<AppTokens>? other, double t) {
    if (other is! AppTokens) return this;
    return AppTokens(
      bg: Color.lerp(bg, other.bg, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceAlt: Color.lerp(surfaceAlt, other.surfaceAlt, t)!,
      border: Color.lerp(border, other.border, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      gold: Color.lerp(gold, other.gold, t)!,
      goldText: Color.lerp(goldText, other.goldText, t)!,
      onGold: Color.lerp(onGold, other.onGold, t)!,
      success: Color.lerp(success, other.success, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      live: Color.lerp(live, other.live, t)!,
      info: Color.lerp(info, other.info, t)!,
      subjectPhysics: Color.lerp(subjectPhysics, other.subjectPhysics, t)!,
      subjectMaths: Color.lerp(subjectMaths, other.subjectMaths, t)!,
      subjectChemistry: Color.lerp(subjectChemistry, other.subjectChemistry, t)!,
      subjectIct: Color.lerp(subjectIct, other.subjectIct, t)!,
      subjectBiology: Color.lerp(subjectBiology, other.subjectBiology, t)!,
      goldGradient: LinearGradient.lerp(goldGradient, other.goldGradient, t)!,
      liveGradient: LinearGradient.lerp(liveGradient, other.liveGradient, t)!,
      e1: BoxShadow.lerpList(e1, other.e1, t)!,
      e2: BoxShadow.lerpList(e2, other.e2, t)!,
      goldGlow: BoxShadow.lerpList(goldGlow, other.goldGlow, t)!,
    );
  }

  Color getSubjectColor(String subject) {
    final s = subject.toLowerCase();
    if (s.contains('physic')) return subjectPhysics;
    if (s.contains('math')) return subjectMaths;
    if (s.contains('chem')) return subjectChemistry;
    if (s.contains('ict') || s.contains('tech')) return subjectIct;
    if (s.contains('bio')) return subjectBiology;
    return gold;
  }
}
