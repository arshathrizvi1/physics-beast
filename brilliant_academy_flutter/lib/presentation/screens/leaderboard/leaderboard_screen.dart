import 'package:flutter/material.dart';
import '../../../core/theme/theme_x.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_card.dart';
import '../../../services/leaderboard_service.dart';
import '../../../data/models/exam_model.dart';

class LeaderboardScreen extends StatelessWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final leaderboardService = LeaderboardService();

    return StreamBuilder<List<LeaderboardEntry>>(
      stream: leaderboardService.getLeaderboardStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Center(
            child: CircularProgressIndicator(color: tokens.gold),
          );
        }

        final list = snapshot.data ?? LeaderboardService.fallbackLeaderboard;

        if (list.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.leaderboard_rounded, size: 48, color: tokens.textMuted),
                const SizedBox(height: 12),
                Text(
                  "Leaderboard Updating",
                  style: text.titleMedium?.copyWith(
                    color: tokens.textPrimary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  "Rankings will update as examination papers are evaluated.",
                  style: text.bodySmall?.copyWith(color: tokens.textMuted),
                ),
              ],
            ),
          );
        }

        final top3 = list.take(3).toList();
        final rest = list.skip(3).toList();

        return ListView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
          children: [
            // Top 3 Podium Card
            if (top3.isNotEmpty) _buildPodium(context, top3),
            const SizedBox(height: AppSpacing.xl),

            Row(
              children: [
                Icon(Icons.workspace_premium_rounded, size: 18, color: tokens.goldText),
                const SizedBox(width: 8),
                Text(
                  "Top Performing Students",
                  style: text.titleMedium?.copyWith(
                    color: tokens.textPrimary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),

            // Ranking List (Rank 4+)
            ...rest.map((entry) => _buildRankTile(context, entry)),
            const SizedBox(height: AppSpacing.huge),
          ],
        );
      },
    );
  }

  Widget _buildPodium(BuildContext context, List<LeaderboardEntry> top3) {
    final tokens = context.tokens;

    LeaderboardEntry? first = top3.isNotEmpty ? top3[0] : null;
    LeaderboardEntry? second = top3.length > 1 ? top3[1] : null;
    LeaderboardEntry? third = top3.length > 2 ? top3[2] : null;

    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // 2nd Place
          if (second != null)
            _buildPodiumPillar(
              context,
              second,
              "2",
              const Color(0xFF94A3B8),
              100,
            ),
          const SizedBox(width: 12),
          // 1st Place (Center, tallest)
          if (first != null)
            _buildPodiumPillar(
              context,
              first,
              "1",
              tokens.gold,
              130,
              isFirst: true,
            ),
          const SizedBox(width: 12),
          // 3rd Place
          if (third != null)
            _buildPodiumPillar(
              context,
              third,
              "3",
              const Color(0xFFD97706),
              85,
            ),
        ],
      ),
    );
  }

  Widget _buildPodiumPillar(
    BuildContext context,
    LeaderboardEntry entry,
    String rankStr,
    Color color,
    double height, {
    bool isFirst = false,
  }) {
    final tokens = context.tokens;
    final text = context.text;

    return Expanded(
      child: Column(
        children: [
          if (isFirst)
            Icon(Icons.emoji_events, color: tokens.gold, size: 28)
          else
            const SizedBox(height: 28),
          const SizedBox(height: 4),
          CircleAvatar(
            radius: isFirst ? 26.0 : 22.0,
            backgroundColor: color.withValues(alpha: 0.18),
            child: Text(
              entry.name.isNotEmpty ? entry.name[0] : "S",
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w900,
                fontSize: isFirst ? 18.0 : 15.0,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            entry.name.split(' ').first,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: text.bodySmall?.copyWith(
              color: tokens.textPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
          Text(
            "${entry.xp} XP",
            style: TextStyle(
              color: color,
              fontSize: 11.0,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            height: height,
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color.withValues(alpha: 0.28), color.withValues(alpha: 0.05)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              border: Border.all(color: color.withValues(alpha: 0.4)),
            ),
            child: Center(
              child: Text(
                rankStr,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w900,
                  fontSize: 22.0,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRankTile(BuildContext context, LeaderboardEntry entry) {
    final tokens = context.tokens;
    final text = context.text;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: tokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: tokens.surfaceAlt,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: tokens.border.withValues(alpha: 0.5)),
            ),
            child: Center(
              child: Text(
                "#${entry.rank}",
                style: TextStyle(
                  color: tokens.textMuted,
                  fontWeight: FontWeight.w800,
                  fontSize: 12.0,
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
                  style: text.bodyMedium?.copyWith(
                    color: tokens.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  entry.studentId,
                  style: text.bodySmall?.copyWith(
                    color: tokens.textMuted,
                    fontSize: 11.0,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: tokens.gold.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: tokens.gold.withValues(alpha: 0.3)),
            ),
            child: Text(
              "${entry.xp} XP",
              style: TextStyle(
                color: tokens.goldText,
                fontWeight: FontWeight.w800,
                fontSize: 12.0,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
