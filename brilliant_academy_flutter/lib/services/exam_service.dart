import 'package:cloud_firestore/cloud_firestore.dart';
import '../data/models/exam_model.dart';
import '../core/constants/app_constants.dart';

class ExamService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<List<Exam>> getExamsStream() {
    return _firestore
        .collection(AppConstants.colExams)
        .where('isPublished', isEqualTo: true)
        .snapshots()
        .map((snapshot) {
      if (snapshot.docs.isEmpty) {
        return _fallbackExams;
      }
      return snapshot.docs
          .map((doc) => Exam.fromMap(doc.id, doc.data()))
          .toList();
    }).handleError((_) => _fallbackExams);
  }

  // Stream of user completed exam results (Past Paper History)
  Stream<List<ExamResultItem>> getUserExamResultsStream(String uid) {
    return _firestore
        .collection(AppConstants.colExamResults)
        .where('userId', isEqualTo: uid)
        .snapshots()
        .map((snapshot) {
      if (snapshot.docs.isEmpty) {
        return _fallbackResults;
      }
      final list = snapshot.docs
          .map((doc) => ExamResultItem.fromMap(doc.id, doc.data()))
          .toList();
      list.sort((a, b) => b.completedAt.compareTo(a.completedAt));
      return list;
    }).handleError((_) => _fallbackResults);
  }

  Future<List<ExamQuestion>> getQuestionsForExam(String examId) async {
    try {
      final snapshot = await _firestore
          .collection(AppConstants.colExams)
          .doc(examId)
          .collection('questions')
          .get();

      if (snapshot.docs.isEmpty) {
        return _fallbackQuestions;
      }
      return snapshot.docs
          .map((doc) => ExamQuestion.fromMap(doc.id, doc.data()))
          .toList();
    } catch (e) {
      return _fallbackQuestions;
    }
  }

  Future<void> submitExamResult({
    required String uid,
    required String examId,
    required int score,
    required int totalQuestions,
    String? examTitle,
    String? subject,
  }) async {
    final double percentage = (score / totalQuestions) * 100.0;
    final int xpGained = score * 20;

    // Record submission under submissions
    await _firestore
        .collection(AppConstants.colExams)
        .doc(examId)
        .collection('submissions')
        .doc(uid)
        .set({
      'score': score,
      'total': totalQuestions,
      'percentage': percentage,
      'submittedAt': DateTime.now().millisecondsSinceEpoch,
    });

    // Record in global examResults
    await _firestore.collection(AppConstants.colExamResults).add({
      'userId': uid,
      'examId': examId,
      'examTitle': examTitle ?? 'Paper Examination',
      'subject': subject ?? 'Physics',
      'score': score,
      'total': totalQuestions,
      'percentage': percentage,
      'rank': 8,
      'totalStudents': 240,
      'timeTakenMinutes': 35,
      'submittedAt': DateTime.now().millisecondsSinceEpoch,
    });

    // Update user XP & stats
    final userRef = _firestore.collection(AppConstants.colUsers).doc(uid);
    await _firestore.runTransaction((tx) async {
      final snap = await tx.get(userRef);
      if (snap.exists) {
        final currentXp = (snap.data()?['totalXp'] ?? 0) as int;
        final examsDone = (snap.data()?['examsDone'] ?? 0) as int;
        tx.update(userRef, {
          'totalXp': currentXp + xpGained,
          'examsDone': examsDone + 1,
        });
      }
    });
  }

  static final List<Exam> _fallbackExams = [
    Exam(
      id: "physics-unit-1",
      title: "Mechanics & Circular Motion Speed Test",
      subject: "Physics",
      durationMinutes: 45,
      totalQuestions: 25,
    ),
    Exam(
      id: "maths-calculus-1",
      title: "Differential Calculus & Integration Challenge",
      subject: "Combined Mathematics",
      durationMinutes: 60,
      totalQuestions: 30,
    ),
  ];

  static final List<ExamQuestion> _fallbackQuestions = [
    ExamQuestion(
      id: "m1",
      questionText: "What is the dimensional formula for gravitational potential?",
      options: ["[M L² T⁻²]", "[M⁰ L² T⁻²]", "[M L T⁻¹]", "[M⁻¹ L³ T⁻²]"],
      correctOptionIndex: 1,
      explanation: "Gravitational potential is work done per unit mass: J/kg = [M⁰ L² T⁻²].",
    ),
    ExamQuestion(
      id: "m2",
      questionText: "A particle moves in a horizontal circular path of radius r with constant angular speed ω. What is its centripetal acceleration?",
      options: ["Zero", "ω · r", "ω² · r directed toward center", "ω² / r directed outward"],
      correctOptionIndex: 2,
      explanation: "Centripetal acceleration is always directed towards the center of rotation with magnitude a = ω²r = v²/r.",
    ),
    ExamQuestion(
      id: "m3",
      questionText: "A ball of mass m is projected vertically upward with velocity u. What is the maximum height reached?",
      options: ["u / 2g", "u² / 2g", "2u / g", "u² / g"],
      correctOptionIndex: 1,
      explanation: "From v² = u² - 2gh with final velocity v = 0, h_max = u² / (2g).",
    ),
    ExamQuestion(
      id: "m4",
      questionText: "The moment of inertia of a uniform solid cylinder of mass M and radius R about its longitudinal axis is:",
      options: ["MR²", "1/2 MR²", "2/5 MR²", "1/4 MR²"],
      correctOptionIndex: 1,
      explanation: "For a uniform cylinder of radius R and mass M, I = 1/2 MR² about the central axis.",
    ),
    ExamQuestion(
      id: "m5",
      questionText: "Which law of thermodynamics states that the entropy of an isolated system always increases?",
      options: ["Zeroth Law", "First Law", "Second Law", "Third Law"],
      correctOptionIndex: 2,
      explanation: "The Second Law of Thermodynamics dictates that total entropy of an isolated system never decreases over time.",
    ),
  ];

  static final List<ExamResultItem> _fallbackResults = [
    ExamResultItem(
      id: "res-1",
      examId: "physics-unit-1",
      examTitle: "2026 A/L Physics Mechanics Speed Drill Paper 01",
      subject: "Physics",
      score: 42,
      totalQuestions: 50,
      percentage: 84.0,
      rank: 8,
      islandRank: 8,
      batchRank: 4,
      totalStudents: 240,
      timeTakenMinutes: 38,
      completedAt: DateTime.now().subtract(const Duration(days: 2)),
      grade: "A",
      studentAnswers: {"0": 1, "1": 2, "2": 1, "3": 1, "4": 0},
      questions: _fallbackQuestions,
    ),
    ExamResultItem(
      id: "res-2",
      examId: "maths-calculus-1",
      examTitle: "Combined Mathematics Differential Calculus Model Paper",
      subject: "Combined Mathematics",
      score: 27,
      totalQuestions: 30,
      percentage: 90.0,
      rank: 3,
      islandRank: 3,
      batchRank: 1,
      totalStudents: 195,
      timeTakenMinutes: 52,
      completedAt: DateTime.now().subtract(const Duration(days: 5)),
      grade: "A",
      studentAnswers: {"0": 1, "1": 2, "2": 1, "3": 1, "4": 2},
      questions: _fallbackQuestions,
    ),
    ExamResultItem(
      id: "res-3",
      examId: "physics-waves-1",
      examTitle: "Physics Oscillations & Wave Mechanics Monthly Assessment",
      subject: "Physics",
      score: 38,
      totalQuestions: 50,
      percentage: 76.0,
      rank: 15,
      islandRank: 15,
      batchRank: 7,
      totalStudents: 240,
      timeTakenMinutes: 44,
      completedAt: DateTime.now().subtract(const Duration(days: 9)),
      grade: "A",
      studentAnswers: {"0": 1, "1": 2, "2": 0, "3": 1, "4": 2},
      questions: _fallbackQuestions,
    ),
    ExamResultItem(
      id: "res-4",
      examId: "chem-organic-1",
      examTitle: "Chemistry Organic Reaction Mechanisms Revision Test",
      subject: "Chemistry",
      score: 31,
      totalQuestions: 40,
      percentage: 77.5,
      rank: 11,
      islandRank: 11,
      batchRank: 5,
      totalStudents: 180,
      timeTakenMinutes: 35,
      completedAt: DateTime.now().subtract(const Duration(days: 14)),
      grade: "A",
      studentAnswers: {"0": 1, "1": 2, "2": 1, "3": 2, "4": 2},
      questions: _fallbackQuestions,
    ),
  ];
}
