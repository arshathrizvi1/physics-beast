import 'package:flutter/material.dart';
import '../theme/theme_x.dart';
import '../theme/app_spacing.dart';
import 'app_buttons.dart';

class AppDialog extends StatelessWidget {
  final String title;
  final String message;
  final IconData? icon;
  final Color? iconColor;
  final String confirmText;
  final VoidCallback onConfirm;
  final String? cancelText;
  final VoidCallback? onCancel;
  final bool isDestructive;

  const AppDialog({
    super.key,
    required this.title,
    required this.message,
    this.icon,
    this.iconColor,
    required this.confirmText,
    required this.onConfirm,
    this.cancelText,
    this.onCancel,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;

    return Dialog(
      backgroundColor: tokens.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: AppRadius.roundedXl,
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      elevation: 0,
      child: Container(
        decoration: BoxDecoration(
          color: tokens.surface,
          borderRadius: AppRadius.roundedXl,
          border: Border.all(
            color: isDark ? tokens.border : tokens.border.withValues(alpha: 0.4),
            width: 1,
          ),
          boxShadow: tokens.e2,
        ),
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (icon != null) ...[
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: (iconColor ?? tokens.gold).withValues(alpha: 0.12),
                  borderRadius: AppRadius.roundedMd,
                ),
                child: Icon(icon, color: iconColor ?? tokens.gold, size: 22),
              ),
              const SizedBox(height: AppSpacing.lg),
            ],
            Text(
              title,
              style: text.titleMedium?.copyWith(
                color: tokens.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              message,
              style: text.bodySmall?.copyWith(
                color: tokens.textSecondary,
                height: 1.45,
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),
            Row(
              children: [
                if (cancelText != null) ...[
                  Expanded(
                    child: SecondaryButton(
                      text: cancelText!,
                      height: 46,
                      onPressed: onCancel ?? () => Navigator.of(context).pop(),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                ],
                Expanded(
                  child: isDestructive
                      ? SecondaryButton(
                          text: confirmText,
                          height: 46,
                          textColor: tokens.danger,
                          borderColor: tokens.danger.withValues(alpha: 0.5),
                          onPressed: () {
                            Navigator.of(context).pop();
                            onConfirm();
                          },
                        )
                      : PrimaryButton(
                          text: confirmText,
                          height: 46,
                          onPressed: () {
                            Navigator.of(context).pop();
                            onConfirm();
                          },
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

Future<T?> showAppDialog<T>({
  required BuildContext context,
  required String title,
  required String message,
  IconData? icon,
  Color? iconColor,
  required String confirmText,
  required VoidCallback onConfirm,
  String? cancelText,
  VoidCallback? onCancel,
  bool isDestructive = false,
}) {
  return showDialog<T>(
    context: context,
    builder: (ctx) => AppDialog(
      title: title,
      message: message,
      icon: icon,
      iconColor: iconColor,
      confirmText: confirmText,
      onConfirm: onConfirm,
      cancelText: cancelText,
      onCancel: onCancel,
      isDestructive: isDestructive,
    ),
  );
}
