import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/theme_x.dart';
import '../../core/theme/app_spacing.dart';

/// Renders a prestigious academic chalkboard or course thumbnail.
/// If an image URL is present and loads, it renders it with an academic gradient overlay.
/// If offline or image is null, it paints a rich green or deep slate chalkboard
/// with authentic academic formulas (E=mc², calculus, code, etc.) and glowing play emblem.
class AcademicThumbnail extends StatelessWidget {
  final String? imageUrl;
  final String subject;
  final String courseName;
  final String teacherName;
  final bool isMonthly;
  final bool hasAccess;
  final double aspectRatio;

  const AcademicThumbnail({
    super.key,
    this.imageUrl,
    required this.subject,
    required this.courseName,
    required this.teacherName,
    this.isMonthly = false,
    this.hasAccess = false,
    this.aspectRatio = 16 / 10,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final subjectLower = subject.toLowerCase();

    return AspectRatio(
      aspectRatio: aspectRatio,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background Image or Custom Chalkboard
          if (imageUrl != null && imageUrl!.isNotEmpty)
            CachedNetworkImage(
              imageUrl: imageUrl!,
              fit: BoxFit.cover,
              placeholder: (_, __) => _buildChalkboard(context, subjectLower),
              errorWidget: (_, __, ___) => _buildChalkboard(context, subjectLower),
            )
          else
            _buildChalkboard(context, subjectLower),

          // Vignette gradient for text readability and cinematic depth
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.35),
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.75),
                ],
                stops: const [0.0, 0.45, 1.0],
              ),
            ),
          ),

          // Top Left: Premium Live / Masterclass Badge
          Positioned(
            top: 8,
            left: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
              decoration: BoxDecoration(
                gradient: isMonthly
                    ? tokens.goldGradient
                    : const LinearGradient(
                        colors: [Color(0xFFFBBF24), Color(0xFFD97706)],
                      ),
                borderRadius: AppRadius.roundedPill,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.4),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                isMonthly ? "PREMIUM LIVE" : "MASTERCLASS",
                style: const TextStyle(
                  color: Color(0xFF1A1405),
                  fontSize: 9.0,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),

          // Top Right: Teacher Chip
          Positioned(
            top: 8,
            right: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.78),
                borderRadius: AppRadius.roundedPill,
                border: Border.all(
                  color: tokens.gold.withValues(alpha: 0.4),
                  width: 0.8,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.4),
                    blurRadius: 4,
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.school_rounded, size: 11, color: tokens.gold),
                  const SizedBox(width: 3),
                  Text(
                    teacherName.contains("Dr.")
                        ? "Dr."
                        : teacherName.contains("Prof.")
                            ? "Prof."
                            : "Faculty",
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10.0,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Right: Elevated Circular Play Button
          Positioned(
            bottom: 8,
            right: 8,
            child: Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: tokens.goldGradient,
                boxShadow: [
                  BoxShadow(
                    color: tokens.gold.withValues(alpha: 0.5),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Center(
                child: Icon(
                  Icons.play_arrow_rounded,
                  color: tokens.onGold,
                  size: 18,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChalkboard(BuildContext context, String subjectLower) {
    Color bgStart;
    Color bgEnd;
    Color accentColor;
    String formulaText;
    IconData subjectIcon;

    if (subjectLower.contains("physic")) {
      bgStart = const Color(0xFF1E382B); // Deep academic chalkboard green
      bgEnd = const Color(0xFF0F1E17);
      accentColor = const Color(0xFFFBBF24);
      formulaText = "E = mc²";
      subjectIcon = Icons.science_rounded;
    } else if (subjectLower.contains("math")) {
      bgStart = const Color(0xFF15263F); // Deep chalkboard navy
      bgEnd = const Color(0xFF09121E);
      accentColor = const Color(0xFF38BDF8);
      formulaText = "∫ f(x) dx";
      subjectIcon = Icons.calculate_rounded;
    } else if (subjectLower.contains("ict") || subjectLower.contains("tech")) {
      bgStart = const Color(0xFF22173D); // Deep cyber slate
      bgEnd = const Color(0xFF0D0819);
      accentColor = const Color(0xFFA78BFA);
      formulaText = "< / >";
      subjectIcon = Icons.code_rounded;
    } else if (subjectLower.contains("chem")) {
      bgStart = const Color(0xFF113832); // Deep emerald chalkboard
      bgEnd = const Color(0xFF071B18);
      accentColor = const Color(0xFF34D399);
      formulaText = "H₂O • NaCl";
      subjectIcon = Icons.biotech_rounded;
    } else {
      bgStart = const Color(0xFF242220); // Classic dark slate chalkboard
      bgEnd = const Color(0xFF121110);
      accentColor = const Color(0xFFE5C07B);
      formulaText = "A/L 2026";
      subjectIcon = Icons.auto_stories_rounded;
    }

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [bgStart, bgEnd],
        ),
      ),
      child: CustomPaint(
        painter: _ChalkboardPainter(
          accentColor: accentColor,
          formulaText: formulaText,
          subjectIcon: subjectIcon,
        ),
      ),
    );
  }
}

class _ChalkboardPainter extends CustomPainter {
  final Color accentColor;
  final String formulaText;
  final IconData subjectIcon;

  _ChalkboardPainter({
    required this.accentColor,
    required this.formulaText,
    required this.subjectIcon,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Subtle chalkboard grid / chalk lines
    final linePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.05)
      ..strokeWidth = 1.0;

    for (double y = 16; y < size.height; y += 24) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), linePaint);
    }

    // 2. Draw circular orbital chalk glow in background
    final orbitPaint = Paint()
      ..color = accentColor.withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    final center = Offset(size.width * 0.42, size.height * 0.52);
    canvas.drawCircle(center, size.height * 0.35, orbitPaint);
    canvas.drawOval(
      Rect.fromCenter(center: center, width: size.width * 0.65, height: size.height * 0.35),
      orbitPaint,
    );

    // 3. Chalkboard formula text in authentic academic font
    final textPainter = TextPainter(
      text: TextSpan(
        text: formulaText,
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.38),
          fontSize: size.width > 200 ? 28.0 : 22.0,
          fontWeight: FontWeight.w800,
          fontStyle: FontStyle.italic,
          letterSpacing: 2.0,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    final textOffset = Offset(
      center.dx - (textPainter.width / 2),
      center.dy - (textPainter.height / 2),
    );
    textPainter.paint(canvas, textOffset);
  }

  @override
  bool shouldRepaint(covariant _ChalkboardPainter oldDelegate) {
    return oldDelegate.accentColor != accentColor || oldDelegate.formulaText != formulaText;
  }
}
