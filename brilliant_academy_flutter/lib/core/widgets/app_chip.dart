import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/theme_x.dart';
import '../theme/app_spacing.dart';

class AppChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final Widget? leading;
  final Color? dotColor;

  const AppChip({
    super.key,
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.leading,
    this.dotColor,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: AnimatedContainer(
        duration: AppDurations.fast,
        curve: AppDurations.defaultCurve,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          gradient: isSelected ? tokens.goldGradient : null,
          color: isSelected
              ? null
              : (isDark ? tokens.surfaceAlt : tokens.surfaceAlt.withValues(alpha: 0.8)),
          borderRadius: AppRadius.roundedPill,
          border: Border.all(
            color: isSelected
                ? Colors.transparent
                : (isDark ? tokens.border : tokens.border.withValues(alpha: 0.5)),
            width: 1,
          ),
          boxShadow: isSelected ? tokens.goldGlow : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (dotColor != null) ...[
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: isSelected ? tokens.onGold : dotColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 7),
            ] else if (leading != null) ...[
              leading!,
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: text.labelLarge?.copyWith(
                color: isSelected ? tokens.onGold : tokens.textSecondary,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class FilterChipBar extends StatelessWidget {
  final List<String> items;
  final String selectedItem;
  final ValueChanged<String> onSelected;
  final EdgeInsetsGeometry padding;
  final Map<String, Color>? dotColors;

  const FilterChipBar({
    super.key,
    required this.items,
    required this.selectedItem,
    required this.onSelected,
    this.padding = const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
    this.dotColors,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: padding,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
        itemBuilder: (context, index) {
          final item = items[index];
          final isSelected = item == selectedItem;
          final dot = dotColors?[item];

          return AppChip(
            label: item,
            isSelected: isSelected,
            dotColor: dot,
            onTap: () => onSelected(item),
          );
        },
      ),
    );
  }
}
