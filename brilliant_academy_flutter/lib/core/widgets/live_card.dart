import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/theme_x.dart';
import '../theme/app_spacing.dart';
import 'app_buttons.dart';

class LiveCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final int viewerCount;
  final VoidCallback onJoin;

  const LiveCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.viewerCount,
    required this.onJoin,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1B1115) : const Color(0xFFFFF1F2),
        borderRadius: AppRadius.roundedLg,
        border: Border.all(
          color: tokens.live.withValues(alpha: 0.4),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: tokens.live.withValues(alpha: isDark ? 0.2 : 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Pulsing Red Live Indicator
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: tokens.live,
                  borderRadius: AppRadius.roundedPill,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                    )
                        .animate(onPlay: (c) => c.repeat(reverse: true))
                        .scale(begin: const Offset(0.7, 0.7), end: const Offset(1.3, 1.3), duration: 800.ms),
                    const SizedBox(width: 6),
                    Text(
                      "LIVE NOW",
                      style: text.labelSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Icon(Icons.visibility_rounded, size: 16, color: tokens.textSecondary),
              const SizedBox(width: 4),
              Text(
                "$viewerCount watching",
                style: text.labelMedium?.copyWith(
                  color: tokens.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            title,
            style: text.titleMedium?.copyWith(
              color: tokens.textPrimary,
              fontWeight: FontWeight.w700,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: text.bodySmall?.copyWith(
              color: tokens.textSecondary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: AppSpacing.lg),
          PrimaryButton(
            text: "Join Live Class",
            icon: Icons.sensors_rounded,
            height: 46,
            onPressed: onJoin,
          ),
        ],
      ),
    );
  }
}
