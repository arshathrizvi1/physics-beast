import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/exam_service.dart';
import '../../../data/models/exam_model.dart';
import 'exam_take_screen.dart';
import '../leaderboard/leaderboard_screen.dart';

class ExamsScreen extends StatelessWidget {
  const ExamsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final examService = ExamService();

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.background,
          elevation: 0,
          title: const Text(
            "Exams & Assessments",
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          bottom: const TabBar(
            indicatorColor: AppColors.gold,
            labelColor: AppColors.gold,
            unselectedLabelColor: AppColors.textMuted,
            labelStyle: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            tabs: [
              Tab(text: "Active Papers"),
              Tab(text: "Island Leaderboard"),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Tab 1: Available Exams
            StreamBuilder<List<Exam>>(
              stream: examService.getExamsStream(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: AppColors.gold));
                }

                final exams = snapshot.data ?? [];

                if (exams.isEmpty) {
                  return const Center(
                    child: Text("No exams scheduled currently.", style: TextStyle(color: AppColors.textMuted)),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(20),
                  itemCount: exams.length,
                  itemBuilder: (context, index) {
                    final exam = exams[index];
                    return _buildExamCard(context, exam);
                  },
                );
              },
            ),

            // Tab 2: Leaderboard
            const LeaderboardScreen(),
          ],
        ),
      ),
    );
  }

  Widget _buildExamCard(BuildContext context, Exam exam) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.gold.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.gold.withOpacity(0.3)),
                ),
                child: Text(
                  exam.subject,
                  style: const TextStyle(
                    color: AppColors.gold,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Row(
                children: [
                  const Icon(Icons.timer_outlined, size: 16, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text(
                    "${exam.durationMinutes} mins",
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            exam.title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 17,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.help_outline, size: 16, color: AppColors.cyan),
              const SizedBox(width: 6),
              Text(
                "${exam.totalQuestions} Questions • Timed Submission",
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ExamTakeScreen(exam: exam),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.surface,
                side: const BorderSide(color: AppColors.gold, width: 1.2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.edit_note, color: AppColors.gold),
                  SizedBox(width: 8),
                  Text(
                    "Start Exam Paper",
                    style: TextStyle(
                      color: AppColors.gold,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
