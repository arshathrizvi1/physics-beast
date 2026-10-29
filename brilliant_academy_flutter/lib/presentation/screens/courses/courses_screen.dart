import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/auth_service.dart';
import '../../../services/course_service.dart';
import '../../../data/models/course_model.dart';
import '../../widgets/course_card.dart';
import 'course_detail_screen.dart';

class CoursesScreen extends StatefulWidget {
  const CoursesScreen({super.key});

  @override
  State<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends State<CoursesScreen> {
  final _searchController = TextEditingController();
  final _courseService = CourseService();
  String _selectedSubject = "All";

  final List<String> _filters = ["All", "Physics", "Combined Mathematics", "Chemistry", "ICT"];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final user = authService.currentUser;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          "Course Library",
          style: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: Column(
        children: [
          // Search Input
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: "Search courses, topics...",
                hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
                prefixIcon: const Icon(Icons.search, color: AppColors.textMuted),
                filled: true,
                fillColor: AppColors.surface,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.cardBorder),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.cardBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.gold),
                ),
              ),
            ),
          ),

          // Subject Chips Filter
          SizedBox(
            height: 48,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              itemCount: _filters.length,
              itemBuilder: (context, index) {
                final filter = _filters[index];
                final isSelected = _selectedSubject == filter;

                return Padding(
                  padding: const EdgeInsets.only(right: 8.0, top: 4, bottom: 4),
                  child: FilterChip(
                    selected: isSelected,
                    label: Text(filter),
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.black : AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    ),
                    backgroundColor: AppColors.surface,
                    selectedColor: AppColors.gold,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                      side: BorderSide(
                        color: isSelected ? AppColors.gold : AppColors.cardBorder,
                      ),
                    ),
                    onSelected: (val) {
                      setState(() => _selectedSubject = filter);
                    },
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),

          // Courses List
          Expanded(
            child: StreamBuilder<List<Course>>(
              stream: _courseService.getCoursesStream(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: AppColors.gold));
                }

                var list = snapshot.data ?? [];

                // Filter by search query
                final query = _searchController.text.trim().toLowerCase();
                if (query.isNotEmpty) {
                  list = list.where((c) =>
                      c.name.toLowerCase().contains(query) ||
                      c.description.toLowerCase().contains(query)).toList();
                }

                // Filter by subject
                if (_selectedSubject != "All") {
                  list = list.where((c) =>
                      c.subject?.toLowerCase() == _selectedSubject.toLowerCase()).toList();
                }

                if (list.isEmpty) {
                  return const Center(
                    child: Text(
                      "No courses found",
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(20),
                  itemCount: list.length,
                  itemBuilder: (context, index) {
                    final course = list[index];
                    return CourseCard(
                      course: course,
                      user: user,
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
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
