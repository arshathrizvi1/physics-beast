import 'package:flutter/material.dart';
import '../theme/theme_x.dart';
import '../theme/app_spacing.dart';

class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final Color? color;
  final Gradient? gradient;
  final Border? border;
  final BorderRadius? borderRadius;
  final List<BoxShadow>? boxShadow;

  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.margin,
    this.onTap,
    this.color,
    this.gradient,
    this.border,
    this.borderRadius,
    this.boxShadow,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final isDark = context.isDark;
    final radius = borderRadius ?? AppRadius.roundedLg;

    final defaultBorder = border ??
        Border.all(
          color: isDark ? tokens.border : tokens.border.withValues(alpha: 0.4),
          width: 1,
        );

    final defaultShadow = boxShadow ?? (isDark ? null : tokens.e1);

    Widget content = Container(
      margin: margin,
      decoration: BoxDecoration(
        color: gradient == null ? (color ?? tokens.surface) : null,
        gradient: gradient,
        borderRadius: radius,
        border: defaultBorder,
        boxShadow: defaultShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Padding(
            padding: padding,
            child: child,
          ),
        ),
      ),
    );

    return content;
  }
}
