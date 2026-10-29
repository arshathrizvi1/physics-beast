class Course {
  final String id;
  final String name;
  final String description;
  final String? image;
  final String? teacherId;
  final String? teacherName;
  final String? subject;
  final bool isMonthly;
  final double price;

  Course({
    required this.id,
    required this.name,
    this.description = '',
    this.image,
    this.teacherId,
    this.teacherName,
    this.subject,
    this.isMonthly = true,
    this.price = 0.0,
  });

  factory Course.fromMap(String id, Map<String, dynamic> map) {
    return Course(
      id: id,
      name: map['name'] ?? map['title'] ?? 'Untitled Course',
      description: map['description'] ?? '',
      image: map['image'] ?? map['thumbnailUrl'],
      teacherId: map['teacherId'],
      teacherName: map['teacherName'],
      subject: map['subject'],
      isMonthly: map['isMonthly'] ?? true,
      price: (map['price'] is num) ? (map['price'] as num).toDouble() : 0.0,
    );
  }
}

class CourseFolder {
  final String id;
  final String courseId;
  final String name;
  final int order;
  final double price;

  CourseFolder({
    required this.id,
    required this.courseId,
    required this.name,
    this.order = 0,
    this.price = 0.0,
  });

  factory CourseFolder.fromMap(String id, Map<String, dynamic> map) {
    return CourseFolder(
      id: id,
      courseId: map['courseId'] ?? '',
      name: map['name'] ?? map['title'] ?? 'Folder',
      order: (map['order'] is num) ? (map['order'] as num).toInt() : 0,
      price: (map['price'] is num) ? (map['price'] as num).toDouble() : 0.0,
    );
  }
}

class MaterialItem {
  final String id;
  final String courseId;
  final String folderId;
  final String title;
  final String type; // 'video' or 'document'
  final String? videoId;
  final String? duration;
  final String? url;
  final int order;

  MaterialItem({
    required this.id,
    required this.courseId,
    required this.folderId,
    required this.title,
    this.type = 'video',
    this.videoId,
    this.duration,
    this.url,
    this.order = 0,
  });

  factory MaterialItem.fromMap(String id, Map<String, dynamic> map) {
    return MaterialItem(
      id: id,
      courseId: map['courseId'] ?? '',
      folderId: map['folderId'] ?? '',
      title: map['title'] ?? map['name'] ?? 'Untitled Lesson',
      type: map['type'] ?? 'video',
      videoId: map['videoId'] ?? map['bunnyId'],
      duration: map['duration'],
      url: map['url'],
      order: (map['order'] is num) ? (map['order'] as num).toInt() : 0,
    );
  }
}
