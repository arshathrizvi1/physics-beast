import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/security/security_service.dart';
import '../../widgets/floating_watermark.dart';

class SecurePlayerScreen extends StatefulWidget {
  final String videoId;
  final String lessonTitle;
  final String studentEmail;

  const SecurePlayerScreen({
    super.key,
    required this.videoId,
    required this.lessonTitle,
    required this.studentEmail,
  });

  @override
  State<SecurePlayerScreen> createState() => _SecurePlayerScreenState();
}

class _SecurePlayerScreenState extends State<SecurePlayerScreen> {
  VideoPlayerController? _videoPlayerController;
  ChewieController? _chewieController;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initSecurePlayback();
  }

  Future<void> _initSecurePlayback() async {
    try {
      // 1. Re-enforce FLAG_SECURE
      await SecurityService.enableAntiScreenCapture();

      // 2. Fetch Cryptographic Cloud Signed DRM URL
      final streamUrl = await SecurityService.generateSecureVideoUrl(widget.videoId);

      _videoPlayerController = VideoPlayerController.networkUrl(
        Uri.parse(streamUrl),
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: false),
      );

      await _videoPlayerController!.initialize();

      _chewieController = ChewieController(
        videoPlayerController: _videoPlayerController!,
        autoPlay: true,
        looping: false,
        aspectRatio: _videoPlayerController!.value.aspectRatio,
        allowFullScreen: true,
        allowMuting: true,
        allowPlaybackSpeedChanging: true,
        playbackSpeeds: const [0.75, 1.0, 1.25, 1.5, 2.0],
        materialProgressColors: ChewieProgressColors(
          playedColor: AppColors.gold,
          handleColor: AppColors.gold,
          backgroundColor: Colors.white24,
          bufferedColor: Colors.white54,
        ),
      );

      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = "Playback error: Unable to load secure video stream.";
        });
      }
    }
  }

  @override
  void dispose() {
    _chewieController?.dispose();
    _videoPlayerController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          widget.lessonTitle,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Video Player Container with Floating Watermark
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Container(
                color: Colors.black,
                child: _isLoading
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(color: AppColors.gold),
                            SizedBox(height: 12),
                            Text(
                              "Decrypting secure stream...",
                              style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                            ),
                          ],
                        ),
                      )
                    : _errorMessage != null
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Text(
                                _errorMessage!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(color: AppColors.danger),
                              ),
                            ),
                          )
                        : FloatingWatermark(
                            watermarkText: widget.studentEmail,
                            child: Chewie(controller: _chewieController!),
                          ),
              ),
            ),

            // Lesson Details and DRM Notice
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                color: AppColors.background,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.lessonTitle,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.shield_outlined, color: AppColors.emerald, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              "DRM Protected • Watermarked for ${widget.studentEmail}",
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
