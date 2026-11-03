import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/theme_x.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/app_buttons.dart';
import '../../../data/models/exam_model.dart';
import '../../../services/auth_service.dart';
import '../../../services/exam_service.dart';

class ExamTakeScreen extends StatefulWidget {
  final Exam exam;

  const ExamTakeScreen({super.key, required this.exam});

  @override
  State<ExamTakeScreen> createState() => _ExamTakeScreenState();
}

class _ExamTakeScreenState extends State<ExamTakeScreen> {
  final ExamService _examService = ExamService();
  List<ExamQuestion> _questions = [];
  bool _isLoading = true;

  int _currentIndex = 0;
  final Map<int, int> _selectedAnswers = {}; // questionIndex -> optionIndex
  Timer? _countdownTimer;
  late int _remainingSeconds;

  @override
  void initState() {
    super.initState();
    _remainingSeconds = widget.exam.durationMinutes * 60;
    _loadExamQuestions();
  }

  Future<void> _loadExamQuestions() async {
    final list = await _examService.getQuestionsForExam(widget.exam.id);
    if (mounted) {
      setState(() {
        _questions = list;
        _isLoading = false;
      });
      _startTimer();
    }
  }

  void _startTimer() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_remainingSeconds > 0) {
        setState(() => _remainingSeconds--);
      } else {
        _countdownTimer?.cancel();
        _autoSubmit();
      }
    });
  }

  void _autoSubmit() {
    _submitExam(isAuto: true);
  }

  Future<void> _submitExam({bool isAuto = false}) async {
    _countdownTimer?.cancel();

    int correctCount = 0;
    for (int i = 0; i < _questions.length; i++) {
      if (_selectedAnswers[i] == _questions[i].correctOptionIndex) {
        correctCount++;
      }
    }

    final authService = Provider.of<AuthService>(context, listen: false);
    final user = authService.currentUser;

    if (user != null) {
      await _examService.submitExamResult(
        uid: user.uid,
        examId: widget.exam.id,
        score: correctCount,
        totalQuestions: _questions.length,
        examTitle: widget.exam.title,
        subject: widget.exam.subject,
      );
    }

    if (!mounted) return;

    final tokens = context.tokens;
    final text = context.text;
    final double percentage = _questions.isNotEmpty
        ? (correctCount / _questions.length) * 100.0
        : 0.0;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: tokens.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20.0)),
        title: Text(
          isAuto ? "Time Expired - Submitted" : "Exam Completed!",
          style: text.titleMedium?.copyWith(
            color: tokens.textPrimary,
            fontWeight: FontWeight.w800,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72.0,
              height: 72.0,
              decoration: BoxDecoration(
                color: tokens.gold.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.stars_rounded, color: tokens.gold, size: 44.0),
            ),
            const SizedBox(height: 16.0),
            Text(
              "$correctCount / ${_questions.length} Correct",
              style: text.headlineSmall?.copyWith(
                color: tokens.textPrimary,
                fontSize: 22.0,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 6.0),
            Text(
              "${percentage.toStringAsFixed(1)}% Score • +${correctCount * 20} XP Earned",
              style: TextStyle(
                color: tokens.success,
                fontWeight: FontWeight.w800,
                fontSize: 13.5,
              ),
            ),
          ],
        ),
        actions: [
          PrimaryButton(
            text: "Return to Dashboard",
            height: 46.0,
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  String _formatTimer(int totalSeconds) {
    final mins = (totalSeconds ~/ 60).toString().padLeft(2, '0');
    final secs = (totalSeconds % 60).toString().padLeft(2, '0');
    return "$mins:$secs";
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;

    if (_isLoading) {
      return AppScaffold(
        body: Center(
          child: CircularProgressIndicator(color: tokens.gold),
        ),
      );
    }

    final currentQuestion = _questions[_currentIndex];

    return AppScaffold(
      appBar: AppBar(
        title: Text(
          widget.exam.title,
          style: text.titleMedium?.copyWith(
            color: tokens.textPrimary,
            fontSize: 16.0,
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16.0, top: 10.0, bottom: 10.0),
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 4.0),
            decoration: BoxDecoration(
              color: _remainingSeconds < 300
                  ? tokens.danger.withValues(alpha: 0.15)
                  : tokens.gold.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20.0),
              border: Border.all(
                color: _remainingSeconds < 300 ? tokens.danger : tokens.gold,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.timer_outlined,
                  size: 16.0,
                  color: _remainingSeconds < 300 ? tokens.danger : tokens.goldText,
                ),
                const SizedBox(width: 6.0),
                Text(
                  _formatTimer(_remainingSeconds),
                  style: TextStyle(
                    color: _remainingSeconds < 300 ? tokens.danger : tokens.goldText,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.0,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Question Progress Indicator
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Question ${_currentIndex + 1} of ${_questions.length}",
                    style: text.labelMedium?.copyWith(
                      color: tokens.textMuted,
                      fontWeight: FontWeight.w600,
                      fontSize: 13.0,
                    ),
                  ),
                  Text(
                    "${_selectedAnswers.length} Answered",
                    style: TextStyle(
                      color: tokens.success,
                      fontSize: 13.0,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8.0),
              LinearProgressIndicator(
                value: (_currentIndex + 1) / _questions.length,
                backgroundColor: tokens.border,
                valueColor: AlwaysStoppedAnimation(tokens.gold),
                borderRadius: BorderRadius.circular(6.0),
              ),
              const SizedBox(height: 24.0),

              // Question Statement Box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: tokens.surface,
                  borderRadius: BorderRadius.circular(16.0),
                  border: Border.all(color: tokens.border.withValues(alpha: 0.8)),
                  boxShadow: isDark ? null : tokens.e1,
                ),
                child: Text(
                  currentQuestion.questionText,
                  style: text.bodyLarge?.copyWith(
                    color: tokens.textPrimary,
                    fontSize: 16.0,
                    fontWeight: FontWeight.w700,
                    height: 1.45,
                  ),
                ),
              ),
              const SizedBox(height: 20.0),

              // Options
              Expanded(
                child: ListView.builder(
                  itemCount: currentQuestion.options.length,
                  itemBuilder: (context, optIdx) {
                    final isSelected = _selectedAnswers[_currentIndex] == optIdx;

                    return GestureDetector(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        setState(() {
                          _selectedAnswers[_currentIndex] = optIdx;
                        });
                      },
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12.0),
                        padding: const EdgeInsets.all(16.0),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? tokens.gold.withValues(alpha: isDark ? 0.2 : 0.12)
                              : tokens.surface,
                          borderRadius: BorderRadius.circular(14.0),
                          border: Border.all(
                            color: isSelected ? tokens.gold : tokens.border,
                            width: isSelected ? 1.6 : 1.0,
                          ),
                          boxShadow: isDark ? null : tokens.e1,
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 32.0,
                              height: 32.0,
                              decoration: BoxDecoration(
                                color: isSelected ? tokens.gold : tokens.surfaceAlt,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isSelected ? tokens.gold : tokens.border,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  String.fromCharCode(65 + optIdx),
                                  style: TextStyle(
                                    color: isSelected ? tokens.onGold : tokens.textPrimary,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13.0,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 14.0),
                            Expanded(
                              child: Text(
                                currentQuestion.options[optIdx],
                                style: text.bodyMedium?.copyWith(
                                  color: isSelected ? tokens.textPrimary : tokens.textSecondary,
                                  fontSize: 14.0,
                                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              // Bottom Navigation & Submit
              Row(
                children: [
                  if (_currentIndex > 0)
                    Expanded(
                      child: SecondaryButton(
                        text: "Previous",
                        height: 48.0,
                        onPressed: () => setState(() => _currentIndex--),
                      ),
                    ),
                  if (_currentIndex > 0) const SizedBox(width: 12.0),
                  Expanded(
                    child: PrimaryButton(
                      text: _currentIndex == _questions.length - 1 ? "Submit Exam" : "Next",
                      height: 48.0,
                      onPressed: () {
                        if (_currentIndex == _questions.length - 1) {
                          _submitExam();
                        } else {
                          setState(() => _currentIndex++);
                        }
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
