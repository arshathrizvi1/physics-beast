import 'package:flutter/material.dart';
import '../../../../core/theme/theme_x.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_card.dart';

class HomeTestimonials extends StatelessWidget {
  final List<Map<String, dynamic>> testimonials;

  const HomeTestimonials({super.key, required this.testimonials});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;

    return SizedBox(
      height: 165,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
        itemCount: testimonials.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.md),
        itemBuilder: (context, index) {
          final item = testimonials[index];
          final String name = item['name'] ?? "Student";
          final String batch = item['batch'] ?? "2026 A/L";
          final String comment = item['comment'] ?? "";

          return SizedBox(
            width: 280,
            child: AppCard(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Row(
                        children: List.generate(
                          5,
                          (_) => const Icon(Icons.star_rounded, size: 14, color: Color(0xFFEAB308)),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        batch,
                        style: text.labelSmall?.copyWith(
                          color: tokens.textMuted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      comment,
                      style: text.bodySmall?.copyWith(
                        color: tokens.textSecondary,
                        height: 1.35,
                      ),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    name,
                    style: text.labelMedium?.copyWith(
                      color: tokens.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
