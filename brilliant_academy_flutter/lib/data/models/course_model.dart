import 'package:flutter/material.dart';

class SubjectItem {
  final String id;
  final String name;
  final String? imageUrl;
  final String? streamName;
  final List<String> streamNames;
  final IconData? icon;

  SubjectItem({
    required this.id,
    required this.name,
    this.imageUrl,
    this.streamName,
    this.streamNames = const [],
    this.icon,
  });

  factory SubjectItem.fromMap(String id, Map<String, dynamic> map) {
    return SubjectItem(
      id: id,
      name: map['name'] ?? map['title'] ?? 'Subject',
      imageUrl: map['imageUrl'] ?? map['image'] ?? map['thumbnailUrl'],
      streamName: map['streamName'],
      streamNames: List<String>.from(map['streamNames'] ?? []),
    );
  }
}

class TeacherItem {
  final String id;
  final String name;
  final String? photoUrl;
  final String? subject;
  final String? subjectId;
  final int courseCount;

  TeacherItem({
    required this.id,
    required this.name,
    this.photoUrl,
    this.subject,
    this.subjectId,
    this.courseCount = 0,
  });

  factory TeacherItem.fromMap(String id, Map<String, dynamic> map) {
    return TeacherItem(
      id: id,
      name: map['name'] ?? map['displayName'] ?? map['email']?.toString().split('@')[0] ?? 'Teacher',
      photoUrl: map['photoUrl'] ?? map['profilePicture'] ?? map['avatar'],
      subject: map['subject'],
      subjectId: map['subjectId'],
      courseCount: (map['courseCount'] is num) ? (map['courseCount'] as num).toInt() : 0,
    );
  }
}

class Course {
  final String id;
  final String name;
  final String description;
  final String? image;
  final String? teacherId;
  final String? teacherName;
  final String? subject;
  final String? subjectId;
  final bool isMonthly;
  final double price;
  final int? studentCount;
  final double? rating;

  Course({
    required this.id,
    required this.name,
    this.description = '',
    this.image,
    this.teacherId,
    this.teacherName,
    this.subject,
    this.subjectId,
    this.isMonthly = true,
    this.price = 0.0,
    this.studentCount,
    this.rating,
  });

  factory Course.fromMap(String id, Map<String, dynamic> map) {
    final rawImg = map['image'] ?? map['thumbnailUrl'] ?? map['thumbnail'] ?? map['coverImage'] ?? map['bannerUrl'];
    String? resolvedImg = (rawImg is String && rawImg.trim().isNotEmpty) ? rawImg.trim() : null;

    final resolvedSubject = map['subject'] ?? map['subjectName'];
    final resolvedSubjectId = map['subjectId'] ??
        (resolvedSubject != null ? resolvedSubject.toString().toLowerCase().replaceAll(' ', '-') : null);

    if (resolvedImg == null) {
      final title = (map['name'] ?? map['title'] ?? '').toString().toLowerCase();
      if (title.contains('physics')) {
        resolvedImg = 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&q=80&w=800';
      } else if (title.contains('math')) {
        resolvedImg = 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=800';
      } else if (title.contains('chem')) {
        resolvedImg = 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&q=80&w=800';
      } else if (title.contains('ict') || title.contains('tech') || title.contains('computer')) {
        resolvedImg = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800';
      } else if (title.contains('bio')) {
        resolvedImg = 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800';
      } else {
        resolvedImg = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800';
      }
    }

    return Course(
      id: id,
      name: map['name'] ?? map['title'] ?? 'Untitled Course',
      description: map['description'] ?? '',
      image: resolvedImg,
      teacherId: map['teacherId'],
      teacherName: map['teacherName'] ?? map['teacher'] ?? (map['isMonthly'] == true ? 'Master Admin' : null),
      subject: resolvedSubject,
      subjectId: resolvedSubjectId,
      isMonthly: map['isMonthly'] ?? true,
      price: (map['price'] is num) ? (map['price'] as num).toDouble() : 0.0,
      studentCount: (map['studentCount'] is num)
          ? (map['studentCount'] as num).toInt()
          : (map['studentsCount'] is num ? (map['studentsCount'] as num).toInt() : null),
      rating: (map['rating'] is num) ? (map['rating'] as num).toDouble() : null,
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

class VideoItem {
  final String id;
  final String folderId;
  final String courseId;
  final String title;
  final String? description;
  final String hlsUrl;
  final String? watermarkEmail;
  final int durationSeconds;

  VideoItem({
    required this.id,
    required this.folderId,
    required this.courseId,
    required this.title,
    this.description,
    required this.hlsUrl,
    this.watermarkEmail,
    this.durationSeconds = 0,
  });

  factory VideoItem.fromMap(String id, Map<String, dynamic> map) {
    return VideoItem(
      id: id,
      folderId: map['folderId'] ?? '',
      courseId: map['courseId'] ?? '',
      title: map['title'] ?? 'Untitled Video',
      description: map['description'],
      hlsUrl: map['streamUrl'] ?? map['hlsUrl'] ?? map['videoUrl'] ?? '',
      durationSeconds: (map['duration'] is num) ? (map['duration'] as num).toInt() : 0,
    );
  }
}

class MaterialItem {
  final String id;
  final String folderId;
  final String courseId;
  final String title;
  final String? videoId;
  final String? duration;
  final String type;
  final String? url;
  final String? r2Url;
  final String? originalYoutubeUrl;
  final String? platform;
  final String? libraryId;
  final String? description;
  final int order;
  final bool isFree;
  final Map<String, dynamic>? playerSettings;

  MaterialItem({
    required this.id,
    required this.folderId,
    required this.courseId,
    required this.title,
    this.videoId,
    this.duration,
    this.type = 'video',
    this.url,
    this.r2Url,
    this.originalYoutubeUrl,
    this.platform,
    this.libraryId,
    this.description,
    this.order = 0,
    this.isFree = false,
    this.playerSettings,
  });

  factory MaterialItem.fromMap(String id, Map<String, dynamic> map) {
    return MaterialItem(
      id: id,
      folderId: map['folderId'] ?? '',
      courseId: map['courseId'] ?? '',
      title: map['title'] ?? map['name'] ?? 'Untitled Lesson',
      videoId: map['videoId'] ?? map['video_id'] ?? id,
      duration: map['duration']?.toString(),
      type: map['type'] ?? 'video',
      url: map['url'] ?? map['streamUrl'] ?? map['pdfUrl'] ?? map['hlsUrl'],
      r2Url: map['r2Url'],
      originalYoutubeUrl: map['originalYoutubeUrl'] ?? map['youtubeUrl'],
      platform: map['platform'] ?? (map['r2Url'] != null ? 'r2' : (map['libraryId'] != null ? 'bunny' : null)),
      libraryId: map['libraryId']?.toString(),
      description: map['description']?.toString(),
      order: (map['order'] is num) ? (map['order'] as num).toInt() : 0,
      isFree: map['isFree'] == true,
      playerSettings: map['playerSettings'] as Map<String, dynamic>?,
    );
  }
}
