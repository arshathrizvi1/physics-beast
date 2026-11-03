import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/theme_x.dart';

class SubjectCardArtwork extends StatelessWidget {
  final String subjectId;
  final String subjectName;
  final String? imageUrl;
  final bool isSelected;

  const SubjectCardArtwork({
    super.key,
    required this.subjectId,
    required this.subjectName,
    this.imageUrl,
    this.isSelected = false,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final id = subjectId.toLowerCase();
    final name = subjectName.toLowerCase();

    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: imageUrl!,
        fit: BoxFit.cover,
        placeholder: (_, __) => _buildArt(context, id, name, tokens),
        errorWidget: (_, __, ___) => _buildArt(context, id, name, tokens),
      );
    }

    return _buildArt(context, id, name, tokens);
  }

  Widget _buildArt(BuildContext context, String id, String name, dynamic tokens) {
    Color bg1;
    Color bg2;
    Color accentColor;
    IconData icon;
    String subLabel;

    if (id == "all" || name.contains("all")) {
      bg1 = const Color(0xFF2A200B);
      bg2 = const Color(0xFF141005);
      accentColor = const Color(0xFFFBBF24);
      icon = Icons.auto_stories_rounded;
      subLabel = "All Curricula";
    } else if (id.contains("physic") || name.contains("physic")) {
      bg1 = const Color(0xFF1E382B); // Chalkboard green
      bg2 = const Color(0xFF0C1913);
      accentColor = const Color(0xFF34D399);
      icon = Icons.science_rounded;
      subLabel = "E = mc² • Mechanics";
    } else if (id.contains("math") || name.contains("math")) {
      bg1 = const Color(0xFF15263F); // Academic navy
      bg2 = const Color(0xFF09121E);
      accentColor = const Color(0xFF38BDF8);
      icon = Icons.calculate_rounded;
      subLabel = "∫ Calculus • Pure Math";
    } else if (id.contains("chem") || name.contains("chem")) {
      bg1 = const Color(0xFF113832); // Emerald
      bg2 = const Color(0xFF071B18);
      accentColor = const Color(0xFF2DD4BF);
      icon = Icons.biotech_rounded;
      subLabel = "Organic & Inorganic";
    } else if (id.contains("ict") || name.contains("ict") || name.contains("tech")) {
      bg1 = const Color(0xFF22173D); // Cyber slate
      bg2 = const Color(0xFF0D0819);
      accentColor = const Color(0xFFA78BFA);
      icon = Icons.computer_rounded;
      subLabel = "< / > Python • Web";
    } else {
      bg1 = const Color(0xFF1B3338); // Teal
      bg2 = const Color(0xFF0B191C);
      accentColor = const Color(0xFF2DD4BF);
      icon = Icons.school_rounded;
      subLabel = "A/L 2026 Core";
    }

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [bg1, bg2],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background subtle ambient radial glow
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: accentColor.withValues(alpha: isSelected ? 0.22 : 0.12),
              ),
            ),
          ),

          // Chalk dust / subtle grid
          CustomPaint(
            painter: _SubjectArtPainter(accentColor: accentColor),
          ),

          // Central Icon & Formula subtitle
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.black.withValues(alpha: 0.35),
                  border: Border.all(
                    color: isSelected ? tokens.gold : accentColor.withValues(alpha: 0.35),
                    width: isSelected ? 1.5 : 1.0,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: tokens.gold.withValues(alpha: 0.3),
                            blurRadius: 10,
                          ),
                        ]
                      : null,
                ),
                child: Icon(
                  icon,
                  size: 26,
                  color: isSelected ? tokens.gold : accentColor,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                subLabel,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.55),
                  fontSize: 10.0,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.4,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),

          // Top right selection checkmark
          if (isSelected)
            Positioned(
              top: 6,
              right: 6,
              child: Container(
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: tokens.goldGradient,
                  boxShadow: [
                    BoxShadow(
                      color: tokens.gold.withValues(alpha: 0.5),
                      blurRadius: 6,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.check,
                  size: 11,
                  color: Color(0xFF1A1405),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _SubjectArtPainter extends CustomPainter {
  final Color accentColor;

  _SubjectArtPainter({required this.accentColor});

  @override
  void paint(Canvas canvas, Size size) {
    final ringPaint = Paint()
      ..color = accentColor.withValues(alpha: 0.08)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final center = Offset(size.width / 2, size.height / 2);
    canvas.drawCircle(center, size.height * 0.45, ringPaint);
    canvas.drawOval(
      Rect.fromCenter(center: center, width: size.width * 0.85, height: size.height * 0.45),
      ringPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _SubjectArtPainter oldDelegate) {
    return oldDelegate.accentColor != accentColor;
  }
}
