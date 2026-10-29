import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/exam_model.dart';
import '../../../services/auth_service.dart';
import '../../../services/exam_service.dart';
import '../../widgets/custom_button.dart';

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
      );
    }

    if (!mounted) return;

    final double percentage = _questions.isNotEmpty
        ? (correctCount / _questions.length) * 100
        : 0;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          isAuto ? "Time Expired - Submitted" : "Exam Completed!",
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.gold.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.stars_rounded, color: AppColors.gold, size: 44),
            ),
            const SizedBox(height: 16),
            Text(
              "$correctCount / ${_questions.length} Correct",
              style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              "${percentage.toStringAsFixed(1)}% Score • +${correctCount * 20} XP Earned",
              style: const TextStyle(color: AppColors.emerald, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          CustomButton(
            text: "Return to Dashboard",
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
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator(color: AppColors.gold)),
      );
    }

    final currentQuestion = _questions[_currentIndex];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(
          widget.exam.title,
          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16, top: 10, bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: _remainingSeconds < 300
                  ? AppColors.danger.withOpacity(0.15)
                  : AppColors.gold.withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _remainingSeconds < 300 ? AppColors.danger : AppColors.gold,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.timer_outlined,
                  size: 16,
                  color: _remainingSeconds < 300 ? AppColors.danger : AppColors.gold,
                ),
                const SizedBox(width: 6),
                Text(
                  _formatTimer(_remainingSeconds),
                  style: TextStyle(
                    color: _remainingSeconds < 300 ? AppColors.danger : AppColors.gold,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Question Progress Indicator
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Question ${_currentIndex + 1} of ${_questions.length}",
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    "${_selectedAnswers.length} Answered",
                    style: const TextStyle(
                      color: AppColors.emerald,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: (_currentIndex + 1) / _questions.length,
                backgroundColor: AppColors.cardBorder,
                valueColor: const AlwaysStoppedAnimation(AppColors.gold),
                borderRadius: BorderRadius.circular(6),
              ),
              const SizedBox(height: 24),

              // Question Statement Box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Text(
                  currentQuestion.questionText,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Options
              Expanded(
                child: ListView.builder(
                  itemCount: currentQuestion.options.length,
                  itemBuilder: (context, optIdx) {
                    final isSelected = _selectedAnswers[_currentIndex] == optIdx;

                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedAnswers[_currentIndex] = optIdx;
                        });
                      },
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.gold.withOpacity(0.12)
                              : AppColors.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected ? AppColors.gold : AppColors.cardBorder,
                            width: isSelected ? 1.5 : 1.0,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: isSelected ? AppColors.gold : Colors.transparent,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isSelected ? AppColors.gold : AppColors.textMuted,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  String.fromCharCode(65 + optIdx),
                                  style: TextStyle(
                                    color: isSelected ? Colors.black : Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Text(
                                currentQuestion.options[optIdx],
                                style: TextStyle(
                                  color: isSelected ? Colors.white : AppColors.textSecondary,
                                  fontSize: 14,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
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
                      child: CustomButton(
                        text: "Previous",
                        isSecondary: true,
                        onPressed: () => setState(() => _currentIndex--),
                      ),
                    ),
                  if (_currentIndex > 0) const SizedBox(width: 12),
                  Expanded(
                    child: CustomButton(
                      text: _currentIndex == _questions.length - 1 ? "Submit Exam" : "Next",
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
