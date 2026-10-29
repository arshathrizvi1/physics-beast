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
    });
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
  }) async {
    final double percentage = (score / totalQuestions) * 100.0;
    final int xpGained = score * 20;

    // Record submission
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
      id: "q1",
      questionText: "What is the dimensional formula for gravitational potential?",
      options: ["[M L² T⁻²]", "[M⁰ L² T⁻²]", "[M L T⁻¹]", "[M⁻¹ L³ T⁻²]"],
      correctOptionIndex: 1,
      explanation: "Gravitational potential is work done per unit mass: J/kg = [L² T⁻²].",
    ),
    ExamQuestion(
      id: "q2",
      questionText: "A body moves in a circular path of radius r with constant speed v. What is its acceleration?",
      options: ["Zero", "v / r directed tangentially", "v² / r directed toward the center", "v² / r directed outward"],
      correctOptionIndex: 2,
      explanation: "Centripetal acceleration is directed toward the center with magnitude v²/r.",
    ),
  ];
}
