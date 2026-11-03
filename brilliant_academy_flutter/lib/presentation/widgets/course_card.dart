import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/theme_x.dart';
import '../../data/models/course_model.dart';
import '../../data/models/user_model.dart';

class CourseCard extends StatelessWidget {
  final Course course;
  final UserModel? user;
  final VoidCallback onTap;
  final bool isGrid;

  const CourseCard({
    super.key,
    required this.course,
    required this.user,
    required this.onTap,
    this.isGrid = false,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;
    final bool hasAccess = user != null && user!.hasCourseAccess(course.id);

    return Container(
      margin: EdgeInsets.only(bottom: isGrid ? 0.0 : 16.0),
      decoration: BoxDecoration(
        color: tokens.surface,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(
          color: hasAccess
              ? tokens.success.withValues(alpha: 0.4)
              : (isDark ? tokens.border : tokens.border.withValues(alpha: 0.5)),
          width: 1.2,
        ),
        boxShadow: isDark ? null : tokens.e1,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Course Image Banner
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(15.0)),
                    child: AspectRatio(
                      aspectRatio: 16 / 9,
                      child: course.image != null
                          ? CachedNetworkImage(
                              imageUrl: course.image!,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => Container(
                                color: tokens.surfaceAlt,
                                child: Center(
                                  child: CircularProgressIndicator(color: tokens.gold, strokeWidth: 2.0),
                                ),
                              ),
                              errorWidget: (context, url, error) => Container(
                                color: tokens.surfaceAlt,
                                child: Icon(Icons.school_outlined, size: 40.0, color: tokens.gold),
                              ),
                            )
                          : Container(
                              color: tokens.surfaceAlt,
                              child: Icon(Icons.school_outlined, size: 40.0, color: tokens.gold),
                            ),
                    ),
                  ),
                  // Dark Vignette Gradient
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.65),
                          ],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                      ),
                    ),
                  ),
                  // Premium Live Badge
                  Positioned(
                    top: 10.0,
                    right: 10.0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.5),
                      decoration: BoxDecoration(
                        gradient: tokens.goldGradient,
                        borderRadius: BorderRadius.circular(6.0),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.35),
                            blurRadius: 4.0,
                          ),
                        ],
                      ),
                      child: Text(
                        "PREMIUM LIVE",
                        style: TextStyle(
                          color: tokens.onGold,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ),
                  // Subject Tag
                  if (course.subject != null)
                    Positioned(
                      bottom: 8.0,
                      left: 10.0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7.0, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.75),
                          borderRadius: BorderRadius.circular(6.0),
                          border: Border.all(color: Colors.white24, width: 0.8),
                        ),
                        child: Text(
                          course.subject!,
                          style: TextStyle(
                            color: tokens.getSubjectColor(course.subject!),
                            fontSize: 10.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              // Content Details
              Padding(
                padding: EdgeInsets.all(isGrid ? 10.0 : 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      course.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: text.titleMedium?.copyWith(
                        color: tokens.textPrimary,
                        fontSize: isGrid ? 14.0 : 16.5,
                        fontWeight: FontWeight.w700,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 6.0),
                    if (course.description.isNotEmpty)
                      Text(
                        course.description,
                        maxLines: isGrid ? 2 : 2,
                        overflow: TextOverflow.ellipsis,
                        style: text.bodySmall?.copyWith(
                          color: tokens.textSecondary,
                          fontSize: isGrid ? 11.0 : 12.5,
                          height: 1.35,
                        ),
                      ),
                    const SizedBox(height: 10.0),
                    // Access Status & Action (Overflow-Proof)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: isGrid ? 7.0 : 10.0,
                              vertical: 4.0,
                            ),
                            decoration: BoxDecoration(
                              color: hasAccess
                                  ? tokens.success.withValues(alpha: 0.12)
                                  : tokens.gold.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6.0),
                              border: Border.all(
                                color: hasAccess
                                    ? tokens.success.withValues(alpha: 0.35)
                                    : tokens.gold.withValues(alpha: 0.35),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  hasAccess ? Icons.check_circle : Icons.lock_open_rounded,
                                  size: 13.0,
                                  color: hasAccess ? tokens.success : tokens.goldText,
                                ),
                                const SizedBox(width: 4.0),
                                Flexible(
                                  child: Text(
                                    hasAccess
                                        ? (isGrid ? "Enrolled" : "Enrolled (Full Access)")
                                        : (isGrid ? "Available" : "Available Lessons"),
                                    overflow: TextOverflow.ellipsis,
                                    maxLines: 1,
                                    style: TextStyle(
                                      color: hasAccess ? tokens.success : tokens.goldText,
                                      fontSize: isGrid ? 10.5 : 12.0,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (!isGrid) ...[
                          const SizedBox(width: 8.0),
                          Icon(
                            Icons.arrow_forward_ios_rounded,
                            size: 13.0,
                            color: tokens.textMuted,
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
