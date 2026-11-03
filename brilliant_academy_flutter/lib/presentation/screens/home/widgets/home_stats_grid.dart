import 'package:flutter/material.dart';
import '../../../../core/theme/theme_x.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/stat_tile.dart';
import '../../../../data/models/user_model.dart';

class HomeStatsGrid extends StatelessWidget {
  final UserModel? user;

  const HomeStatsGrid({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;

    final totalXp = "${user?.totalXp ?? 276}";
    final studyStreak = "${user?.streakDays ?? 0} Days";
    final examsDone = "${user?.examsDone ?? 9}";
    final avgGrade = (user != null && user!.averageGrade > 0)
        ? "${user!.averageGrade.toStringAsFixed(1)}%"
        : "A/L Grade";

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenPadding,
        vertical: AppSpacing.sm,
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: StatTile(
                  icon: Icons.military_tech_rounded,
                  value: totalXp,
                  label: "Total XP",
                  accentColor: tokens.gold,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: StatTile(
                  icon: Icons.local_fire_department_rounded,
                  value: studyStreak,
                  label: "Study Streak",
                  accentColor: Colors.deepOrangeAccent,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: StatTile(
                  icon: Icons.assignment_turned_in_rounded,
                  value: examsDone,
                  label: "Exams Completed",
                  accentColor: tokens.success,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: StatTile(
                  icon: Icons.trending_up_rounded,
                  value: avgGrade,
                  label: "Academic Progress",
                  accentColor: tokens.info,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
