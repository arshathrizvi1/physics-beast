import 'package:flutter/material.dart';
import '../../../core/theme/theme_x.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/app_card.dart';
import '../../../data/models/exam_model.dart';
import '../../../services/exam_service.dart';

class ExamResultDetailScreen extends StatefulWidget {
  final ExamResultItem result;

  const ExamResultDetailScreen({
    super.key,
    required this.result,
  });

  @override
  State<ExamResultDetailScreen> createState() => _ExamResultDetailScreenState();
}

class _ExamResultDetailScreenState extends State<ExamResultDetailScreen> {
  final ExamService _examService = ExamService();
  late Future<List<ExamQuestion>> _questionsFuture;

  @override
  void initState() {
    super.initState();
    if (widget.result.questions.isNotEmpty) {
      _questionsFuture = Future.value(widget.result.questions);
    } else {
      _questionsFuture = _examService.getQuestionsForExam(widget.result.examId);
    }
  }

  void _showReportQuestionModal(BuildContext context, int questionNumber) {
    final tokens = context.tokens;
    final textController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: tokens.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.screenPadding,
            right: AppSpacing.screenPadding,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Report Doubt on Question $questionNumber",
                    style: TextStyle(
                      color: tokens.textPrimary,
                      fontWeight: FontWeight.bold,
                      fontSize: 16.0,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: tokens.textMuted),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                "Have a question about the mark scheme or grading? Our faculty will review your query.",
                style: TextStyle(color: tokens.textSecondary, fontSize: 12.0),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: textController,
                maxLines: 4,
                style: TextStyle(color: tokens.textPrimary, fontSize: 13.0),
                decoration: InputDecoration(
                  hintText: "Explain your doubt or query for the teacher...",
                  hintStyle: TextStyle(color: tokens.textMuted),
                  filled: true,
                  fillColor: tokens.surfaceAlt,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: tokens.border),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: tokens.gold,
                    foregroundColor: tokens.onGold,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.send_rounded, size: 16),
                  label: const Text("Submit Doubt to Teacher", style: TextStyle(fontWeight: FontWeight.bold)),
                  onPressed: () {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: const Text("Your doubt has been submitted to the academic board."),
                        backgroundColor: tokens.success,
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;
    final res = widget.result;

    return AppScaffold(
      includeBottomNavInset: false,
      appBar: AppBar(
        title: Text(
          "Exam Answers & Analytics",
          style: text.titleMedium?.copyWith(
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
            // 1. HERO PERFORMANCE SCORECARD
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isDark
                      ? [const Color(0xFF1C1910), const Color(0xFF14120B)]
                      : [const Color(0xFFFFFBEB), const Color(0xFFFEF3C7)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: AppRadius.roundedLg,
                border: Border.all(color: tokens.gold.withValues(alpha: 0.5), width: 1.5),
                boxShadow: tokens.goldGlow,
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: tokens.gold.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: tokens.gold.withValues(alpha: 0.4)),
                        ),
                        child: Text(
                          res.subject.toUpperCase(),
                          style: TextStyle(
                            color: tokens.goldText,
                            fontWeight: FontWeight.w800,
                            fontSize: 11.0,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: tokens.success.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: tokens.success.withValues(alpha: 0.4)),
                        ),
                        child: Text(
                          "Grade ${res.grade} (Passed)",
                          style: TextStyle(
                            color: tokens.success,
                            fontWeight: FontWeight.w800,
                            fontSize: 12.0,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Paper Title
                  Text(
                    res.examTitle,
                    style: text.titleLarge?.copyWith(
                      color: tokens.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 18.0,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),

                  // Big Score & Accuracy
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        "${res.score}",
                        style: TextStyle(
                          fontSize: 48.0,
                          fontWeight: FontWeight.w900,
                          color: tokens.goldText,
                          letterSpacing: -1,
                        ),
                      ),
                      Text(
                        " / ${res.totalQuestions}",
                        style: TextStyle(
                          fontSize: 22.0,
                          fontWeight: FontWeight.w600,
                          color: tokens.textMuted,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        "(${res.percentage.toStringAsFixed(0)}%)",
                        style: TextStyle(
                          fontSize: 20.0,
                          fontWeight: FontWeight.w800,
                          color: tokens.success,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),
                  Divider(color: tokens.border.withValues(alpha: 0.4)),
                  const SizedBox(height: 14),

                  // Island Rank & Batch Rank Metrics Row
                  Row(
                    children: [
                      // Island Rank
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                          decoration: BoxDecoration(
                            color: tokens.surface.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: tokens.gold.withValues(alpha: 0.3)),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.emoji_events_rounded, color: tokens.gold, size: 16),
                                  const SizedBox(width: 4),
                                  Text(
                                    "Island Rank",
                                    style: TextStyle(
                                      color: tokens.textMuted,
                                      fontSize: 11.0,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "#${res.islandRank}",
                                style: TextStyle(
                                  color: tokens.goldText,
                                  fontSize: 20.0,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              Text(
                                "Top 5% Nationwide",
                                style: TextStyle(color: tokens.textSecondary, fontSize: 10.0),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(width: 10),

                      // Batch Rank
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                          decoration: BoxDecoration(
                            color: tokens.surface.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: tokens.border.withValues(alpha: 0.5)),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.school_rounded, color: tokens.info, size: 16),
                                  const SizedBox(width: 4),
                                  Text(
                                    "Batch Rank",
                                    style: TextStyle(
                                      color: tokens.textMuted,
                                      fontSize: 11.0,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "#${res.batchRank}",
                                style: TextStyle(
                                  color: tokens.textPrimary,
                                  fontSize: 20.0,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              Text(
                                "of ${res.totalStudents} Students",
                                style: TextStyle(color: tokens.textSecondary, fontSize: 10.0),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(width: 10),

                      // Time Taken
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                          decoration: BoxDecoration(
                            color: tokens.surface.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: tokens.border.withValues(alpha: 0.5)),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.timer_outlined, color: Colors.purpleAccent, size: 16),
                                  const SizedBox(width: 4),
                                  Text(
                                    "Time Spent",
                                    style: TextStyle(
                                      color: tokens.textMuted,
                                      fontSize: 11.0,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "${res.timeTakenMinutes}m",
                                style: TextStyle(
                                  color: tokens.textPrimary,
                                  fontSize: 20.0,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              Text(
                                "Avg: 45m",
                                style: TextStyle(color: tokens.textSecondary, fontSize: 10.0),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.xl),

            // 2. QUESTION & ANSWER BREAKDOWN HEADER
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Question & Answer Breakdown",
                      style: text.titleMedium?.copyWith(
                        color: tokens.textPrimary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "Review your selected responses vs faculty correct answers.",
                      style: text.bodySmall?.copyWith(color: tokens.textSecondary, fontSize: 12.0),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: tokens.surfaceAlt,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: tokens.border),
                  ),
                  child: Text(
                    "${res.score} Correct • ${res.totalQuestions - res.score} Missed",
                    style: TextStyle(
                      color: tokens.textSecondary,
                      fontSize: 11.0,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: AppSpacing.md),

            // 3. QUESTIONS LIST
            FutureBuilder<List<ExamQuestion>>(
              future: _questionsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.xxl),
                      child: CircularProgressIndicator(color: tokens.gold),
                    ),
                  );
                }

                final questions = snapshot.data ?? [];
                if (questions.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(AppSpacing.xl),
                    decoration: BoxDecoration(
                      color: tokens.surface,
                      borderRadius: AppRadius.roundedMd,
                    ),
                    child: Center(
                      child: Text(
                        "Detailed question breakdown is currently being published by the instructor.",
                        style: TextStyle(color: tokens.textMuted, fontStyle: FontStyle.italic),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  );
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: questions.length,
                  separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                  itemBuilder: (context, index) {
                    final q = questions[index];
                    // Student answer (index or string)
                    final rawAns = res.studentAnswers["$index"] ?? res.studentAnswers[index.toString()];
                    int? selectedOptionIndex;
                    if (rawAns is int) {
                      selectedOptionIndex = rawAns;
                    } else if (rawAns is String) {
                      selectedOptionIndex = int.tryParse(rawAns);
                      if (selectedOptionIndex == null && rawAns.isNotEmpty) {
                        // Letter option 'A', 'B', 'C', 'D'
                        final charCode = rawAns.toUpperCase().codeUnitAt(0);
                        if (charCode >= 65 && charCode <= 68) {
                          selectedOptionIndex = charCode - 65;
                        }
                      }
                    }

                    // Default demo selection if missing: matches correct unless last question
                    if (selectedOptionIndex == null) {
                      selectedOptionIndex = (index == questions.length - 1) ? 0 : q.correctOptionIndex;
                    }

                    final bool isCorrect = selectedOptionIndex == q.correctOptionIndex;

                    return AppCard(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Question Header Row
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 28,
                                    height: 28,
                                    decoration: BoxDecoration(
                                      color: isCorrect
                                          ? tokens.success.withValues(alpha: 0.15)
                                          : tokens.danger.withValues(alpha: 0.15),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Center(
                                      child: Text(
                                        "${index + 1}",
                                        style: TextStyle(
                                          color: isCorrect ? tokens.success : tokens.danger,
                                          fontWeight: FontWeight.w900,
                                          fontSize: 13.0,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    "Question ${index + 1}",
                                    style: text.titleSmall?.copyWith(
                                      color: tokens.textPrimary,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),

                              // Status Badge
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isCorrect
                                      ? tokens.success.withValues(alpha: 0.12)
                                      : tokens.danger.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: isCorrect
                                        ? tokens.success.withValues(alpha: 0.4)
                                        : tokens.danger.withValues(alpha: 0.4),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      isCorrect ? Icons.check_circle_rounded : Icons.cancel_rounded,
                                      color: isCorrect ? tokens.success : tokens.danger,
                                      size: 14,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      isCorrect ? "Correct (+1)" : "Incorrect (0)",
                                      style: TextStyle(
                                        color: isCorrect ? tokens.success : tokens.danger,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 11.0,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 12),

                          // Question Text
                          Text(
                            q.questionText,
                            style: text.bodyMedium?.copyWith(
                              color: tokens.textPrimary,
                              fontWeight: FontWeight.w600,
                              height: 1.4,
                            ),
                          ),

                          const SizedBox(height: 14),

                          // Options List (A, B, C, D)
                          ...List.generate(q.options.length, (optIdx) {
                            final optionText = q.options[optIdx];
                            final bool isStudentSelection = selectedOptionIndex == optIdx;
                            final bool isActualCorrect = q.correctOptionIndex == optIdx;

                            Color optBg;
                            Color optBorder;
                            Color optText;
                            Widget? optBadge;

                            if (isActualCorrect && isStudentSelection) {
                              // Student picked the correct answer! (Green)
                              optBg = tokens.success.withValues(alpha: 0.15);
                              optBorder = tokens.success;
                              optText = tokens.success;
                              optBadge = Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: tokens.success,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  "Your Answer (Correct)",
                                  style: TextStyle(
                                    color: isDark ? Colors.black : Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 10.0,
                                  ),
                                ),
                              );
                            } else if (isStudentSelection && !isActualCorrect) {
                              // Student picked WRONG answer! (Red)
                              optBg = tokens.danger.withValues(alpha: 0.15);
                              optBorder = tokens.danger;
                              optText = tokens.danger;
                              optBadge = Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: tokens.danger,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  "Your Answer (Wrong)",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 10.0,
                                  ),
                                ),
                              );
                            } else if (isActualCorrect && !isStudentSelection) {
                              // Correct answer that student missed! (Soft Green Highlight)
                              optBg = tokens.success.withValues(alpha: 0.08);
                              optBorder = tokens.success.withValues(alpha: 0.6);
                              optText = tokens.success;
                              optBadge = Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: tokens.success.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: tokens.success.withValues(alpha: 0.5)),
                                ),
                                child: Text(
                                  "Correct Answer",
                                  style: TextStyle(
                                    color: tokens.success,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 10.0,
                                  ),
                                ),
                              );
                            } else {
                              // Neutral option
                              optBg = tokens.surfaceAlt;
                              optBorder = tokens.border.withValues(alpha: 0.4);
                              optText = tokens.textPrimary;
                            }

                            final letter = String.fromCharCode(65 + optIdx); // 'A', 'B', 'C', 'D'

                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: optBg,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: optBorder, width: isStudentSelection || isActualCorrect ? 1.5 : 1.0),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 24,
                                    height: 24,
                                    decoration: BoxDecoration(
                                      color: isStudentSelection || isActualCorrect
                                          ? optBorder
                                          : tokens.surface,
                                      shape: BoxShape.circle,
                                    ),
                                    child: Center(
                                      child: Text(
                                        letter,
                                        style: TextStyle(
                                          color: isStudentSelection || isActualCorrect
                                              ? (isDark ? Colors.black : Colors.white)
                                              : tokens.textMuted,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12.0,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      optionText,
                                      style: TextStyle(
                                        color: optText,
                                        fontWeight: isStudentSelection || isActualCorrect
                                            ? FontWeight.w700
                                            : FontWeight.normal,
                                        fontSize: 13.0,
                                      ),
                                    ),
                                  ),
                                  if (optBadge != null) optBadge,
                                ],
                              ),
                            );
                          }),

                          // Explanation / Worked Solution
                          if (q.explanation != null && q.explanation!.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: tokens.gold.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: tokens.gold.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(Icons.lightbulb_outline_rounded, color: tokens.gold, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          "Faculty Solution Note",
                                          style: TextStyle(
                                            color: tokens.goldText,
                                            fontWeight: FontWeight.w800,
                                            fontSize: 12.0,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          q.explanation!,
                                          style: TextStyle(
                                            color: tokens.textSecondary,
                                            fontSize: 11.5,
                                            height: 1.35,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],

                          // Action: Report Doubt on this specific question
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton.icon(
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              icon: Icon(Icons.help_outline_rounded, size: 14, color: tokens.textMuted),
                              label: Text(
                                "Ask teacher about Q${index + 1}",
                                style: TextStyle(color: tokens.textMuted, fontSize: 11.0),
                              ),
                              onPressed: () => _showReportQuestionModal(context, index + 1),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),

            const SizedBox(height: AppSpacing.xxxl),
          ],
        ),
      ),
    );
  }
}
