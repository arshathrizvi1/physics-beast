class Exam {
  final String id;
  final String title;
  final String subject;
  final int durationMinutes;
  final int totalQuestions;
  final DateTime? deadline;
  final bool isPublished;

  Exam({
    required this.id,
    required this.title,
    required this.subject,
    this.durationMinutes = 60,
    this.totalQuestions = 30,
    this.deadline,
    this.isPublished = true,
  });

  factory Exam.fromMap(String id, Map<String, dynamic> map) {
    return Exam(
      id: id,
      title: map['title'] ?? 'Untitled Exam',
      subject: map['subject'] ?? 'General',
      durationMinutes: (map['durationMinutes'] is num) ? (map['durationMinutes'] as num).toInt() : 60,
      totalQuestions: (map['totalQuestions'] is num) ? (map['totalQuestions'] as num).toInt() : 0,
      deadline: map['deadline'] != null ? DateTime.tryParse(map['deadline'].toString()) : null,
      isPublished: map['isPublished'] ?? true,
    );
  }
}

class ExamQuestion {
  final String id;
  final String questionText;
  final List<String> options;
  final int correctOptionIndex;
  final String? explanation;

  ExamQuestion({
    required this.id,
    required this.questionText,
    required this.options,
    required this.correctOptionIndex,
    this.explanation,
  });

  factory ExamQuestion.fromMap(String id, Map<String, dynamic> map) {
    return ExamQuestion(
      id: id,
      questionText: map['questionText'] ?? map['text'] ?? '',
      options: List<String>.from(map['options'] ?? []),
      correctOptionIndex: (map['correctOptionIndex'] is num) ? (map['correctOptionIndex'] as num).toInt() : 0,
      explanation: map['explanation'],
    );
  }
}

class LeaderboardEntry {
  final String studentId;
  final String name;
  final int xp;
  final double averageGrade;
  final int rank;

  LeaderboardEntry({
    required this.studentId,
    required this.name,
    required this.xp,
    required this.averageGrade,
    required this.rank,
  });

  factory LeaderboardEntry.fromMap(Map<String, dynamic> map, int rank) {
    return LeaderboardEntry(
      studentId: map['studentId'] ?? 'Student',
      name: map['name'] ?? 'Anonymous Student',
      xp: (map['totalXp'] is num) ? (map['totalXp'] as num).toInt() : 0,
      averageGrade: (map['averageGrade'] is num) ? (map['averageGrade'] as num).toDouble() : 0.0,
      rank: rank,
    );
  }
}

class ExamResultItem {
  final String id;
  final String examId;
  final String examTitle;
  final String subject;
  final int score;
  final int totalQuestions;
  final double percentage;
  final int rank;
  final int islandRank;
  final int batchRank;
  final int totalStudents;
  final int timeTakenMinutes;
  final DateTime completedAt;
  final String grade;
  final Map<String, dynamic> studentAnswers;
  final List<ExamQuestion> questions;
  final String? answerPdfUrl;
  final String? correctedPdfUrl;
  final String? feedback;

  int get totalMarks => totalQuestions;
  int get timeSpentMinutes => timeTakenMinutes;

  ExamResultItem({
    required this.id,
    required this.examId,
    required this.examTitle,
    required this.subject,
    required this.score,
    required this.totalQuestions,
    required this.percentage,
    required this.rank,
    int? islandRank,
    int? batchRank,
    this.totalStudents = 150,
    required this.timeTakenMinutes,
    required this.completedAt,
    required this.grade,
    this.studentAnswers = const {},
    this.questions = const [],
    this.answerPdfUrl,
    this.correctedPdfUrl,
    this.feedback,
  })  : islandRank = islandRank ?? rank,
        batchRank = batchRank ?? (rank > 1 ? (rank ~/ 2) + 1 : 1);

  factory ExamResultItem.fromMap(String id, Map<String, dynamic> map) {
    final double pct = (map['percentage'] is num)
        ? (map['percentage'] as num).toDouble()
        : ((map['score'] is num && map['total'] is num && map['total'] > 0)
            ? ((map['score'] as num) / (map['total'] as num)) * 100
            : 0.0);

    String gradeStr = "F";
    if (pct >= 75) gradeStr = "A";
    else if (pct >= 65) gradeStr = "B";
    else if (pct >= 50) gradeStr = "C";
    else if (pct >= 35) gradeStr = "S";

    final int r = (map['rank'] is num)
        ? (map['rank'] as num).toInt()
        : ((map['islandRank'] is num) ? (map['islandRank'] as num).toInt() : 12);

    final rawAnswers = map['answers'] as Map<String, dynamic>? ?? {};

    return ExamResultItem(
      id: id,
      examId: map['examId'] ?? '',
      examTitle: map['examTitle'] ?? map['title'] ?? 'Past Paper Examination',
      subject: map['subject'] ?? 'Physics',
      score: (map['score'] is num) ? (map['score'] as num).toInt() : 0,
      totalQuestions: (map['total'] is num)
          ? (map['total'] as num).toInt()
          : (map['totalQuestions'] is num ? (map['totalQuestions'] as num).toInt() : 50),
      percentage: pct,
      rank: r,
      islandRank: (map['islandRank'] is num) ? (map['islandRank'] as num).toInt() : r,
      batchRank: (map['batchRank'] is num) ? (map['batchRank'] as num).toInt() : (r > 1 ? (r ~/ 2) + 1 : 1),
      totalStudents: (map['totalStudents'] is num) ? (map['totalStudents'] as num).toInt() : 180,
      timeTakenMinutes: (map['timeTakenMinutes'] is num) ? (map['timeTakenMinutes'] as num).toInt() : 40,
      completedAt: map['submittedAt'] != null
          ? DateTime.fromMillisecondsSinceEpoch((map['submittedAt'] as num).toInt())
          : (map['completedAt'] != null
              ? DateTime.fromMillisecondsSinceEpoch((map['completedAt'] as num).toInt())
              : DateTime.now().subtract(const Duration(days: 2))),
      grade: map['grade'] ?? gradeStr,
      studentAnswers: rawAnswers,
      answerPdfUrl: map['answerPdfUrl'],
      correctedPdfUrl: map['correctedPdfUrl'],
      feedback: map['feedback'],
    );
  }
}
