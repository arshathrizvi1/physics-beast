import 'package:flutter/material.dart';
import '../../../../core/theme/theme_x.dart';
import '../../../../core/theme/app_spacing.dart';

class HomeSearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const HomeSearchBar({
    super.key,
    required this.controller,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenPadding,
        vertical: AppSpacing.sm,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: tokens.surface,
          borderRadius: AppRadius.roundedPill,
          border: Border.all(
            color: isDark ? tokens.border : tokens.border.withValues(alpha: 0.6),
            width: 1,
          ),
          boxShadow: isDark ? null : tokens.e1,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: TextField(
          controller: controller,
          onChanged: onChanged,
          style: text.bodyLarge?.copyWith(
            color: tokens.textPrimary,
            fontSize: 14.0,
          ),
          decoration: InputDecoration(
            hintText: "Search courses, syllabus topics, lessons...",
            hintStyle: text.bodySmall?.copyWith(
              color: tokens.textMuted,
              fontSize: 13.0,
            ),
            prefixIcon: Icon(
              Icons.search_rounded,
              color: tokens.goldText,
              size: 20,
            ),
            prefixIconConstraints: const BoxConstraints(minWidth: 32, minHeight: 20),
            suffixIcon: controller.text.isNotEmpty
                ? IconButton(
                    icon: Icon(Icons.clear_rounded, size: 18, color: tokens.textMuted),
                    onPressed: () {
                      controller.clear();
                      onChanged("");
                    },
                  )
                : null,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(vertical: 13),
          ),
        ),
      ),
    );
  }
}
