import 'package:cloud_firestore/cloud_firestore.dart';
import '../data/models/course_model.dart';
import '../core/constants/app_constants.dart';

class CourseService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Stream of courses from Firestore
  Stream<List<Course>> getCoursesStream() {
    return _firestore
        .collection(AppConstants.colCourses)
        .snapshots()
        .map((snapshot) {
      if (snapshot.docs.isEmpty) {
        return _fallbackCourses;
      }
      return snapshot.docs
          .map((doc) => Course.fromMap(doc.id, doc.data()))
          .toList();
    });
  }

  // Stream of folders for a course
  Stream<List<CourseFolder>> getFoldersForCourse(String courseId) {
    return _firestore
        .collection(AppConstants.colFolders)
        .where('courseId', isEqualTo: courseId)
        .snapshots()
        .map((snapshot) {
      final list = snapshot.docs
          .map((doc) => CourseFolder.fromMap(doc.id, doc.data()))
          .toList();
      list.sort((a, b) => a.order.compareTo(b.order));
      return list;
    });
  }

  // Stream of materials/lessons for a folder
  Stream<List<MaterialItem>> getMaterialsForFolder(String folderId) {
    return _firestore
        .collection(AppConstants.colMaterials)
        .where('folderId', isEqualTo: folderId)
        .snapshots()
        .map((snapshot) {
      final list = snapshot.docs
          .map((doc) => MaterialItem.fromMap(doc.id, doc.data()))
          .toList();
      list.sort((a, b) => a.order.compareTo(b.order));
      return list;
    });
  }

  // Fallback courses matching the website
  static final List<Course> _fallbackCourses = [
    Course(
      id: "physics-2026",
      name: "Advanced Level Physics 2026",
      description: "Master Mechanics, Waves, Electricity & Modern Physics with comprehensive problem solving.",
      image: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&q=80&w=800",
      subject: "Physics",
      isMonthly: true,
    ),
    Course(
      id: "maths-2026",
      name: "Combined Mathematics Masterclass",
      description: "Pure Mathematics, Calculus, Trigonometry & Applied Statistics with structured model papers.",
      image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=800",
      subject: "Combined Mathematics",
      isMonthly: true,
    ),
    Course(
      id: "chemistry-2026",
      name: "Organic & Physical Chemistry Revision",
      description: "Complete reaction mechanisms, chemical calculations, and exam-focused short notes.",
      image: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&q=80&w=800",
      subject: "Chemistry",
      isMonthly: true,
    ),
    Course(
      id: "ict-science-2026",
      name: "Information & Communication Technology",
      description: "Python programming, Database Systems, Networking, and IoT practical projects.",
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800",
      subject: "ICT",
      isMonthly: true,
    ),
  ];
}
