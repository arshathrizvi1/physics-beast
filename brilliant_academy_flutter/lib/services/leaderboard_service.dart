import 'package:cloud_firestore/cloud_firestore.dart';
import '../data/models/exam_model.dart';
import '../core/constants/app_constants.dart';

class LeaderboardService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<LeaderboardEntry>> getLeaderboardStream() {
    return _firestore
        .collection(AppConstants.colUsers)
        .snapshots()
        .map((snapshot) {
      if (snapshot.docs.isEmpty) {
        return fallbackLeaderboard;
      }
      final students = snapshot.docs
          .map((doc) => doc.data())
          .where((data) {
            final role = data['role']?.toString().toLowerCase();
            return role == null || role == 'student' || role == '';
          })
          .toList();

      students.sort((a, b) {
        final xpA = (a['totalXp'] as num?)?.toInt() ?? (a['xp'] as num?)?.toInt() ?? 0;
        final xpB = (b['totalXp'] as num?)?.toInt() ?? (b['xp'] as num?)?.toInt() ?? 0;
        return xpB.compareTo(xpA);
      });

      if (students.isEmpty) {
        return fallbackLeaderboard;
      }

      int rank = 1;
      return students.take(50).map((data) {
        final entry = LeaderboardEntry.fromMap(data, rank);
        rank++;
        return entry;
      }).toList();
    }).handleError((_) => fallbackLeaderboard);
  }

  static final List<LeaderboardEntry> fallbackLeaderboard = [
    LeaderboardEntry(
      studentId: "BA-2026-001",
      name: "Kasun Perera",
      xp: 2840,
      averageGrade: 94.5,
      rank: 1,
    ),
    LeaderboardEntry(
      studentId: "BA-2026-014",
      name: "Dinithi Jayasinghe",
      xp: 2610,
      averageGrade: 91.2,
      rank: 2,
    ),
    LeaderboardEntry(
      studentId: "BA-2026-089",
      name: "Ravindu Silva",
      xp: 2450,
      averageGrade: 88.0,
      rank: 3,
    ),
    LeaderboardEntry(
      studentId: "BA-2026-042",
      name: "Anuki Fernando",
      xp: 2190,
      averageGrade: 85.4,
      rank: 4,
    ),
    LeaderboardEntry(
      studentId: "BA-2026-105",
      name: "Shehan Wickramasinghe",
      xp: 1980,
      averageGrade: 82.1,
      rank: 5,
    ),
  ];
}
