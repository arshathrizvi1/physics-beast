import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/theme_x.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../services/auth_service.dart';

class HomeHeader extends StatelessWidget {
  const HomeHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final authService = Provider.of<AuthService>(context);
    final user = authService.currentUser;

    final displayName = (user?.name != null && user!.name!.isNotEmpty) ? user.name! : "Scholar";
    final stream = (user?.stream != null && user!.stream!.isNotEmpty) ? user.stream! : "Physical Science";
    final batch = (user?.batchId != null && user!.batchId!.isNotEmpty) ? user.batchId! : "2026 A/L";

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenPadding,
        vertical: AppSpacing.md,
      ),
      child: Row(
        children: [
          // Academy Logo
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: tokens.gold, width: 1.5),
              boxShadow: tokens.goldGlow,
            ),
            child: ClipOval(
              child: Image.asset(
                'assets/images/logo.jpg',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: tokens.surfaceAlt,
                  child: Icon(Icons.school_rounded, color: tokens.gold, size: 24),
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),

          // User Greeting & Batch (Flexed to prevent ANY overflow!)
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  "Hi, $displayName 👋",
                  style: text.titleMedium?.copyWith(
                    color: tokens.textPrimary,
                    fontWeight: FontWeight.w800,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  "$batch • $stream",
                  style: text.bodySmall?.copyWith(
                    color: tokens.textSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),

          const SizedBox(width: AppSpacing.sm),

          // XP Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              gradient: tokens.goldGradient,
              borderRadius: AppRadius.roundedPill,
              boxShadow: tokens.goldGlow,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.stars_rounded, size: 14, color: tokens.onGold),
                const SizedBox(width: 4),
                Text(
                  "${user?.totalXp ?? 276} XP",
                  style: TextStyle(
                    color: tokens.onGold,
                    fontWeight: FontWeight.w800,
                    fontSize: 12.0,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
