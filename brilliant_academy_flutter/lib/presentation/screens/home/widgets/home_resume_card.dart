import 'package:flutter/material.dart';
import '../../../../core/theme/theme_x.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_card.dart';

class HomeResumeCard extends StatelessWidget {
  final String courseTitle;
  final String lessonTitle;
  final double progressPercent;
  final VoidCallback onResume;

  const HomeResumeCard({
    super.key,
    this.courseTitle = "Advanced Level Physics 2026",
    this.lessonTitle = "Lesson 4: Mechanics & Rotational Dynamics",
    this.progressPercent = 0.65,
    required this.onResume,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenPadding,
        vertical: AppSpacing.sm,
      ),
      child: AppCard(
        onTap: onResume,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: tokens.gold.withValues(alpha: 0.15),
                    borderRadius: AppRadius.roundedPill,
                  ),
                  child: Text(
                    "CONTINUE LEARNING",
                    style: text.labelSmall?.copyWith(
                      color: tokens.goldText,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  "${(progressPercent * 100).toInt()}% completed",
                  style: text.labelSmall?.copyWith(
                    color: tokens.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              courseTitle,
              style: text.titleMedium?.copyWith(
                color: tokens.textPrimary,
                fontWeight: FontWeight.w700,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              lessonTitle,
              style: text.bodySmall?.copyWith(
                color: tokens.textSecondary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: AppSpacing.md),
            // Progress Bar
            ClipRRect(
              borderRadius: AppRadius.roundedPill,
              child: LinearProgressIndicator(
                value: progressPercent,
                minHeight: 6,
                backgroundColor: tokens.surfaceAlt,
                valueColor: AlwaysStoppedAnimation<Color>(tokens.gold),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    gradient: tokens.goldGradient,
                    borderRadius: AppRadius.roundedPill,
                    boxShadow: tokens.goldGlow,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.play_arrow_rounded, size: 16, color: tokens.onGold),
                      const SizedBox(width: 4),
                      Text(
                        "Resume Lesson",
                        style: text.labelMedium?.copyWith(
                          color: tokens.onGold,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
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
