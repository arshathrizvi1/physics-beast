import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/auth_service.dart';
import '../../../services/course_service.dart';
import '../../../data/models/course_model.dart';
import '../player/secure_player_screen.dart';

class CourseDetailScreen extends StatelessWidget {
  final Course course;

  const CourseDetailScreen({super.key, required this.course});

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final user = authService.currentUser;
    final courseService = CourseService();

    final bool hasCourseAccess = user != null && user.hasCourseAccess(course.id);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // Collapsible Image Header
          SliverAppBar(
            expandedHeight: 220.0,
            pinned: true,
            backgroundColor: AppColors.surface,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  course.image != null
                      ? CachedNetworkImage(
                          imageUrl: course.image!,
                          fit: BoxFit.cover,
                        )
                      : Container(color: AppColors.card),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          AppColors.background.withOpacity(0.9),
                          AppColors.background,
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Course Info Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (course.subject != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.cyan.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.cyan.withOpacity(0.3)),
                      ),
                      child: Text(
                        course.subject!,
                        style: const TextStyle(
                          color: AppColors.cyan,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  const SizedBox(height: 10),
                  Text(
                    course.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    course.description,
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Divider(color: AppColors.cardBorder),
                  const SizedBox(height: 12),
                  const Text(
                    "Syllabus & Learning Modules",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),

          // Folders and Lessons List
          StreamBuilder<List<CourseFolder>>(
            stream: courseService.getFoldersForCourse(course.id),
            builder: (context, folderSnap) {
              if (folderSnap.connectionState == ConnectionState.waiting) {
                return const SliverToBoxAdapter(
                  child: Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: CircularProgressIndicator(color: AppColors.gold),
                    ),
                  ),
                );
              }

              final folders = folderSnap.data ?? [];

              if (folders.isEmpty) {
                // Render sample module structure
                return SliverList(
                  delegate: SliverChildListDelegate([
                    _buildModuleTile(
                      context,
                      "Module 01: Core Theory & Foundations",
                      [
                        MaterialItem(
                          id: "m1",
                          courseId: course.id,
                          folderId: "f1",
                          title: "Introduction & Unit Breakdown",
                          videoId: "test_video",
                          duration: "45 mins",
                        ),
                        MaterialItem(
                          id: "m2",
                          courseId: course.id,
                          folderId: "f1",
                          title: "Mathematical Formulas & Vector Proofs",
                          videoId: "test_video_2",
                          duration: "58 mins",
                        ),
                      ],
                      user?.email ?? "student@brilliantacademy.lk",
                      hasAccess: true,
                    ),
                    _buildModuleTile(
                      context,
                      "Module 02: Advanced Problems & Past Papers",
                      [
                        MaterialItem(
                          id: "m3",
                          courseId: course.id,
                          folderId: "f2",
                          title: "Model Paper 01 Discussion",
                          videoId: "test_video_3",
                          duration: "1 hr 15 mins",
                        ),
                      ],
                      user?.email ?? "student@brilliantacademy.lk",
                      hasAccess: hasCourseAccess,
                    ),
                  ]),
                );
              }

              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final folder = folders[index];
                    final bool hasFolderAccess = hasCourseAccess || (user != null && user.hasFolderAccess(folder.id));

                    return StreamBuilder<List<MaterialItem>>(
                      stream: courseService.getMaterialsForFolder(folder.id),
                      builder: (context, matSnap) {
                        final materials = matSnap.data ?? [];
                        return _buildModuleTile(
                          context,
                          folder.name,
                          materials,
                          user?.email ?? "student@brilliantacademy.lk",
                          hasAccess: hasFolderAccess,
                        );
                      },
                    );
                  },
                  childCount: folders.length,
                ),
              );
            },
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ],
      ),
    );
  }

  Widget _buildModuleTile(
    BuildContext context,
    String title,
    List<MaterialItem> items,
    String studentEmail, {
    required bool hasAccess,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: ExpansionTile(
        initiallyExpanded: true,
        collapsedIconColor: AppColors.textMuted,
        iconColor: AppColors.gold,
        title: Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 15,
            fontWeight: FontWeight.bold,
          ),
        ),
        children: items.map((item) {
          return ListTile(
            leading: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: hasAccess
                    ? AppColors.gold.withOpacity(0.15)
                    : AppColors.cardBorder.withOpacity(0.5),
                shape: BoxShape.circle,
              ),
              child: Icon(
                hasAccess ? Icons.play_arrow_rounded : Icons.lock_outline,
                color: hasAccess ? AppColors.gold : AppColors.textMuted,
                size: 20,
              ),
            ),
            title: Text(
              item.title,
              style: TextStyle(
                color: hasAccess ? Colors.white : AppColors.textMuted,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            subtitle: item.duration != null
                ? Text(
                    item.duration!,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  )
                : null,
            onTap: () {
              if (!hasAccess) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("Enroll in this course to unlock this lecture"),
                    backgroundColor: AppColors.danger,
                  ),
                );
                return;
              }

              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => SecurePlayerScreen(
                    videoId: item.videoId ?? "test_video",
                    lessonTitle: item.title,
                    studentEmail: studentEmail,
                  ),
                ),
              );
            },
          );
        }).toList(),
      ),
    );
  }
}
