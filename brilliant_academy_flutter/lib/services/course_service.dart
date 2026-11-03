import 'package:cloud_firestore/cloud_firestore.dart';
import '../data/models/course_model.dart';
import '../core/constants/app_constants.dart';

class CourseService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Stream of subjects from Firestore
  Stream<List<SubjectItem>> getSubjectsStream() {
    return _firestore.collection('subjects').snapshots().map((snapshot) {
      if (snapshot.docs.isEmpty) {
        return defaultSubjects;
      }
      final list = snapshot.docs
          .map((doc) => SubjectItem.fromMap(doc.id, doc.data()))
          .toList();
      return list;
    }).handleError((_) => defaultSubjects);
  }

  // Stream of teachers from Firestore
  Stream<List<TeacherItem>> getTeachersStream() {
    return _firestore
        .collection('users')
        .where('role', isEqualTo: 'teacher')
        .snapshots()
        .map((snapshot) {
      if (snapshot.docs.isEmpty) {
        return defaultTeachers;
      }
      return snapshot.docs
          .map((doc) => TeacherItem.fromMap(doc.id, doc.data()))
          .toList();
    }).handleError((_) => defaultTeachers);
  }

  // Stream of courses from Firestore
  Stream<List<Course>> getCoursesStream() {
    return _firestore
        .collection(AppConstants.colCourses)
        .snapshots()
        .map((snapshot) {
      if (snapshot.docs.isEmpty) {
        return defaultCourses;
      }
      return snapshot.docs
          .map((doc) => Course.fromMap(doc.id, doc.data()))
          .toList();
    }).handleError((_) => defaultCourses);
  }

  // Stream of folders for a course
  Stream<List<CourseFolder>> getFoldersForCourse(String courseId) {
    return _firestore
        .collection(AppConstants.colFolders)
        .where('courseId', isEqualTo: courseId)
        .snapshots()
        .map((snapshot) {
      if (snapshot.docs.isEmpty) {
        return _fallbackFoldersForCourse(courseId);
      }
      final list = snapshot.docs
          .map((doc) => CourseFolder.fromMap(doc.id, doc.data()))
          .toList();
      list.sort((a, b) => a.order.compareTo(b.order));
      return list;
    }).handleError((_) => _fallbackFoldersForCourse(courseId));
  }

  // Stream of materials/lessons for a folder
  Stream<List<MaterialItem>> getMaterialsForFolder(String folderId) {
    return _firestore
        .collection(AppConstants.colMaterials)
        .where('folderId', isEqualTo: folderId)
        .snapshots()
        .map((snapshot) {
      if (snapshot.docs.isEmpty) {
        return fallbackMaterialsForFolder(folderId);
      }
      final list = snapshot.docs
          .map((doc) => MaterialItem.fromMap(doc.id, doc.data()))
          .toList();
      list.sort((a, b) => a.order.compareTo(b.order));
      return list;
    }).handleError((_) => fallbackMaterialsForFolder(folderId));
  }

  static List<CourseFolder> _fallbackFoldersForCourse(String courseId) {
    return [
      CourseFolder(
        id: "f-mechanics-$courseId",
        courseId: courseId,
        name: "Mechanics",
        order: 1,
      ),
      CourseFolder(
        id: "f-waves-$courseId",
        courseId: courseId,
        name: "Oscillations & Waves",
        order: 2,
      ),
      CourseFolder(
        id: "f-thermal-$courseId",
        courseId: courseId,
        name: "Thermal Physics & Thermodynamics",
        order: 3,
      ),
    ];
  }

  static List<MaterialItem> fallbackMaterialsForFolder(String folderId) {
    return [
      MaterialItem(
        id: "${folderId}_m1",
        folderId: folderId,
        courseId: "",
        title: "01. Introduction to Physical Quantities & Vectors",
        videoId: "test_video_1",
        duration: "45 mins",
        type: "video",
        order: 1,
      ),
      MaterialItem(
        id: "${folderId}_m2",
        folderId: folderId,
        courseId: "",
        title: "02. Newton's Laws & Force Resolution Masterclass",
        videoId: "test_video_2",
        duration: "1 hr 12 mins",
        type: "video",
        order: 2,
      ),
      MaterialItem(
        id: "${folderId}_m3",
        folderId: folderId,
        courseId: "",
        title: "03. Kinematics Past Paper Worksheets & Tutorial Notes",
        videoId: null,
        duration: "PDF Document (14 Pages)",
        type: "resource",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        order: 3,
      ),
      MaterialItem(
        id: "${folderId}_m4",
        folderId: folderId,
        courseId: "",
        title: "04. Circular Motion & Gravitation Discussion",
        videoId: "test_video_3",
        duration: "58 mins",
        type: "video",
        order: 4,
      ),
      MaterialItem(
        id: "${folderId}_m5",
        folderId: folderId,
        courseId: "",
        title: "05. Model Exam Paper & Marking Scheme",
        videoId: null,
        duration: "PDF Document (8 Pages)",
        type: "resource",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        order: 5,
      ),
    ];
  }

  // Default Subjects matching the website screenshot
  static final List<SubjectItem> defaultSubjects = [
    SubjectItem(
      id: "all",
      name: "All Subjects",
      imageUrl: null,
    ),
    SubjectItem(
      id: "physics",
      name: "Physics",
      imageUrl: null,
    ),
    SubjectItem(
      id: "maths",
      name: "Maths",
      imageUrl: null,
    ),
    SubjectItem(
      id: "science",
      name: "Science",
      imageUrl: null,
    ),
    SubjectItem(
      id: "ict",
      name: "ICT",
      imageUrl: null,
    ),
  ];

  // Default Teachers matching the website screenshot
  static final List<TeacherItem> defaultTeachers = [
    TeacherItem(
      id: "dr-einstein",
      name: "Dr. Albert Einstein",
      subject: "Physics",
      subjectId: "physics",
      courseCount: 3,
    ),
    TeacherItem(
      id: "dr-feynman",
      name: "Dr. Richard Feynman",
      subject: "Physics",
      subjectId: "physics",
      courseCount: 3,
    ),
    TeacherItem(
      id: "senior-maths",
      name: "Senior Math Specialist",
      subject: "Maths",
      subjectId: "maths",
      courseCount: 2,
    ),
    TeacherItem(
      id: "tech-engineer",
      name: "Lead Tech Engineer",
      subject: "ICT",
      subjectId: "ict",
      courseCount: 2,
    ),
    TeacherItem(
      id: "prof-white",
      name: "Prof. Walter White",
      subject: "Chemistry",
      subjectId: "chemistry",
      courseCount: 1,
    ),
    TeacherItem(
      id: "dr-curie",
      name: "Dr. Marie Curie",
      subject: "Science",
      subjectId: "science",
      courseCount: 1,
    ),
  ];

  // Default Courses matching the exact website screenshot
  static final List<Course> defaultCourses = [
    Course(
      id: "einstein-physics-1",
      name: "Dr. Albert Einstein - Physics Mastery Part 1",
      description: "A comprehensive learning path focusing on Mechanics, Kinematics & Laws of Motion.",
      image: null,
      teacherId: "dr-einstein",
      teacherName: "Dr. Albert Einstein",
      subject: "Physics",
      subjectId: "physics",
      isMonthly: true,
      price: 3500.0,
    ),
    Course(
      id: "einstein-physics-2",
      name: "Dr. Albert Einstein - Physics Mastery Part 2",
      description: "A deep dive into Gravitation, Rotational Motion and Fluid Dynamics with worked problems.",
      image: null,
      teacherId: "dr-einstein",
      teacherName: "Dr. Albert Einstein",
      subject: "Physics",
      subjectId: "physics",
      isMonthly: false,
      price: 3500.0,
    ),
    Course(
      id: "einstein-physics-3",
      name: "Dr. Albert Einstein - Physics Mastery Part 3",
      description: "A deep dive into advanced physics concepts, Waves, Oscillations and Thermal Physics.",
      image: null,
      teacherId: "dr-einstein",
      teacherName: "Dr. Albert Einstein",
      subject: "Physics",
      subjectId: "physics",
      isMonthly: false,
      price: 3500.0,
    ),
    Course(
      id: "feynman-physics-1",
      name: "Dr. Richard Feynman - Physics Mastery Part 1",
      description: "A deep dive into advanced physics concepts, Quantum intuition and Energy conservation.",
      image: null,
      teacherId: "dr-feynman",
      teacherName: "Dr. Richard Feynman",
      subject: "Physics",
      subjectId: "physics",
      isMonthly: false,
      price: 3500.0,
    ),
    Course(
      id: "feynman-physics-2",
      name: "Dr. Richard Feynman - Physics Mastery Part 2",
      description: "A deep dive into advanced physics concepts, Electromagnetism and Field theory.",
      image: null,
      teacherId: "dr-feynman",
      teacherName: "Dr. Richard Feynman",
      subject: "Physics",
      subjectId: "physics",
      isMonthly: false,
      price: 3500.0,
    ),
    Course(
      id: "feynman-physics-3",
      name: "Dr. Richard Feynman - Physics Mastery Part 3",
      description: "A deep dive into advanced physics concepts, Nuclear Physics and Modern Physics.",
      image: null,
      teacherId: "dr-feynman",
      teacherName: "Dr. Richard Feynman",
      subject: "Physics",
      subjectId: "physics",
      isMonthly: false,
      price: 3500.0,
    ),
    Course(
      id: "maths-masterclass-1",
      name: "Combined Mathematics Masterclass 2026",
      description: "Pure Mathematics, Calculus, Trigonometry & Applied Statistics with model papers.",
      image: null,
      teacherId: "senior-maths",
      teacherName: "Senior Math Specialist",
      subject: "Maths",
      subjectId: "maths",
      isMonthly: true,
      price: 4000.0,
    ),
    Course(
      id: "maths-calculus-2",
      name: "Pure Maths: Differentiation & Integration Drill",
      description: "Comprehensive exam-focused past paper drills for limits, derivatives and definite integrals.",
      image: null,
      teacherId: "senior-maths",
      teacherName: "Senior Math Specialist",
      subject: "Maths",
      subjectId: "maths",
      isMonthly: false,
      price: 3800.0,
    ),
    Course(
      id: "ict-science-1",
      name: "Information & Communication Technology",
      description: "Python programming, Database Systems, Networking, and IoT practical projects.",
      image: null,
      teacherId: "tech-engineer",
      teacherName: "Lead Tech Engineer",
      subject: "ICT",
      subjectId: "ict",
      isMonthly: false,
      price: 3000.0,
    ),
    Course(
      id: "ict-python-2",
      name: "A/L Python Programming & Logic Algorithms",
      description: "Master structured programming, OOP, sorting algorithms, and SQL database integration.",
      image: null,
      teacherId: "tech-engineer",
      teacherName: "Lead Tech Engineer",
      subject: "ICT",
      subjectId: "ict",
      isMonthly: true,
      price: 3200.0,
    ),
    Course(
      id: "chem-inorganic-1",
      name: "Organic & Physical Chemistry Core Mastery",
      description: "Reaction mechanisms, stoichiometry, gaseous state, and atomic structure drills.",
      image: null,
      teacherId: "prof-white",
      teacherName: "Prof. Walter White",
      subject: "Chemistry",
      subjectId: "chemistry",
      isMonthly: true,
      price: 3600.0,
    ),
    Course(
      id: "science-applied-1",
      name: "Science Foundations & Applied Practical Labs",
      description: "Comprehensive coverage of biology, physics, and chemistry foundational concepts.",
      image: null,
      teacherId: "dr-curie",
      teacherName: "Dr. Marie Curie",
      subject: "Science",
      subjectId: "science",
      isMonthly: false,
      price: 2800.0,
    ),
  ];
}
