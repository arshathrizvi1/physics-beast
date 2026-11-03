import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/theme_x.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_badge.dart';
import '../../../core/widgets/app_buttons.dart';
import '../../../core/widgets/state_views.dart';
import '../../../services/exam_service.dart';
import '../../../services/auth_service.dart';
import '../../../data/models/exam_model.dart';
import 'exam_take_screen.dart';
import 'exam_history_screen.dart';
import 'exam_result_detail_screen.dart';
import '../leaderboard/leaderboard_screen.dart';

class ExamsScreen extends StatefulWidget {
  const ExamsScreen({super.key});

  @override
  State<ExamsScreen> createState() => _ExamsScreenState();
}

class _ExamsScreenState extends State<ExamsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ExamService _examService = ExamService();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final authService = Provider.of<AuthService>(context);
    final user = authService.currentUser;
    final uid = user?.uid ?? "guest_user";

    return AppScaffold(
      includeBottomNavInset: true,
      appBar: AppBar(
        title: Text(
          "Exams & Assessments",
          style: text.headlineSmall?.copyWith(
            color: tokens.textPrimary,
            fontWeight: FontWeight.w800,
          ),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: tokens.gold,
          indicatorWeight: 3.0,
          labelColor: tokens.goldText,
          unselectedLabelColor: tokens.textMuted,
          labelStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w700, fontSize: 13.0),
          unselectedLabelStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w500, fontSize: 13.0),
          tabs: const [
            Tab(text: "Active Papers"),
            Tab(text: "Paper History"),
            Tab(text: "Leaderboard"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Active Exams (with quick link button to Paper History)
          _buildActiveExamsTab(context),

          // Tab 2: Past Paper History & Analytics
          _buildPaperHistoryTab(context, uid),

          // Tab 3: Leaderboard
          const LeaderboardScreen(),
        ],
      ),
    );
  }

  Widget _buildActiveExamsTab(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;

    return StreamBuilder<List<Exam>>(
      stream: _examService.getExamsStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            children: const [
              SkeletonBox(width: double.infinity, height: 180.0),
              SizedBox(height: AppSpacing.md),
              SkeletonBox(width: double.infinity, height: 180.0),
            ],
          );
        }

        final exams = snapshot.data ?? [];

        return ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenPadding,
            AppSpacing.md,
            AppSpacing.screenPadding,
            AppSpacing.lg,
          ),
          children: [
            // Prominent "View Past Paper History & Analytics" Button
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    tokens.gold.withValues(alpha: 0.15),
                    tokens.surfaceAlt,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: AppRadius.roundedLg,
                border: Border.all(
                  color: tokens.gold.withValues(alpha: 0.4),
                  width: 1.2,
                ),
                boxShadow: isDark ? null : tokens.e1,
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10.0),
                    decoration: BoxDecoration(
                      color: tokens.gold.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.history_edu_rounded, color: tokens.goldText, size: 24.0),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Past Paper History & Analytics",
                          style: text.titleSmall?.copyWith(
                            color: tokens.textPrimary,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2.0),
                        Text(
                          "Review your past marks, island rank, and detailed answer breakdown.",
                          style: text.bodySmall?.copyWith(color: tokens.textSecondary, fontSize: 11.0),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      HapticFeedback.selectionClick();
                      _tabController.animateTo(1);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: tokens.gold,
                      foregroundColor: tokens.onGold,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
                      elevation: 0,
                    ),
                    child: const Text("View", style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12.0)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            Text(
              "Available Scheduled Exams (${exams.length})",
              style: text.titleSmall?.copyWith(
                color: tokens.textPrimary,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),

            if (exams.isEmpty)
              const EmptyState(
                icon: Icons.quiz_outlined,
                title: "No Active Exams",
                message: "There are currently no scheduled papers. Check back before your next revision session.",
              )
            else
              ...exams.map((exam) => _buildExamCard(context, exam)),
          ],
        );
      },
    );
  }

  Widget _buildPaperHistoryTab(BuildContext context, String uid) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;

    return StreamBuilder<List<ExamResultItem>>(
      stream: _examService.getUserExamResultsStream(uid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final results = snapshot.data ?? [];

        if (results.isEmpty) {
          return const EmptyState(
            icon: Icons.history_edu_rounded,
            title: "No Exam Submissions Yet",
            message: "Complete your scheduled papers in the 'Active Papers' tab to unlock full answer breakdowns and national rankings.",
          );
        }

        // Compute performance summary
        final int totalExams = results.length;
        final double totalPercentage = results.fold<double>(0.0, (acc, r) => acc + (r.percentage * 100.0));
        final double avgPercentage = totalExams > 0 ? totalPercentage / totalExams : 0.0;
        final int bestRank = results.fold<int>(9999, (acc, r) => (r.rank > 0 && r.rank < acc) ? r.rank : acc);
        final int totalScore = results.fold<int>(0, (acc, r) => acc + r.score);
        final int totalPossible = results.fold<int>(0, (acc, r) => acc + r.totalMarks);

        return ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenPadding,
            AppSpacing.md,
            AppSpacing.screenPadding,
            AppSpacing.lg,
          ),
          children: [
            // Performance Summary Box (Golden card matching profile analytics)
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: tokens.surfaceAlt,
                borderRadius: AppRadius.roundedLg,
                border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
                boxShadow: isDark ? null : tokens.e1,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.insights_rounded, color: tokens.goldText, size: 20.0),
                          const SizedBox(width: 8.0),
                          Text(
                            "Paper Performance & Analytics",
                            style: text.titleMedium?.copyWith(
                              color: tokens.textPrimary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.selectionClick();
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const ExamHistoryScreen(),
                            ),
                          );
                        },
                        child: Text(
                          "Full Report →",
                          style: text.labelSmall?.copyWith(
                            color: tokens.goldText,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      Expanded(
                        child: _buildMetricTile(
                          context,
                          label: "Average Score",
                          value: "${avgPercentage.toStringAsFixed(1)}%",
                          color: tokens.goldText,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: _buildMetricTile(
                          context,
                          label: "Best Batch Rank",
                          value: bestRank < 9999 ? "#$bestRank" : "N/A",
                          color: tokens.success,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      Expanded(
                        child: _buildMetricTile(
                          context,
                          label: "Papers Completed",
                          value: "$totalExams Attempted",
                          color: tokens.info,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: _buildMetricTile(
                          context,
                          label: "Total Marks",
                          value: "$totalScore / $totalPossible",
                          color: tokens.goldText,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // Past Exam Results List
            Text(
              "Recent Exam Submissions (${results.length})",
              style: text.titleSmall?.copyWith(
                color: tokens.textPrimary,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),

            ...results.map((res) => _buildResultCard(context, res)),
          ],
        );
      },
    );
  }

  Widget _buildMetricTile(
    BuildContext context, {
    required String label,
    required String value,
    required Color color,
  }) {
    final tokens = context.tokens;
    final text = context.text;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
      decoration: BoxDecoration(
        color: tokens.surface,
        borderRadius: BorderRadius.circular(8.0),
        border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: text.labelSmall?.copyWith(color: tokens.textMuted, fontSize: 10.0),
          ),
          const SizedBox(height: 2.0),
          Text(
            value,
            style: text.titleSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w800,
              fontSize: 14.0,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResultCard(
    BuildContext context,
    ExamResultItem res,
  ) {
    final tokens = context.tokens;
    final text = context.text;

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: AppCard(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ExamResultDetailScreen(result: res),
            ),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                AppBadge(
                  text: res.subject,
                  variant: AppBadgeVariant.gold,
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                  decoration: BoxDecoration(
                    color: tokens.gold.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6.0),
                    border: Border.all(color: tokens.gold.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.emoji_events_rounded, size: 13.0, color: tokens.goldText),
                      const SizedBox(width: 4.0),
                      Text(
                        "Rank #${res.rank} / ${res.totalStudents}",
                        style: TextStyle(
                          color: tokens.goldText,
                          fontSize: 11.0,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              res.examTitle,
              style: text.titleMedium?.copyWith(
                color: tokens.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4.0),
            Row(
              children: [
                Icon(Icons.schedule_rounded, size: 14.0, color: tokens.textMuted),
                const SizedBox(width: 4.0),
                Text(
                  "Time Spent: ${res.timeSpentMinutes} mins • Completed",
                  style: text.bodySmall?.copyWith(color: tokens.textMuted, fontSize: 11.0),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // Score Pill Bar
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: tokens.surfaceAlt,
                borderRadius: BorderRadius.circular(8.0),
                border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      Text("SCORE ACQUIRED", style: text.labelSmall?.copyWith(fontSize: 10.0, color: tokens.textMuted)),
                      const SizedBox(height: 2.0),
                      Text(
                        "${res.score} / ${res.totalMarks}",
                        style: TextStyle(
                          color: tokens.goldText,
                          fontWeight: FontWeight.w800,
                          fontSize: 15.0,
                        ),
                      ),
                    ],
                  ),
                  Container(width: 1.0, height: 26.0, color: tokens.border),
                  Column(
                    children: [
                      Text("PERCENTAGE", style: text.labelSmall?.copyWith(fontSize: 10.0, color: tokens.textMuted)),
                      const SizedBox(height: 2.0),
                      Text(
                        "${(res.percentage * 100.0).toStringAsFixed(1)}%",
                        style: TextStyle(
                          color: tokens.success,
                          fontWeight: FontWeight.w800,
                          fontSize: 15.0,
                        ),
                      ),
                    ],
                  ),
                  Container(width: 1.0, height: 26.0, color: tokens.border),
                  Column(
                    children: [
                      Text("FINAL GRADE", style: text.labelSmall?.copyWith(fontSize: 10.0, color: tokens.textMuted)),
                      const SizedBox(height: 2.0),
                      Text(
                        res.grade,
                        style: TextStyle(
                          color: tokens.goldText,
                          fontWeight: FontWeight.w900,
                          fontSize: 16.0,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Review Answers Action
            SizedBox(
              width: double.infinity,
              height: 38.0,
              child: OutlinedButton.icon(
                icon: Icon(Icons.rate_review_rounded, size: 16.0, color: tokens.goldText),
                label: Text(
                  "Review Paper Breakdown",
                  style: TextStyle(color: tokens.goldText, fontWeight: FontWeight.w700, fontSize: 12.0),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: tokens.gold.withValues(alpha: 0.5)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8.0)),
                ),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ExamResultDetailScreen(result: res),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExamCard(BuildContext context, Exam exam) {
    final tokens = context.tokens;
    final text = context.text;
    final subjectColor = tokens.getSubjectColor(exam.subject);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: AppCard(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ExamTakeScreen(exam: exam),
            ),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                AppBadge(
                  text: exam.subject,
                  variant: AppBadgeVariant.gold,
                ),
                Row(
                  children: [
                    Icon(Icons.timer_outlined, size: 15.0, color: tokens.textMuted),
                    const SizedBox(width: 4.0),
                    Text(
                      "${exam.durationMinutes} mins",
                      style: text.labelSmall?.copyWith(
                        color: tokens.textMuted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              exam.title,
              style: text.titleMedium?.copyWith(
                color: tokens.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4.0),
            Row(
              children: [
                Icon(Icons.help_outline_rounded, size: 15.0, color: subjectColor),
                const SizedBox(width: 4.0),
                Text(
                  "${exam.totalQuestions} Questions • Standard Assessment",
                  style: text.bodySmall?.copyWith(
                    color: tokens.textSecondary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            PrimaryButton(
              text: "Take Exam Paper",
              icon: Icons.edit_note_rounded,
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ExamTakeScreen(exam: exam),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
