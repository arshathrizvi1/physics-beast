class UserModel {
  final String uid;
  final String email;
  final String role; // 'student', 'admin', 'teacher'
  final String? name;
  final String? phone;
  final String? studentId;
  final String? stream;
  final String? batchId;
  final String? school;
  final List<String> accessibleCourses;
  final Map<String, dynamic> folderAccess;
  final int totalXp;
  final int streakDays;
  final double averageGrade;
  final int examsDone;

  UserModel({
    required this.uid,
    required this.email,
    this.role = 'student',
    this.name,
    this.phone,
    this.studentId,
    this.stream,
    this.batchId,
    this.school,
    this.accessibleCourses = const [],
    this.folderAccess = const {},
    this.totalXp = 0,
    this.streakDays = 0,
    this.averageGrade = 0.0,
    this.examsDone = 0,
  });

  factory UserModel.fromMap(String uid, Map<String, dynamic> map) {
    return UserModel(
      uid: uid,
      email: map['email'] ?? '',
      role: map['role'] ?? 'student',
      name: map['name'],
      phone: map['phone'],
      studentId: map['studentId'],
      stream: map['stream'],
      batchId: map['batchId'],
      school: map['school'],
      accessibleCourses: List<String>.from(map['accessibleCourses'] ?? []),
      folderAccess: Map<String, dynamic>.from(map['folderAccess'] ?? {}),
      totalXp: (map['totalXp'] is num) ? (map['totalXp'] as num).toInt() : 0,
      streakDays: (map['streakDays'] is num) ? (map['streakDays'] as num).toInt() : 0,
      averageGrade: (map['averageGrade'] is num) ? (map['averageGrade'] as num).toDouble() : 0.0,
      examsDone: (map['examsDone'] is num) ? (map['examsDone'] as num).toInt() : 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'email': email,
      'role': role,
      'name': name,
      'phone': phone,
      'studentId': studentId,
      'stream': stream,
      'batchId': batchId,
      'school': school,
      'accessibleCourses': accessibleCourses,
      'folderAccess': folderAccess,
      'totalXp': totalXp,
      'streakDays': streakDays,
      'averageGrade': averageGrade,
      'examsDone': examsDone,
    };
  }

  bool hasCourseAccess(String courseId) {
    if (role == 'admin' || role == 'teacher') return true;
    return accessibleCourses.contains(courseId);
  }

  bool hasFolderAccess(String folderId) {
    if (role == 'admin' || role == 'teacher') return true;
    if (folderAccess.containsKey(folderId)) {
      final exp = folderAccess[folderId];
      if (exp is num && exp > DateTime.now().millisecondsSinceEpoch) {
        return true;
      }
    }
    return false;
  }
}
