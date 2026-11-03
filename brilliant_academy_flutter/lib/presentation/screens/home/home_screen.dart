import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/theme_x.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/section_header.dart';
import '../../../core/widgets/app_chip.dart';
import '../../../core/widgets/live_card.dart';
import '../../../core/widgets/state_views.dart';
import '../../../data/models/course_model.dart';
import '../../../services/auth_service.dart';
import '../../../services/course_service.dart';
import '../courses/course_detail_screen.dart';
import '../live/live_screen.dart';
import '../courses/courses_screen.dart';
import 'widgets/popular_courses_carousel.dart';
import 'widgets/home_header.dart';
import 'widgets/home_search_bar.dart';
import 'widgets/home_stats_grid.dart';
import 'widgets/home_resume_card.dart';
import 'widgets/home_testimonials.dart';

class HomeScreen extends StatefulWidget {
  final VoidCallback? onExploreCourses;
  const HomeScreen({super.key, this.onExploreCourses});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _searchController = TextEditingController();
  final _courseService = CourseService();
  String _activeSubject = "All";

  final List<String> _subjects = const [
    "All",
    "Physics",
    "Combined Mathematics",
    "Chemistry",
    "ICT",
  ];

  final List<Course> _websiteFallbackCourses = [
    Course(
      id: "physics-2026",
      name: "Advanced Level Physics 2026",
      description: "Master Mechanics, Waves, Electricity & Modern Physics with comprehensive problem solving.",
      image: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&q=80&w=800",
      teacherName: "Master Admin",
      subject: "Physics",
      isMonthly: true,
    ),
    Course(
      id: "maths-2026",
      name: "Combined Mathematics Masterclass",
      description: "Pure Mathematics, Calculus, Trigonometry & Applied Statistics with structured model papers.",
      image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=800",
      teacherName: "Senior Math Specialist",
      subject: "Combined Mathematics",
      isMonthly: true,
    ),
    Course(
      id: "chemistry-2026",
      name: "Organic & Physical Chemistry Revision",
      description: "Complete reaction mechanisms, chemical calculations, and exam-focused short notes.",
      image: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&q=80&w=800",
      teacherName: "Chemistry Lecturer",
      subject: "Chemistry",
      isMonthly: false,
    ),
    Course(
      id: "ict-science-2026",
      name: "Information & Communication Technology",
      description: "Python programming, Database Systems, Networking, and IoT practical projects.",
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800",
      teacherName: "Lead Tech Engineer",
      subject: "ICT",
      isMonthly: false,
    ),
  ];

  final List<Map<String, dynamic>> _testimonials = const [
    {
      "name": "Kavindu P.",
      "batch": "2026 A/L",
      "rating": 5,
      "comment": "Brilliant Academy changed how I study. The video lessons and downloadable revision notes are unmatched!",
    },
    {
      "name": "Ayesha F.",
      "batch": "2026 A/L",
      "rating": 5,
      "comment": "Best LMS app experience! Zero lag during live classes and the doubt clarification sessions are fantastic.",
    },
    {
      "name": "Nisal M.",
      "batch": "2025 A/L",
      "rating": 5,
      "comment": "Scored an A for Physics thanks to the structured papers and instant feedback system.",
    },
    {
      "name": "Dinithi S.",
      "batch": "2026 A/L",
      "rating": 5,
      "comment": "The mobile app makes revising on the go so effortless. Highly recommended for 2026 A/L students!",
    },
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final authService = Provider.of<AuthService>(context);
    final user = authService.currentUser;

    final subjectColors = {
      "Physics": tokens.subjectPhysics,
      "Combined Mathematics": tokens.subjectMaths,
      "Chemistry": tokens.subjectChemistry,
      "ICT": tokens.subjectIct,
    };

    return AppScaffold(
      includeBottomNavInset: true,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Academy Header
            const HomeHeader(),

            // Search Bar
            HomeSearchBar(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
            ),

            const SizedBox(height: AppSpacing.sm),

            // Live Class Streaming Card (Prominent Live Banner)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
              child: LiveCard(
                title: "Advanced Physics 2026: Mechanics & Circular Motion Masterclass",
                subtitle: "Interactive session with live Q&A • Faculty Master Admin",
                viewerCount: 248,
                onJoin: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const LiveScreen()),
                  );
                },
              ),
            ),

            const SizedBox(height: AppSpacing.md),

            // Academic Personal Dashboard (2x2 Stats Grid)
            HomeStatsGrid(user: user),

            // Continue Learning / Resume Lesson
            HomeResumeCard(
              onResume: () {
                final course = _websiteFallbackCourses.first;
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => CourseDetailScreen(course: course)),
                );
              },
            ),

            const SizedBox(height: AppSpacing.md),

            // Subject Filter Bar
            SectionHeader(
              title: "Syllabus Subjects",
              subtitle: "Select a stream to filter lessons",
            ),
            FilterChipBar(
              items: _subjects,
              selectedItem: _activeSubject,
              dotColors: subjectColors,
              onSelected: (sub) => setState(() => _activeSubject = sub),
            ),

            const SizedBox(height: AppSpacing.lg),

            // Firestore Live Courses or Fallback
            StreamBuilder<List<Course>>(
              stream: _courseService.getCoursesStream(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                    child: SkeletonBox(width: double.infinity, height: 260),
                  );
                }

                List<Course> courses = snapshot.data ?? [];
                if (courses.isEmpty) {
                  courses = _websiteFallbackCourses;
                }

                // Apply Subject & Search Filter
                final query = _searchController.text.trim().toLowerCase();
                final filtered = courses.where((c) {
                  final matchesSubject = _activeSubject == "All" ||
                      (c.subject != null && c.subject!.toLowerCase().contains(_activeSubject.toLowerCase())) ||
                      c.name.toLowerCase().contains(_activeSubject.toLowerCase());
                  final matchesSearch = query.isEmpty ||
                      c.name.toLowerCase().contains(query) ||
                      c.description.toLowerCase().contains(query);
                  return matchesSubject && matchesSearch;
                }).toList();

                if (filtered.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: AppSpacing.xxl),
                    child: EmptyState(
                      icon: Icons.search_off_rounded,
                      title: "No Courses Found",
                      message: "Try searching with a different subject or keyword.",
                    ),
                  );
                }

                return PopularCoursesCarousel(
                  courses: filtered,
                  user: user,
                  onSeeAll: () {
                    if (widget.onExploreCourses != null) {
                      widget.onExploreCourses!();
                    } else {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const CoursesScreen()),
                      );
                    }
                  },
                );
              },
            ),

            const SizedBox(height: AppSpacing.lg),

            // Student Testimonials
            SectionHeader(
              title: "Student Feedback",
              subtitle: "Real stories from top-ranked students",
            ),
            HomeTestimonials(testimonials: _testimonials),

            const SizedBox(height: AppSpacing.xxxl),
          ],
        ),
      ),
    );
  }
}
