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
