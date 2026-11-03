import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/theme_x.dart';
import '../theme/app_spacing.dart';

class NavItemData {
  final IconData icon;
  final String label;
  final bool hasBadge;

  const NavItemData({
    required this.icon,
    required this.label,
    this.hasBadge = false,
  });
}

class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTabSelected;
  final bool isLiveActive;

  const AppBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTabSelected,
    this.isLiveActive = false,
  });

  static const List<NavItemData> defaultItems = [
    NavItemData(icon: Icons.home_rounded, label: "Home"),
    NavItemData(icon: Icons.menu_book_rounded, label: "Study"),
    NavItemData(icon: Icons.sensors_rounded, label: "Live", hasBadge: true),
    NavItemData(icon: Icons.assignment_rounded, label: "Exams"),
    NavItemData(icon: Icons.person_rounded, label: "Profile"),
  ];

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final isDark = context.isDark;

    return Container(
      height: AppSpacing.bottomNavHeight,
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
      decoration: BoxDecoration(
        color: tokens.surface,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(
          color: isDark ? tokens.border : tokens.border.withValues(alpha: 0.6),
          width: 1,
        ),
        boxShadow: tokens.e2,
      ),
      child: Row(
        children: List.generate(defaultItems.length, (index) {
          final item = defaultItems[index];
          final isSelected = currentIndex == index;

          return Expanded(
            child: _BottomNavItem(
              icon: item.icon,
              label: item.label,
              isSelected: isSelected,
              showBadge: item.hasBadge && isLiveActive,
              onTap: () => onTabSelected(index),
            ),
          );
        }),
      ),
    );
  }
}

class _BottomNavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final bool showBadge;
  final VoidCallback onTap;

  const _BottomNavItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.showBadge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: AppDurations.fast,
        curve: AppDurations.defaultCurve,
        height: 52,
        decoration: BoxDecoration(
          gradient: isSelected ? tokens.goldGradient : null,
          borderRadius: BorderRadius.circular(26),
          boxShadow: isSelected ? tokens.goldGlow : null,
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: isSelected ? tokens.onGold : tokens.textMuted,
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  style: text.labelSmall?.copyWith(
                    color: isSelected ? tokens.onGold : tokens.textMuted,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
            if (showBadge)
              Positioned(
                top: 7,
                right: 14,
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: tokens.live,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: tokens.live.withValues(alpha: 0.8),
                        blurRadius: 6,
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
