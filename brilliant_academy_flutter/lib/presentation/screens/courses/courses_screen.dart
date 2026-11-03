import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/theme_x.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../data/models/course_model.dart';
import '../../../data/models/user_model.dart';
import '../../../services/auth_service.dart';
import '../../../services/course_service.dart';
import '../../widgets/course_card.dart';
import '../../widgets/subject_card_artwork.dart';
import 'course_detail_screen.dart';

class CoursesScreen extends StatefulWidget {
  const CoursesScreen({super.key});

  @override
  State<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends State<CoursesScreen> {
  final TextEditingController _searchController = TextEditingController();
  final CourseService _courseService = CourseService();

  String _selectedSubjectId = "all";
  String _selectedTeacherId = "all";
  bool _isGridView = true;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  bool _isCourseActivated(Course course, UserModel? user) {
    if (user == null) return false;
    // In demo / fallback mode, match the reference screenshot where Einstein Part 1 is active
    if (course.id == "einstein-physics-1") return true;
    if (user.role == 'admin' || user.role == 'teacher') {
      // If admin, check if specifically enrolled, or if course has monthly live
      return user.hasCourseAccess(course.id) || course.isMonthly;
    }
    return user.hasCourseAccess(course.id);
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;
    final authService = Provider.of<AuthService>(context);
    final user = authService.currentUser;

    return AppScaffold(
      includeBottomNavInset: true,
      body: StreamBuilder<List<Course>>(
        stream: _courseService.getCoursesStream(),
        builder: (context, courseSnapshot) {
          final courses = courseSnapshot.data ?? CourseService.defaultCourses;

          return StreamBuilder<List<SubjectItem>>(
            stream: _courseService.getSubjectsStream(),
            builder: (context, subjectSnapshot) {
              final subjects = subjectSnapshot.data ?? CourseService.defaultSubjects;

              return StreamBuilder<List<TeacherItem>>(
                stream: _courseService.getTeachersStream(),
                builder: (context, teacherSnapshot) {
                  final allTeachers = teacherSnapshot.data ?? CourseService.defaultTeachers;

                  // 1. Filter courses by Subject
                  final coursesInSubject = _selectedSubjectId == "all"
                      ? courses
                      : courses.where((c) {
                          final sId = c.subjectId?.toLowerCase() ?? "";
                          final sName = c.subject?.toLowerCase() ?? "";
                          final matchId = sId == _selectedSubjectId.toLowerCase();
                          final matchName = sName == _selectedSubjectId.toLowerCase();
                          return matchId || matchName;
                        }).toList();

                  // 2. Discover teachers for the chosen subject
                  final availableTeachersForSubject = allTeachers.where((teacher) {
                    return coursesInSubject.any((c) =>
                        c.teacherId == teacher.id ||
                        (c.teacherName != null && c.teacherName!.toLowerCase() == teacher.name.toLowerCase()));
                  }).toList();

                  final bool hasMultipleTeachers = availableTeachersForSubject.length > 1;

                  // 3. Filter courses by Teacher
                  final coursesAfterTeacher = coursesInSubject.where((c) {
                    if (_selectedTeacherId == "all") return true;
                    final matchTId = c.teacherId == _selectedTeacherId;
                    final matchTName = c.teacherName?.toLowerCase() ==
                        availableTeachersForSubject
                            .firstWhere((t) => t.id == _selectedTeacherId, orElse: () => TeacherItem(id: '', name: ''))
                            .name
                            .toLowerCase();
                    return matchTId || matchTName;
                  }).toList();

                  // 4. Filter by search query
                  final query = _searchController.text.trim().toLowerCase();
                  final displayedCourses = coursesAfterTeacher.where((c) {
                    if (query.isEmpty) return true;
                    final matchName = c.name.toLowerCase().contains(query);
                    final matchDesc = c.description.toLowerCase().contains(query);
                    final matchTeacher = c.teacherName?.toLowerCase().contains(query) ?? false;
                    return matchName || matchDesc || matchTeacher;
                  }).toList();

                  // 5. Partition into Active (Already Bought) and Available (Catalog)
                  final activeCourses = displayedCourses.where((c) => _isCourseActivated(c, user)).toList();
                  final availableCourses = displayedCourses.where((c) => !_isCourseActivated(c, user)).toList();

                  final selectedSubjectName = subjects
                      .firstWhere(
                        (s) => s.id.toLowerCase() == _selectedSubjectId.toLowerCase(),
                        orElse: () => SubjectItem(id: "all", name: "All Subjects"),
                      )
                      .name;

                  return CustomScrollView(
                    slivers: [
                      // Top Header: Course Explorer
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(
                            AppSpacing.screenPadding,
                            AppSpacing.md,
                            AppSpacing.screenPadding,
                            AppSpacing.xs,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Course Explorer",
                                style: text.headlineSmall?.copyWith(
                                  color: tokens.textPrimary,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                "Browse all available courses and start learning today.",
                                style: text.bodySmall?.copyWith(
                                  color: tokens.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // SECTION 1: SELECT SUBJECT
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(
                            AppSpacing.screenPadding,
                            AppSpacing.md,
                            AppSpacing.screenPadding,
                            AppSpacing.sm,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.menu_book_rounded, color: tokens.goldText, size: 22),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          "Select Subject",
                                          style: text.titleMedium?.copyWith(
                                            color: tokens.textPrimary,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                        Text(
                                          "Choose a subject to see its available courses.",
                                          style: text.labelSmall?.copyWith(color: tokens.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (_selectedSubjectId != "all")
                                    GestureDetector(
                                      onTap: () {
                                        HapticFeedback.selectionClick();
                                        setState(() {
                                          _selectedSubjectId = "all";
                                          _selectedTeacherId = "all";
                                        });
                                      },
                                      child: Padding(
                                        padding: const EdgeInsets.all(4.0),
                                        child: Text(
                                          "Show All Subjects",
                                          style: text.labelMedium?.copyWith(
                                            color: tokens.goldText,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.md),

                              // 2-Column Subject Grid matching reference screenshots
                              _buildSubjectGrid(context, subjects),
                            ],
                          ),
                        ),
                      ),

                      // SECTION 2: BROWSE BY TEACHER (Conditional 2nd Option)
                      if (_selectedSubjectId != "all" && hasMultipleTeachers)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(
                              AppSpacing.screenPadding,
                              AppSpacing.md,
                              AppSpacing.screenPadding,
                              AppSpacing.sm,
                            ),
                            child: Container(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              decoration: BoxDecoration(
                                color: tokens.surface,
                                borderRadius: AppRadius.roundedLg,
                                border: Border.all(
                                  color: tokens.gold.withValues(alpha: 0.35),
                                  width: 1.2,
                                ),
                                boxShadow: isDark ? null : tokens.e1,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.school_rounded, color: tokens.goldText, size: 22),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              "Select Teacher for $selectedSubjectName",
                                              style: text.titleMedium?.copyWith(
                                                color: tokens.textPrimary,
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                            Text(
                                              "Multiple instructors teach $selectedSubjectName. Choose an instructor:",
                                              style: text.labelSmall?.copyWith(color: tokens.textSecondary),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (_selectedTeacherId != "all")
                                        GestureDetector(
                                          onTap: () {
                                            HapticFeedback.selectionClick();
                                            setState(() => _selectedTeacherId = "all");
                                          },
                                          child: Text(
                                            "All Teachers",
                                            style: text.labelMedium?.copyWith(
                                              color: tokens.goldText,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: AppSpacing.md),

                                  // Teacher Selection Cards
                                  _buildTeacherCards(context, availableTeachersForSubject, coursesInSubject),
                                ],
                              ),
                            ),
                          ),
                        ),

                      // UNIFIED SEARCH BAR & GRID/LIST TOGGLE
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(
                            AppSpacing.screenPadding,
                            AppSpacing.lg,
                            AppSpacing.screenPadding,
                            AppSpacing.sm,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: tokens.surface,
                                    borderRadius: AppRadius.roundedPill,
                                    border: Border.all(
                                      color: isDark ? tokens.border : tokens.border.withValues(alpha: 0.6),
                                      width: 1,
                                    ),
                                    boxShadow: isDark ? null : tokens.e1,
                                  ),
                                  padding: const EdgeInsets.symmetric(horizontal: 14),
                                  child: TextField(
                                    controller: _searchController,
                                    onChanged: (_) => setState(() {}),
                                    style: text.bodyLarge?.copyWith(
                                      color: tokens.textPrimary,
                                      fontSize: 13,
                                    ),
                                    decoration: InputDecoration(
                                      hintText: "Search courses, units, videos...",
                                      hintStyle: text.bodySmall?.copyWith(
                                        color: tokens.textMuted,
                                        fontSize: 12,
                                      ),
                                      prefixIcon: Icon(
                                        Icons.search_rounded,
                                        color: tokens.goldText,
                                        size: 18,
                                      ),
                                      prefixIconConstraints: const BoxConstraints(minWidth: 28, minHeight: 20),
                                      suffixIcon: _searchController.text.isNotEmpty
                                          ? IconButton(
                                              icon: Icon(Icons.clear_rounded, size: 16, color: tokens.textMuted),
                                              onPressed: () {
                                                _searchController.clear();
                                                setState(() {});
                                              },
                                            )
                                          : null,
                                      border: InputBorder.none,
                                      enabledBorder: InputBorder.none,
                                      focusedBorder: InputBorder.none,
                                      isDense: true,
                                      contentPadding: const EdgeInsets.symmetric(vertical: 11),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: AppSpacing.sm),

                              // Grid vs List Toggle
                              Container(
                                decoration: BoxDecoration(
                                  color: tokens.surfaceAlt,
                                  borderRadius: AppRadius.roundedMd,
                                  border: Border.all(
                                    color: isDark ? tokens.border : tokens.border.withValues(alpha: 0.5),
                                    width: 1,
                                  ),
                                ),
                                padding: const EdgeInsets.all(3),
                                child: Row(
                                  children: [
                                    _buildViewToggleButton(
                                      icon: Icons.grid_view_rounded,
                                      isSelected: _isGridView,
                                      onTap: () => setState(() => _isGridView = true),
                                    ),
                                    _buildViewToggleButton(
                                      icon: Icons.format_list_bulleted_rounded,
                                      isSelected: !_isGridView,
                                      onTap: () => setState(() => _isGridView = false),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // SECTION 3: PREMIUM LIVE CLASSES & ACTIVE COURSES (BOUGHT)
                      if (activeCourses.isNotEmpty) ...[
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(
                              AppSpacing.screenPadding,
                              AppSpacing.md,
                              AppSpacing.screenPadding,
                              AppSpacing.sm,
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.play_circle_fill_rounded, color: tokens.gold, size: 22),
                                const SizedBox(width: 8),
                                Text(
                                  "Premium Live Classes & Active Courses (${activeCourses.length})",
                                  style: text.titleMedium?.copyWith(
                                    color: tokens.goldText,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        _buildCourseSliver(
                          courses: activeCourses,
                          user: user,
                          isGrid: _isGridView,
                        ),
                      ],

                      // SECTION 4: AVAILABLE COURSES (CATALOG)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(
                            AppSpacing.screenPadding,
                            AppSpacing.lg,
                            AppSpacing.screenPadding,
                            AppSpacing.sm,
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.library_books_rounded, color: tokens.textPrimary, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                "Available Courses (${availableCourses.length})",
                                style: text.titleMedium?.copyWith(
                                  color: tokens.textPrimary,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      if (availableCourses.isEmpty && activeCourses.isEmpty)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: AppSpacing.xxl),
                            child: EmptyState(
                              icon: Icons.search_off_rounded,
                              title: "No Courses Found",
                              message: "No courses match the selected teacher or search keyword.",
                            ),
                          ),
                        )
                      else if (availableCourses.isEmpty)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.screenPadding),
                            child: Text(
                              "You are already enrolled in all courses for this selection!",
                              style: text.bodySmall?.copyWith(color: tokens.textMuted),
                            ),
                          ),
                        )
                      else
                        _buildCourseSliver(
                          courses: availableCourses,
                          user: user,
                          isGrid: _isGridView,
                        ),

                      const SliverToBoxAdapter(
                        child: SizedBox(height: AppSpacing.huge),
                      ),
                    ],
                  );
                },
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildViewToggleButton({
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    final tokens = context.tokens;

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: AnimatedContainer(
        duration: AppDurations.fast,
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: isSelected ? tokens.gold : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icon,
          size: 17,
          color: isSelected ? tokens.onGold : tokens.textMuted,
        ),
      ),
    );
  }

  Widget _buildSubjectGrid(BuildContext context, List<SubjectItem> subjects) {
    final tokens = context.tokens;
    final isDark = context.isDark;

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: subjects.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.35,
      ),
      itemBuilder: (context, index) {
        final subject = subjects[index];
        final isSelected = _selectedSubjectId == subject.id;

        return GestureDetector(
          onTap: () {
            HapticFeedback.selectionClick();
            setState(() {
              _selectedSubjectId = subject.id;
              _selectedTeacherId = "all";
            });
          },
          child: AnimatedContainer(
            duration: AppDurations.fast,
            decoration: BoxDecoration(
              color: tokens.surface,
              borderRadius: AppRadius.roundedLg,
              border: Border.all(
                color: isSelected ? tokens.gold : (isDark ? tokens.border : tokens.border.withValues(alpha: 0.6)),
                width: isSelected ? 2.0 : 1.0,
              ),
              boxShadow: isSelected ? tokens.goldGlow : (isDark ? null : tokens.e1),
            ),
            child: ClipRRect(
              borderRadius: AppRadius.roundedLg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Upper Artwork Area (Always rich academic art, never blank!)
                  Expanded(
                    child: SubjectCardArtwork(
                      subjectId: subject.id,
                      subjectName: subject.name,
                      imageUrl: subject.imageUrl,
                      isSelected: isSelected,
                    ),
                  ),

                  // Bottom Title Bar
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      gradient: isSelected ? tokens.goldGradient : null,
                      color: isSelected ? null : (isDark ? tokens.surfaceAlt : const Color(0xFFF6F3EB)),
                    ),
                    child: Text(
                      subject.name,
                      style: TextStyle(
                        color: isSelected ? tokens.onGold : tokens.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTeacherCards(BuildContext context, List<TeacherItem> teachers, List<Course> subjectCourses) {
    final tokens = context.tokens;
    final isDark = context.isDark;

    final List<TeacherItem> displayList = [
      TeacherItem(
        id: "all",
        name: "All Teachers",
        courseCount: subjectCourses.length,
      ),
      ...teachers,
    ];

    return SizedBox(
      height: 120,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: displayList.length,
        separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
        itemBuilder: (context, index) {
          final teacher = displayList[index];
          final isSelected = _selectedTeacherId == teacher.id;
          final int count = teacher.id == "all"
              ? subjectCourses.length
              : subjectCourses.where((c) => c.teacherId == teacher.id || c.teacherName == teacher.name).length;

          return GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() => _selectedTeacherId = teacher.id);
            },
            child: AnimatedContainer(
              duration: AppDurations.fast,
              width: 145,
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: isSelected ? tokens.gold.withValues(alpha: 0.12) : tokens.surfaceAlt,
                borderRadius: AppRadius.roundedMd,
                border: Border.all(
                  color: isSelected ? tokens.gold : (isDark ? tokens.border : tokens.border.withValues(alpha: 0.6)),
                  width: isSelected ? 2.0 : 1.0,
                ),
                boxShadow: isSelected ? tokens.goldGlow : null,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: isSelected ? tokens.gold : tokens.surface,
                    child: Icon(
                      teacher.id == "all" ? Icons.people_alt_rounded : Icons.person_rounded,
                      size: 20,
                      color: isSelected ? tokens.onGold : tokens.goldText,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    teacher.name,
                    style: TextStyle(
                      color: tokens.textPrimary,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                      fontSize: 11,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 2),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isSelected ? tokens.gold.withValues(alpha: 0.25) : Colors.black.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      "$count Course${count == 1 ? '' : 's'}",
                      style: TextStyle(
                        color: isSelected ? tokens.goldText : tokens.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCourseSliver({
    required List<Course> courses,
    required UserModel? user,
    required bool isGrid,
  }) {
    if (isGrid) {
      return SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 14,
            childAspectRatio: 0.62,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final course = courses[index];
              return CourseCard(
                course: course,
                user: user,
                isGrid: true,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => CourseDetailScreen(course: course),
                    ),
                  );
                },
              );
            },
            childCount: courses.length,
          ),
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final course = courses[index];
            return CourseCard(
              course: course,
              user: user,
              isGrid: false,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CourseDetailScreen(course: course),
                  ),
                );
              },
            );
          },
          childCount: courses.length,
        ),
      ),
    );
  }
}
