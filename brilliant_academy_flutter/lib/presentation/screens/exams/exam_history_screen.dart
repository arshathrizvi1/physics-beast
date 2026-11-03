import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/theme_x.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_chip.dart';
import '../../../core/widgets/state_views.dart';
import '../../../data/models/exam_model.dart';
import '../../../services/exam_service.dart';
import '../../../services/auth_service.dart';
import 'exam_result_detail_screen.dart';

class ExamHistoryScreen extends StatefulWidget {
  const ExamHistoryScreen({super.key});

  @override
  State<ExamHistoryScreen> createState() => _ExamHistoryScreenState();
}

class _ExamHistoryScreenState extends State<ExamHistoryScreen> {
  final ExamService _examService = ExamService();
  String _selectedSubject = "All";

  final List<String> _subjects = const [
    "All",
    "Physics",
    "Combined Mathematics",
    "Chemistry",
    "ICT",
  ];

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final authService = Provider.of<AuthService>(context);
    final user = authService.currentUser;
    final uid = user?.uid ?? "guest_user";

    final subjectColors = {
      "Physics": tokens.subjectPhysics,
      "Combined Mathematics": tokens.subjectMaths,
      "Chemistry": tokens.subjectChemistry,
      "ICT": tokens.subjectIct,
    };

    return AppScaffold(
      includeBottomNavInset: false,
      appBar: AppBar(
        title: Text(
          "Exam & Paper History",
          style: text.titleMedium?.copyWith(
            color: tokens.textPrimary,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: StreamBuilder<List<ExamResultItem>>(
        stream: _examService.getUserExamResultsStream(uid),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final allResults = snapshot.data ?? [];

          // Compute Overall Analytics
          final totalExams = allResults.length;
          final double avgScore = totalExams > 0
              ? allResults.map((r) => r.percentage).reduce((a, b) => a + b) / totalExams
              : 0.0;
          final int bestRank = totalExams > 0
              ? allResults.map((r) => r.islandRank).reduce((a, b) => a < b ? a : b)
              : 1;
          final int passCount = allResults.where((r) => r.percentage >= 35).length;
          final double passRate = totalExams > 0 ? (passCount / totalExams) * 100 : 100.0;

          // Filter by Subject
          final filtered = allResults.where((r) {
            if (_selectedSubject == "All") return true;
            return r.subject.toLowerCase() == _selectedSubject.toLowerCase();
          }).toList();

          return CustomScrollView(
            slivers: [
              // Top Summary Metric Banner (4 Metrics)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.screenPadding,
                    AppSpacing.md,
                    AppSpacing.screenPadding,
                    AppSpacing.xs,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Your Academic Exam Portfolio",
                        style: text.headlineSmall?.copyWith(
                          color: tokens.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 20.0,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        "Detailed answer sheets, score distributions, and island rankings.",
                        style: text.bodySmall?.copyWith(color: tokens.textSecondary),
                      ),
                      const SizedBox(height: AppSpacing.md),

                      // 2x2 Stats Summary Card Grid
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricCard(
                              context,
                              title: "Papers Taken",
                              value: "$totalExams",
                              subtitle: "Completed",
                              icon: Icons.assignment_turned_in_rounded,
                              iconColor: tokens.gold,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildMetricCard(
                              context,
                              title: "Average Score",
                              value: "${avgScore.toStringAsFixed(0)}%",
                              subtitle: "Across all subjects",
                              icon: Icons.insights_rounded,
                              iconColor: tokens.success,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricCard(
                              context,
                              title: "Best Island Rank",
                              value: "#$bestRank",
                              subtitle: "Nationwide",
                              icon: Icons.emoji_events_rounded,
                              iconColor: const Color(0xFFF59E0B),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _buildMetricCard(
                              context,
                              title: "Paper Pass Rate",
                              value: "${passRate.toStringAsFixed(0)}%",
                              subtitle: "$passCount of $totalExams passed",
                              icon: Icons.verified_rounded,
                              iconColor: tokens.info,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // Subject Filter Bar
                      FilterChipBar(
                        items: _subjects,
                        selectedItem: _selectedSubject,
                        dotColors: subjectColors,
                        onSelected: (sub) => setState(() => _selectedSubject = sub),
                      ),

                      const SizedBox(height: AppSpacing.md),
                    ],
                  ),
                ),
              ),

              // Exam Results List
              if (filtered.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.xxl),
                    child: EmptyState(
                      icon: Icons.history_edu_rounded,
                      title: "No Papers Found",
                      message: "No exam submissions found for the selected subject stream.",
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final res = filtered[index];
                        final subColor = subjectColors[res.subject] ?? tokens.gold;

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
                            padding: const EdgeInsets.all(AppSpacing.md),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Top Badges Row
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: subColor.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(5),
                                        border: Border.all(color: subColor.withValues(alpha: 0.4)),
                                      ),
                                      child: Text(
                                        res.subject,
                                        style: TextStyle(
                                          color: subColor,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 11.0,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: tokens.success.withValues(alpha: 0.14),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: tokens.success.withValues(alpha: 0.4)),
                                      ),
                                      child: Text(
                                        "${res.score}/${res.totalQuestions} Marks (Grade ${res.grade})",
                                        style: TextStyle(
                                          color: tokens.success,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 11.5,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 10),

                                // Exam Title
                                Text(
                                  res.examTitle,
                                  style: text.titleSmall?.copyWith(
                                    color: tokens.textPrimary,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14.5,
                                    height: 1.25,
                                  ),
                                ),

                                const SizedBox(height: 6),

                                // Date & Time Taken
                                Row(
                                  children: [
                                    Icon(Icons.calendar_today_rounded, size: 12, color: tokens.textMuted),
                                    const SizedBox(width: 4),
                                    Text(
                                      "Submitted ${_formatDate(res.completedAt)}",
                                      style: TextStyle(color: tokens.textMuted, fontSize: 11.0),
                                    ),
                                    const SizedBox(width: 8),
                                    Icon(Icons.timer_outlined, size: 12, color: tokens.textMuted),
                                    const SizedBox(width: 4),
                                    Text(
                                      "${res.timeTakenMinutes} mins",
                                      style: TextStyle(color: tokens.textMuted, fontSize: 11.0),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 12),
                                Divider(color: tokens.border.withValues(alpha: 0.5)),
                                const SizedBox(height: 8),

                                // Bottom Row: Ranks + Action Button
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    // Rank Indicators
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: tokens.gold.withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(color: tokens.gold.withValues(alpha: 0.3)),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(Icons.emoji_events_rounded, size: 13, color: tokens.gold),
                                              const SizedBox(width: 4),
                                              Text(
                                                "Island: #${res.islandRank}",
                                                style: TextStyle(
                                                  color: tokens.goldText,
                                                  fontWeight: FontWeight.w800,
                                                  fontSize: 11.5,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: tokens.surfaceAlt,
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(color: tokens.border.withValues(alpha: 0.5)),
                                          ),
                                          child: Text(
                                            "Batch: #${res.batchRank}",
                                            style: TextStyle(
                                              color: tokens.textSecondary,
                                              fontWeight: FontWeight.w700,
                                              fontSize: 11.0,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),

                                    // View Answers Button
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          "View Answers",
                                          style: TextStyle(
                                            color: tokens.goldText,
                                            fontWeight: FontWeight.w800,
                                            fontSize: 12.0,
                                          ),
                                        ),
                                        const SizedBox(width: 3),
                                        Icon(Icons.arrow_forward_rounded, size: 14, color: tokens.goldText),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      childCount: filtered.length,
                    ),
                  ),
                ),

              const SliverToBoxAdapter(
                child: SizedBox(height: AppSpacing.huge),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildMetricCard(
    BuildContext context, {
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
  }) {
    final tokens = context.tokens;
    final isDark = context.isDark;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: tokens.surface,
        borderRadius: AppRadius.roundedMd,
        border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
        boxShadow: isDark ? null : tokens.e1,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: tokens.textSecondary,
                  fontSize: 11.0,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Icon(icon, size: 16, color: iconColor),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              color: tokens.textPrimary,
              fontSize: 20.0,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: TextStyle(
              color: tokens.textMuted,
              fontSize: 10.0,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime d) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return "${months[d.month - 1]} ${d.day}, ${d.year}";
  }
}
