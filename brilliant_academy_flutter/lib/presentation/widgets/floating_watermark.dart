import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';

class FloatingWatermark extends StatefulWidget {
  final String watermarkText;
  final Widget child;

  const FloatingWatermark({
    super.key,
    required this.watermarkText,
    required this.child,
  });

  @override
  State<FloatingWatermark> createState() => _FloatingWatermarkState();
}

class _FloatingWatermarkState extends State<FloatingWatermark> {
  double _posX = 40.0;
  double _posY = 40.0;
  double _speedX = 1.2;
  double _speedY = 1.0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startDrift();
  }

  void _startDrift() {
    _timer = Timer.periodic(const Duration(milliseconds: 30), (timer) {
      if (!mounted) return;
      final size = MediaQuery.of(context).size;
      final maxX = max(0.0, size.width - 240.0);
      final maxY = max(0.0, size.height - 80.0);

      setState(() {
        _posX += _speedX;
        _posY += _speedY;

        if (_posX <= 10 || _posX >= maxX) {
          _speedX = -_speedX;
        }
        if (_posY <= 10 || _posY >= maxY) {
          _speedY = -_speedY;
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        Positioned(
          left: _posX,
          top: _posY,
          child: IgnorePointer(
            child: Opacity(
              opacity: 0.35,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.white24, width: 0.5),
                ),
                child: Text(
                  widget.watermarkText,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
