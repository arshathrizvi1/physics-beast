import 'package:flutter/material.dart';
import '../theme/theme_x.dart';
import '../theme/app_spacing.dart';

enum AppBadgeVariant { gold, live, success, info, neutral }

class AppBadge extends StatelessWidget {
  final String text;
  final AppBadgeVariant variant;
  final Widget? icon;
  final EdgeInsetsGeometry padding;

  const AppBadge({
    super.key,
    required this.text,
    this.variant = AppBadgeVariant.neutral,
    this.icon,
    this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final textStyle = context.text;
    final isDark = context.isDark;

    Color bg;
    Color fg;
    Color border;

    switch (variant) {
      case AppBadgeVariant.gold:
        bg = tokens.gold.withValues(alpha: isDark ? 0.18 : 0.12);
        fg = tokens.goldText;
        border = tokens.gold.withValues(alpha: 0.35);
        break;
      case AppBadgeVariant.live:
        bg = tokens.live.withValues(alpha: isDark ? 0.2 : 0.12);
        fg = tokens.live;
        border = tokens.live.withValues(alpha: 0.4);
        break;
      case AppBadgeVariant.success:
        bg = tokens.success.withValues(alpha: isDark ? 0.2 : 0.12);
        fg = tokens.success;
        border = tokens.success.withValues(alpha: 0.4);
        break;
      case AppBadgeVariant.info:
        bg = tokens.info.withValues(alpha: isDark ? 0.2 : 0.12);
        fg = tokens.info;
        border = tokens.info.withValues(alpha: 0.4);
        break;
      case AppBadgeVariant.neutral:
        bg = tokens.surfaceAlt;
        fg = tokens.textSecondary;
        border = tokens.border;
        break;
    }

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppRadius.roundedPill,
        border: Border.all(color: border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            icon!,
            const SizedBox(width: 5),
          ],
          Text(
            text,
            style: textStyle.labelMedium?.copyWith(
              color: fg,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
