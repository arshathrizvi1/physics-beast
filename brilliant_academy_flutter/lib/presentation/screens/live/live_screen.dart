import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/theme_x.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/app_buttons.dart';
import '../../../services/auth_service.dart';
import '../player/secure_player_screen.dart';

class LiveScreen extends StatelessWidget {
  const LiveScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;
    final authService = Provider.of<AuthService>(context);
    final user = authService.currentUser;

    return AppScaffold(
      includeBottomNavInset: true,
      appBar: AppBar(
        title: Text(
          "Live Classrooms",
          style: text.headlineSmall?.copyWith(
            color: tokens.textPrimary,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Active Live Stream Hero Card
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                gradient: isDark
                    ? const LinearGradient(
                        colors: [Color(0xFF2E1014), Color(0xFF1E1E26)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : LinearGradient(
                        colors: [
                          tokens.live.withValues(alpha: 0.08),
                          tokens.surface,
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                borderRadius: BorderRadius.circular(20.0),
                border: Border.all(
                  color: tokens.live.withValues(alpha: isDark ? 0.45 : 0.35),
                  width: 1.5,
                ),
                boxShadow: isDark
                    ? [
                        BoxShadow(
                          color: tokens.live.withValues(alpha: 0.2),
                          blurRadius: 18.0,
                          offset: const Offset(0, 6),
                        ),
                      ]
                    : tokens.e1,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.5),
                        decoration: BoxDecoration(
                          color: tokens.live,
                          borderRadius: BorderRadius.circular(20.0),
                          boxShadow: [
                            BoxShadow(
                              color: tokens.live.withValues(alpha: 0.4),
                              blurRadius: 6.0,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.fiber_manual_record, color: Colors.white, size: 10.0),
                            SizedBox(width: 5.0),
                            Text(
                              "LIVE NOW",
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 11.0,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Row(
                        children: [
                          Icon(Icons.people_outline_rounded, color: tokens.textSecondary, size: 16.0),
                          const SizedBox(width: 4.0),
                          Text(
                            "248 Watching",
                            style: TextStyle(color: tokens.textSecondary, fontSize: 12.0, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16.0),
                  Text(
                    "Advanced Physics 2026 - Mechanics & Circular Motion Live Masterclass",
                    style: text.titleMedium?.copyWith(
                      color: tokens.textPrimary,
                      fontSize: 18.0,
                      fontWeight: FontWeight.w800,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 8.0),
                  Text(
                    "Teacher: Dr. Albert Einstein • Live interactive stream with live Q&A",
                    style: text.bodySmall?.copyWith(
                      color: tokens.textSecondary,
                      fontSize: 13.0,
                    ),
                  ),
                  const SizedBox(height: 20.0),
                  PrimaryButton(
                    text: "Join Live Class",
                    icon: Icons.sensors_rounded,
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => SecurePlayerScreen(
                            videoId: "live_stream_feed",
                            lessonTitle: "A/L 2026 Physics Live Stream",
                            studentEmail: user?.email ?? "student@brilliantacademy.lk",
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32.0),

            // Upcoming Schedule Header
            Text(
              "Upcoming Live Sessions",
              style: text.titleMedium?.copyWith(
                color: tokens.textPrimary,
                fontSize: 18.0,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 16.0),

            _buildScheduleCard(
              context,
              "Combined Mathematics 2026",
              "Integration & Area Under Curves",
              "Tomorrow, 6:30 PM",
              tokens.subjectMaths,
            ),
            const SizedBox(height: 12.0),
            _buildScheduleCard(
              context,
              "Chemistry Revision 2026",
              "Organic Mechanisms & Conversions",
              "Saturday, 8:00 AM",
              tokens.subjectChemistry,
            ),
            const SizedBox(height: 12.0),
            _buildScheduleCard(
              context,
              "ICT Science 2026",
              "Python Algorithms & Past Paper Drill",
              "Sunday, 10:00 AM",
              tokens.subjectIct,
            ),
            const SizedBox(height: 12.0),
            _buildScheduleCard(
              context,
              "Physics Masterclass 2026",
              "Wave Optics & Diffraction Grating",
              "Monday, 5:00 PM",
              tokens.subjectPhysics,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduleCard(
    BuildContext context,
    String subject,
    String topic,
    String time,
    Color accent,
  ) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: tokens.surface,
        borderRadius: BorderRadius.circular(14.0),
        border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
        boxShadow: isDark ? null : tokens.e1,
      ),
      child: Row(
        children: [
          Container(
            width: 4.0,
            height: 48.0,
            decoration: BoxDecoration(
              color: accent,
              borderRadius: BorderRadius.circular(4.0),
            ),
          ),
          const SizedBox(width: 14.0),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subject,
                  style: TextStyle(
                    color: accent,
                    fontSize: 12.0,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2.0),
                Text(
                  topic,
                  style: text.bodyMedium?.copyWith(
                    color: tokens.textPrimary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4.0),
                Text(
                  time,
                  style: text.bodySmall?.copyWith(
                    color: tokens.textMuted,
                    fontSize: 12.0,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.notifications_none_rounded, color: tokens.textMuted, size: 20.0),
        ],
      ),
    );
  }
}
