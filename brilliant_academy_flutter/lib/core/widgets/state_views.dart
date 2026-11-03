import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../theme/theme_x.dart';
import '../theme/app_spacing.dart';
import 'app_buttons.dart';

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final String? actionText;
  final VoidCallback? onAction;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionText,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: tokens.surfaceAlt,
                shape: BoxShape.circle,
                border: Border.all(color: tokens.border),
              ),
              child: Icon(icon, size: 28, color: tokens.textMuted),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              title,
              style: text.titleMedium?.copyWith(
                color: tokens.textPrimary,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              message,
              style: text.bodySmall?.copyWith(
                color: tokens.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            if (actionText != null && onAction != null) ...[
              const SizedBox(height: AppSpacing.xl),
              SecondaryButton(
                text: actionText!,
                height: 44,
                width: 160,
                onPressed: onAction,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const ErrorState({
    super.key,
    this.message = "Failed to load content. Please check your connection.",
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: tokens.danger.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.error_outline_rounded, size: 28, color: tokens.danger),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              "Something went wrong",
              style: text.titleMedium?.copyWith(
                color: tokens.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              message,
              style: text.bodySmall?.copyWith(color: tokens.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            SecondaryButton(
              text: "Try Again",
              icon: Icons.refresh_rounded,
              height: 44,
              width: 140,
              onPressed: onRetry,
            ),
          ],
        ),
      ),
    );
  }
}

class SkeletonBox extends StatelessWidget {
  final double width;
  final double height;
  final BorderRadius? borderRadius;

  const SkeletonBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final isDark = context.isDark;

    return Shimmer.fromColors(
      baseColor: isDark ? const Color(0xFF1E1E24) : const Color(0xFFE8E5DD),
      highlightColor: isDark ? const Color(0xFF2A2A33) : const Color(0xFFF7F5EE),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: tokens.surfaceAlt,
          borderRadius: borderRadius ?? AppRadius.roundedMd,
        ),
      ),
    );
  }
}
