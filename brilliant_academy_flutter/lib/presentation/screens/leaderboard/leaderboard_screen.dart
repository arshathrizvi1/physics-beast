import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/leaderboard_service.dart';
import '../../../data/models/exam_model.dart';

class LeaderboardScreen extends StatelessWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final leaderboardService = LeaderboardService();

    return StreamBuilder<List<LeaderboardEntry>>(
      stream: leaderboardService.getLeaderboardStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: AppColors.gold));
        }

        final list = snapshot.data ?? [];

        if (list.isEmpty) {
          return const Center(
            child: Text("Leaderboard updating...", style: TextStyle(color: AppColors.textMuted)),
          );
        }

        final top3 = list.take(3).toList();
        final rest = list.skip(3).toList();

        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Top 3 Podium
            if (top3.isNotEmpty) _buildPodium(top3),
            const SizedBox(height: 24),

            const Text(
              "Top Performing Students",
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),

            // Ranking List (Rank 4+)
            ...rest.map((entry) => _buildRankTile(entry)),
          ],
        );
      },
    );
  }

  Widget _buildPodium(List<LeaderboardEntry> top3) {
    LeaderboardEntry? first = top3.isNotEmpty ? top3[0] : null;
    LeaderboardEntry? second = top3.length > 1 ? top3[1] : null;
    LeaderboardEntry? third = top3.length > 2 ? top3[2] : null;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // 2nd Place
          if (second != null) _buildPodiumPillar(second, "2", const Color(0xFFC0C0C0), 100),
          const SizedBox(width: 12),
          // 1st Place (Center, tallest)
          if (first != null) _buildPodiumPillar(first, "1", AppColors.gold, 130, isFirst: true),
          const SizedBox(width: 12),
          // 3rd Place
          if (third != null) _buildPodiumPillar(third, "3", const Color(0xFFCD7F32), 85),
        ],
      ),
    );
  }

  Widget _buildPodiumPillar(LeaderboardEntry entry, String rankStr, Color color, double height, {bool isFirst = false}) {
    return Expanded(
      child: Column(
        children: [
          if (isFirst)
            const Icon(Icons.emoji_events, color: AppColors.gold, size: 28),
          const SizedBox(height: 4),
          CircleAvatar(
            radius: isFirst ? 26 : 22,
            backgroundColor: color.withOpacity(0.2),
            child: Text(
              entry.name.isNotEmpty ? entry.name[0] : "S",
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: isFirst ? 18 : 15,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            entry.name.split(' ').first,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            "${entry.xp} XP",
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            height: height,
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color.withOpacity(0.3), color.withOpacity(0.08)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              border: Border.all(color: color.withOpacity(0.4)),
            ),
            child: Center(
              child: Text(
                rankStr,
                style: TextStyle(
                  color: color,
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRankTile(LeaderboardEntry entry) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                "#${entry.rank}",
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                Text(
                  entry.studentId,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.gold.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              "${entry.xp} XP",
              style: const TextStyle(
                color: AppColors.gold,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
