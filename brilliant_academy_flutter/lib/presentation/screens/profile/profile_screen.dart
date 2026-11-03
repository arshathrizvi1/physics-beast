import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/theme_x.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/app_buttons.dart';
import '../../../core/widgets/app_dialog.dart';
import '../../../services/auth_service.dart';
import '../../../services/theme_service.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../data/models/user_model.dart';
import '../auth/login_screen.dart';
import '../exams/exam_history_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;
    final authService = Provider.of<AuthService>(context);
    final themeService = Provider.of<ThemeService>(context);
    final user = authService.currentUser;

    // Default details matching website screenshots
    final String displayName = (user?.name != null && user!.name!.isNotEmpty)
        ? user.name!
        : "Arshad Rizvi";
    final String studentId = (user?.studentId != null && user!.studentId!.isNotEmpty)
        ? user.studentId!
        : "PB-0007";
    final String batch = (user?.batchId != null && user!.batchId!.isNotEmpty)
        ? user.batchId!
        : "2026";
    final String stream = (user?.stream != null && user!.stream!.isNotEmpty)
        ? user.stream!
        : "private";
    final String phone = (user?.phone != null && user!.phone!.isNotEmpty)
        ? user.phone!
        : "0775950129";
    final String address = (user?.address != null && user!.address!.isNotEmpty)
        ? user.address!
        : "No:19 V.T.G Karunarathna mawatha, Rakwana";

    final int totalXp = user?.totalXp ?? 6;
    final int level = (totalXp / 500).floor() + 1;
    final int currentLevelXp = totalXp % 500;
    final double xpProgress = (currentLevelXp / 500).clamp(0.01, 1.0);

    return AppScaffold(
      includeBottomNavInset: true,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: tokens.gold, width: 1),
              ),
              child: ClipOval(
                child: Image.asset(
                  'assets/images/logo.jpg',
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Icon(Icons.school_rounded, size: 16, color: tokens.gold),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              "Student Profile",
              style: text.headlineSmall?.copyWith(
                color: tokens.textPrimary,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenPadding,
          vertical: AppSpacing.sm,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. IMPERIAL DIGITAL SCHOLAR CARD (Matching Screenshot 2)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.xl),
              decoration: BoxDecoration(
                color: tokens.surface,
                borderRadius: AppRadius.roundedLg,
                border: Border.all(
                  color: tokens.gold.withValues(alpha: isDark ? 0.45 : 0.65),
                  width: 1.5,
                ),
                boxShadow: isDark ? tokens.goldGlow : tokens.e2,
              ),
              child: Column(
                children: [
                  // Avatar with Gold Ring (Tappable for Profile Picture Modal)
                  GestureDetector(
                    onTap: () => _showProfilePictureDialog(context, user, authService),
                    child: Stack(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: tokens.surfaceAlt,
                            border: Border.all(color: tokens.gold, width: 2.5),
                            boxShadow: [
                              BoxShadow(
                                color: tokens.gold.withValues(alpha: 0.25),
                                blurRadius: 14,
                              ),
                            ],
                          ),
                          child: ClipOval(
                            child: (user?.photoUrl != null && user!.photoUrl!.isNotEmpty)
                                ? Image.network(
                                    user.photoUrl!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Center(
                                      child: Text(
                                        displayName.isNotEmpty ? displayName[0].toUpperCase() : "A",
                                        style: TextStyle(
                                          color: tokens.goldText,
                                          fontSize: 34,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ),
                                  )
                                : Center(
                                    child: Text(
                                      displayName.isNotEmpty ? displayName[0].toUpperCase() : "A",
                                      style: TextStyle(
                                        color: tokens.goldText,
                                        fontSize: 34,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              color: tokens.gold,
                              shape: BoxShape.circle,
                              border: Border.all(color: tokens.surface, width: 2),
                            ),
                            child: Icon(Icons.edit_rounded, size: 12, color: tokens.onGold),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Student Name & Edit Icon
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        displayName,
                        style: text.titleLarge?.copyWith(
                          color: tokens.textPrimary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 6),
                      GestureDetector(
                        onTap: () => _showEditProfileModal(context, authService, displayName, phone, address),
                        child: Icon(Icons.edit_outlined, size: 18, color: tokens.textMuted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Student ID Pill Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: tokens.gold.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: tokens.gold.withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      studentId,
                      style: TextStyle(
                        color: tokens.goldText,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Bio & Metadata lines
                  Text(
                    "Brilliant Academy Student (Batch $batch)",
                    style: text.bodySmall?.copyWith(color: tokens.textSecondary, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    stream,
                    style: text.bodySmall?.copyWith(color: tokens.textMuted),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    phone,
                    style: text.bodySmall?.copyWith(color: tokens.textMuted),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    address,
                    style: text.bodySmall?.copyWith(color: tokens.textMuted),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),

                  // Rank / Level Badge
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.workspace_premium_rounded, size: 16, color: tokens.goldText),
                      const SizedBox(width: 4),
                      Text(
                        "Level $level",
                        style: TextStyle(
                          color: tokens.goldText,
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Edit Profile Details Button
                  SizedBox(
                    height: 36,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.edit_note_rounded, size: 16),
                      label: const Text("Edit Profile Details", style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: tokens.textPrimary,
                        side: BorderSide(color: tokens.border),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () => _showEditProfileModal(context, authService, displayName, phone, address),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // XP to Next Level Progress Bar
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "XP to Level ${level + 1}",
                            style: text.labelSmall?.copyWith(color: tokens.textMuted, fontWeight: FontWeight.w700),
                          ),
                          Text(
                            "$currentLevelXp / 500",
                            style: text.labelSmall?.copyWith(color: tokens.textPrimary, fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: Container(
                          height: 7,
                          width: double.infinity,
                          color: tokens.surfaceAlt,
                          child: FractionallySizedBox(
                            alignment: Alignment.centerLeft,
                            widthFactor: xpProgress,
                            child: Container(
                              decoration: BoxDecoration(gradient: tokens.goldGradient),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // 2. FIVE STAT TILES GRID (Matching Screenshot 2 & 3)
            Row(
              children: [
                Expanded(
                  child: _buildProfileStatCard(
                    context,
                    icon: Icons.local_fire_department_rounded,
                    value: "${user?.streakDays ?? 1} Days",
                    label: "Continuous Streak",
                    iconColor: Colors.deepOrange,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: _buildProfileStatCard(
                    context,
                    icon: Icons.timer_outlined,
                    value: "0m",
                    label: "Today's Study Time",
                    iconColor: Colors.purpleAccent,
                    hasYellowDot: true,
                    onTap: () => _showDailyStudyHistoryModal(context),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: _buildProfileStatCard(
                    context,
                    icon: Icons.access_time_rounded,
                    value: "6m",
                    label: "Total Study Time",
                    iconColor: Colors.blueAccent,
                    onTap: () => _showDailyStudyHistoryModal(context),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: _buildProfileStatCard(
                    context,
                    icon: Icons.track_changes_rounded,
                    value: (user != null && user.averageGrade > 0)
                        ? "${user.averageGrade.toStringAsFixed(0)}%"
                        : "0%",
                    label: "Average Grade",
                    iconColor: tokens.success,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            // 5th Stat: Exams Done / Missed (Centered & Harmonious)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
              decoration: BoxDecoration(
                color: tokens.surface,
                borderRadius: AppRadius.roundedLg,
                border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
                boxShadow: isDark ? null : tokens.e1,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: tokens.gold.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.menu_book_rounded, size: 22, color: tokens.goldText),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        "${user?.examsDone ?? 0} / 0",
                        style: text.titleLarge?.copyWith(
                          color: tokens.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 18,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "Exams Done / Missed",
                        style: text.bodySmall?.copyWith(
                          color: tokens.textSecondary,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: AppSpacing.lg),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: tokens.surfaceAlt,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: tokens.border.withValues(alpha: 0.5)),
                    ),
                    child: Text(
                      "Target: 2026 A/L",
                      style: TextStyle(
                        color: tokens.goldText,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // 3. EXAM & PAST PAPER HISTORY (Single Clean Action Card)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: tokens.surface,
                borderRadius: AppRadius.roundedLg,
                border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
                boxShadow: isDark ? null : tokens.e1,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: tokens.gold.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.assignment_turned_in_rounded, color: tokens.goldText, size: 20),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Past Paper & Exam History",
                              style: text.titleMedium?.copyWith(
                                color: tokens.textPrimary,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "Review all completed exam papers, answer sheets, grades & island rankings.",
                              style: text.bodySmall?.copyWith(color: tokens.textSecondary, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Divider(color: tokens.border.withValues(alpha: 0.4)),
                  const SizedBox(height: AppSpacing.md),

                  // Prominent Action Button to Open ExamHistoryScreen
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: tokens.gold,
                        foregroundColor: tokens.onGold,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const ExamHistoryScreen(),
                          ),
                        );
                      },
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.analytics_rounded, size: 18, color: tokens.onGold),
                          const SizedBox(width: 8),
                          Text(
                            "View Full Exam History & Reports",
                            style: TextStyle(
                              color: tokens.onGold,
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Icon(Icons.arrow_forward_rounded, size: 16, color: tokens.onGold),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // 4. BIOMETRIC LOGIN (PASSKEYS) (Matching Screenshot 1)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: tokens.surface,
                borderRadius: AppRadius.roundedLg,
                border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
                boxShadow: isDark ? null : tokens.e1,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.fingerprint_rounded, color: tokens.gold, size: 24),
                      const SizedBox(width: 8),
                      Text(
                        "Biometric Login (Passkeys)",
                        style: text.titleMedium?.copyWith(
                          color: tokens.textPrimary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    "Set up fingerprint, Face ID, or Windows Hello to securely log into your account without a password.",
                    style: text.bodySmall?.copyWith(color: tokens.textSecondary, fontSize: 12, height: 1.4),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  SizedBox(
                    width: double.infinity,
                    height: 42,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.fingerprint, size: 18),
                      label: const Text("Register New Passkey", style: TextStyle(fontWeight: FontWeight.w700)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: tokens.textPrimary,
                        side: BorderSide(color: tokens.border),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () => _handleRegisterPasskey(context, authService),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // 5. FACING TECHNICAL ISSUES OR GLITCHES? (Matching Screenshot 1)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: const Color(0xFFFBF7EE),
                borderRadius: AppRadius.roundedLg,
                border: Border.all(color: tokens.gold.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: tokens.gold.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.shield_outlined, color: tokens.goldText, size: 22),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Facing Technical Issues or Glitches?",
                              style: const TextStyle(
                                color: Color(0xFF14120B),
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "Report video loading errors, quality issues, or exam glitches directly to System Administration.",
                              style: TextStyle(
                                color: tokens.textSecondary,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  SizedBox(
                    width: double.infinity,
                    height: 42,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.shield_outlined, size: 16),
                      label: const Text("Report Issue to Admin", style: TextStyle(fontWeight: FontWeight.w800)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF59E0B),
                        foregroundColor: const Color(0xFF111827),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () => _showReportIssueModal(context, user),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // 6. APPEARANCE (THEME SWITCHER)
            Text(
              "Appearance",
              style: text.titleSmall?.copyWith(
                color: tokens.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            AppCard(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Row(
                children: [
                  _buildThemeOption(
                    context,
                    label: "Light",
                    icon: Icons.light_mode_rounded,
                    isSelected: themeService.themeMode == ThemeMode.light,
                    onTap: () => themeService.setThemeMode(ThemeMode.light),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _buildThemeOption(
                    context,
                    label: "Dark",
                    icon: Icons.dark_mode_rounded,
                    isSelected: themeService.themeMode == ThemeMode.dark,
                    onTap: () => themeService.setThemeMode(ThemeMode.dark),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _buildThemeOption(
                    context,
                    label: "System",
                    icon: Icons.brightness_auto_rounded,
                    isSelected: themeService.themeMode == ThemeMode.system,
                    onTap: () => themeService.setThemeMode(ThemeMode.system),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xxl),

            // SIGN OUT BUTTON
            SecondaryButton(
              text: "Sign Out of Account",
              icon: Icons.logout_rounded,
              textColor: tokens.danger,
              borderColor: tokens.danger.withValues(alpha: 0.4),
              onPressed: () {
                showAppDialog(
                  context: context,
                  title: "Confirm Sign Out",
                  message: "Are you sure you want to sign out from Brilliant Academy?",
                  icon: Icons.logout_rounded,
                  iconColor: tokens.danger,
                  confirmText: "Sign Out",
                  isDestructive: true,
                  onConfirm: () async {
                    await authService.logout();
                    if (context.mounted) {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(builder: (_) => const LoginScreen()),
                        (route) => false,
                      );
                    }
                  },
                );
              },
            ),
            const SizedBox(height: AppSpacing.huge),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileStatCard(
    BuildContext context, {
    required IconData icon,
    required String value,
    required String label,
    required Color iconColor,
    bool hasYellowDot = false,
    bool fullWidth = false,
    VoidCallback? onTap,
  }) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;

    Widget card = Container(
      width: fullWidth ? double.infinity : null,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
      decoration: BoxDecoration(
        color: tokens.surface,
        borderRadius: AppRadius.roundedLg,
        border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
        boxShadow: isDark ? null : tokens.e1,
      ),
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 28, color: iconColor),
              const SizedBox(height: 8),
              Text(
                value,
                style: text.titleLarge?.copyWith(
                  color: tokens.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: text.bodySmall?.copyWith(
                  color: tokens.textSecondary,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
          if (hasYellowDot)
            Positioned(
              top: 0,
              right: 0,
              child: Container(
                width: 7,
                height: 7,
                decoration: const BoxDecoration(
                  color: Color(0xFFF59E0B),
                  shape: BoxShape.circle,
                ),
              ),
            ),
        ],
      ),
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: card,
      );
    }
    return card;
  }

  // Daily Study History Modal (Matching Screenshot 5)
  void _showDailyStudyHistoryModal(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;

    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          backgroundColor: tokens.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.xl)),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.timer_outlined, color: tokens.goldText, size: 22),
                        const SizedBox(width: 8),
                        Text(
                          "Daily Study History",
                          style: text.titleMedium?.copyWith(
                            color: tokens.textPrimary,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Divider(color: tokens.border.withValues(alpha: 0.5)),
                const SizedBox(height: AppSpacing.sm),

                _buildSessionRow(tokens, "Tue, Oct 13, 2026", "Session Record", "0h 3m"),
                const SizedBox(height: AppSpacing.sm),
                _buildSessionRow(tokens, "Wed, Oct 7, 2026", "Session Record", "0h 3m"),
                const SizedBox(height: AppSpacing.sm),
                _buildSessionRow(tokens, "Sun, Oct 4, 2026", "Session Record", "0h 12m"),

                const SizedBox(height: AppSpacing.lg),
                Divider(color: tokens.border.withValues(alpha: 0.5)),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Updates dynamically.",
                      style: text.labelSmall?.copyWith(color: tokens.textMuted, fontSize: 11),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: Text(
                        "Close",
                        style: TextStyle(color: tokens.goldText, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSessionRow(dynamic tokens, String date, String subtitle, String duration) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: tokens.surfaceAlt,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: tokens.gold.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.description_outlined, color: tokens.goldText, size: 16),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  date,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                ),
                Text(
                  subtitle,
                  style: TextStyle(color: tokens.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: tokens.surface,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
            ),
            child: Text(
              duration,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  // Passkey Registration Handler with Biometric Device Feedback
  void _handleRegisterPasskey(BuildContext context, AuthService authService) async {
    HapticFeedback.mediumImpact();
    final result = await authService.registerPasskey();
    if (!context.mounted) return;
    if (result['success'] == true) {
      showAppDialog(
        context: context,
        title: "Passkey Registered",
        message: "Your biometric credential (fingerprint / Face ID) has been successfully enrolled on this device. You can now use instant 1-tap sign-in without entering a password.",
        icon: Icons.fingerprint_rounded,
        iconColor: context.tokens.gold,
        confirmText: "Done",
        onConfirm: () {},
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['error'] ?? "Biometric registration failed."),
          backgroundColor: context.tokens.danger,
        ),
      );
    }
  }

  // Edit Profile Modal
  void _showEditProfileModal(
    BuildContext context,
    AuthService authService,
    String currentName,
    String currentPhone,
    String currentAddress,
  ) {
    final tokens = context.tokens;
    final nameCtrl = TextEditingController(text: currentName);
    final phoneCtrl = TextEditingController(text: currentPhone);
    final addressCtrl = TextEditingController(text: currentAddress);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: tokens.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.screenPadding,
            right: AppSpacing.screenPadding,
            top: AppSpacing.screenPadding,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.screenPadding,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Edit Profile Details",
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: tokens.textPrimary),
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: "Full Name"),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: "Phone Number"),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextField(
                controller: addressCtrl,
                decoration: const InputDecoration(labelText: "Residential Address"),
              ),
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(
                text: "Save Changes",
                onPressed: () async {
                  await authService.updateUserProfile(
                    name: nameCtrl.text,
                    phone: phoneCtrl.text,
                    address: addressCtrl.text,
                  );
                  if (ctx.mounted) Navigator.pop(ctx);
                  setState(() {});
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // Profile Picture Modal (Matching Screenshot 4)
  void _showProfilePictureDialog(BuildContext context, UserModel? user, AuthService authService) {
    final tokens = context.tokens;
    final text = context.text;
    final displayName = user?.name ?? "Student";
    final initialLetter = displayName.isNotEmpty ? displayName[0].toUpperCase() : "A";

    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          backgroundColor: tokens.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Top Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const SizedBox(width: 32),
                    Text(
                      "Profile Picture",
                      style: text.titleMedium?.copyWith(
                        color: tokens.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                      ),
                    ),
                    IconButton(
                      icon: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: tokens.surfaceAlt,
                          border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
                        ),
                        child: Icon(Icons.close_rounded, size: 16, color: tokens.textMuted),
                      ),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Large Circular Avatar (Exact Match with Screenshot 4)
                Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFFFBF4D8),
                    border: Border.all(color: const Color(0xFFE5A919), width: 3.5),
                    boxShadow: [
                      BoxShadow(
                        color: tokens.gold.withValues(alpha: 0.25),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: ClipOval(
                    child: (user?.photoUrl != null && user!.photoUrl!.isNotEmpty)
                        ? Image.network(
                            user.photoUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Center(
                              child: Text(
                                initialLetter,
                                style: const TextStyle(
                                  color: Color(0xFFC78B0C),
                                  fontSize: 64,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          )
                        : Center(
                            child: Text(
                              initialLetter,
                              style: const TextStyle(
                                color: Color(0xFFC78B0C),
                                fontSize: 64,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 28),

                // Change Profile Picture Gold Button
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _showPickAvatarSheet(context, authService);
                    },
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    label: const Text(
                      "Change Profile Picture",
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE5A919),
                      foregroundColor: const Color(0xFF14120B),
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // Pick / Change Avatar Options
  void _showPickAvatarSheet(BuildContext context, AuthService authService) {
    final tokens = context.tokens;
    final urlCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: tokens.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: AppSpacing.screenPadding,
            right: AppSpacing.screenPadding,
            top: AppSpacing.screenPadding,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.screenPadding,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Update Profile Photo / Avatar",
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: tokens.textPrimary),
              ),
              const SizedBox(height: 6),
              Text(
                "Enter a direct image URL or choose a Scholar avatar preset:",
                style: TextStyle(color: tokens.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: AppSpacing.md),
              TextField(
                controller: urlCtrl,
                decoration: const InputDecoration(
                  labelText: "Image URL (HTTPS link)",
                  hintText: "https://images.unsplash.com/...",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                "Scholar Preset Avatars:",
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: tokens.textSecondary),
              ),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: 12,
                children: [
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300",
                  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300",
                  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=300",
                ].map((presetUrl) {
                  return GestureDetector(
                    onTap: () {
                      urlCtrl.text = presetUrl;
                    },
                    child: Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: tokens.gold, width: 2),
                      ),
                      child: ClipOval(
                        child: Image.network(presetUrl, fit: BoxFit.cover),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.lg),
              PrimaryButton(
                text: "Save Picture",
                onPressed: () async {
                  if (urlCtrl.text.trim().isNotEmpty) {
                    await authService.updateUserProfile(photoUrl: urlCtrl.text.trim());
                  }
                  if (ctx.mounted) Navigator.pop(ctx);
                  setState(() {});
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // Report Technical Issue Modal (Matching Screenshot 3 & ReportIssueModal.tsx)
  void _showReportIssueModal(BuildContext context, [UserModel? user]) {
    String selectedCategory = "Loading Error (Page/Video won't load)";
    final descCtrl = TextEditingController();
    bool isSubmitting = false;

    final categories = [
      "Loading Error (Page/Video won't load)",
      "Video Playback / Quality Glitch",
      "Exam / Submission Error",
      "Payment / Receipt Issue",
      "Other Glitch",
    ];

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setDialogState) {
            return Dialog(
              backgroundColor: const Color(0xFF0F0E0B),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
              ),
              child: Container(
                width: 480,
                padding: const EdgeInsets.all(22),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header with Shield and Close X
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.shield_outlined, color: Color(0xFFE5A919), size: 24),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "Report Technical Issue",
                                  style: TextStyle(
                                    color: Color(0xFFE5A919),
                                    fontWeight: FontWeight.w800,
                                    fontSize: 18,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  "Notice a bug or glitch? Send technical problems directly to System Administrators.",
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.65),
                                    fontSize: 11,
                                    height: 1.3,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          GestureDetector(
                            onTap: () => Navigator.pop(dialogCtx),
                            child: Icon(Icons.close_rounded, size: 20, color: Colors.white.withValues(alpha: 0.7)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // ISSUE TYPE / CATEGORY
                      Text(
                        "ISSUE TYPE / CATEGORY",
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontWeight: FontWeight.w700,
                          fontSize: 11,
                          letterSpacing: 0.6,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFF191815),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selectedCategory,
                            dropdownColor: const Color(0xFF1E1C17),
                            isExpanded: true,
                            icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white70),
                            items: categories.map((cat) {
                              return DropdownMenuItem(
                                value: cat,
                                child: Text(
                                  cat,
                                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setDialogState(() => selectedCategory = val);
                              }
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // DESCRIPTION OF THE PROBLEM
                      Text(
                        "DESCRIPTION OF THE PROBLEM",
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontWeight: FontWeight.w700,
                          fontSize: 11,
                          letterSpacing: 0.6,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF191815),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                        ),
                        child: TextField(
                          controller: descCtrl,
                          maxLines: 4,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          decoration: InputDecoration(
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.all(12),
                            hintText: "Please describe what happened, what page you were on, or any error message you saw...",
                            hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.35), fontSize: 12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // ATTACH SCREENSHOT / IMAGE (OPTIONAL)
                      Text(
                        "ATTACH SCREENSHOT / IMAGE (OPTIONAL)",
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontWeight: FontWeight.w700,
                          fontSize: 11,
                          letterSpacing: 0.6,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 22),
                        decoration: BoxDecoration(
                          color: const Color(0xFF161511),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.2),
                            style: BorderStyle.solid,
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.image_outlined, color: Colors.white.withValues(alpha: 0.4), size: 30),
                            const SizedBox(height: 8),
                            Text(
                              "Click to upload screenshot (Max 5MB)",
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.6),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Action Row: ADMIN ONLY • Cancel • Report Issue
                      Row(
                        children: [
                          Row(
                            children: [
                              Icon(Icons.shield, size: 14, color: const Color(0xFFE5A919).withValues(alpha: 0.8)),
                              const SizedBox(width: 4),
                              Text(
                                "ADMIN ONLY",
                                style: TextStyle(
                                  color: const Color(0xFFE5A919).withValues(alpha: 0.8),
                                  fontWeight: FontWeight.w800,
                                  fontSize: 11,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                          const Spacer(),
                          TextButton(
                            onPressed: () => Navigator.pop(dialogCtx),
                            child: Text(
                              "Cancel",
                              style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontWeight: FontWeight.w700),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: isSubmitting
                                ? null
                                : () async {
                                    if (descCtrl.text.trim().isEmpty) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text("Please describe the issue.")),
                                      );
                                      return;
                                    }

                                    setDialogState(() => isSubmitting = true);
                                    try {
                                      // Write issue to Firestore
                                      await FirebaseFirestore.instance.collection("examMessages").add({
                                        "type": "technical",
                                        "studentName": user?.name ?? "Student",
                                        "studentEmail": user?.email ?? "",
                                        "studentId": user?.uid ?? "",
                                        "topic": selectedCategory,
                                        "message": "[Category: $selectedCategory]\n${descCtrl.text.trim()}",
                                        "imageUrl": null,
                                        "timestamp": DateTime.now().millisecondsSinceEpoch,
                                        "status": "unread",
                                      });

                                      await FirebaseFirestore.instance.collection("notifications").add({
                                        "target": "admin",
                                        "title": "New Technical Issue Reported 🚨",
                                        "message": "A student reported a $selectedCategory.",
                                        "link": "/admin#messages",
                                        "timestamp": DateTime.now().millisecondsSinceEpoch,
                                        "type": "technical",
                                        "readBy": [],
                                      });

                                      if (dialogCtx.mounted) Navigator.pop(dialogCtx);
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text("Glitch report submitted directly to Admin. Thank you!"),
                                            backgroundColor: Colors.green,
                                          ),
                                        );
                                      }
                                    } catch (e) {
                                      if (dialogCtx.mounted) {
                                        setDialogState(() => isSubmitting = false);
                                      }
                                      if (context.mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(content: Text("Report failed: $e")),
                                        );
                                      }
                                    }
                                  },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFF59E0B),
                              foregroundColor: const Color(0xFF14120B),
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: isSubmitting
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                                : const Text(
                                    "Report Issue",
                                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                                  ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  // Detailed Exam Report Modal (Full Question Breakdown)
  Widget _buildThemeOption(
    BuildContext context, {
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    final tokens = context.tokens;

    return Expanded(
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: AnimatedContainer(
          duration: AppDurations.fast,
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
          decoration: BoxDecoration(
            color: isSelected ? tokens.gold : tokens.surfaceAlt,
            borderRadius: AppRadius.roundedMd,
            boxShadow: isSelected ? tokens.goldGlow : null,
          ),
          child: Column(
            children: [
              Icon(icon, size: 20, color: isSelected ? tokens.onGold : tokens.textSecondary),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? tokens.onGold : tokens.textSecondary,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
