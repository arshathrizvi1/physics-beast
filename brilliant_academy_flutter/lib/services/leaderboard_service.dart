import 'package:cloud_firestore/cloud_firestore.dart';
import '../data/models/exam_model.dart';
import '../core/constants/app_constants.dart';

class LeaderboardService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<LeaderboardEntry>> getLeaderboardStream() {
    return _firestore
        .collection(AppConstants.colUsers)
        .where('role', isEqualTo: 'student')
        .orderBy('totalXp', descending: true)
        .limit(50)
        .snapshots()
        .map((snapshot) {
      if (snapshot.docs.isEmpty) {
        return _fallbackLeaderboard;
      }
      int rank = 1;
      return snapshot.docs.map((doc) {
        final entry = LeaderboardEntry.fromMap(doc.data(), rank);
        rank++;
        return entry;
      }).toList();
    });
  }

  static final List<LeaderboardEntry> _fallbackLeaderboard = [
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
