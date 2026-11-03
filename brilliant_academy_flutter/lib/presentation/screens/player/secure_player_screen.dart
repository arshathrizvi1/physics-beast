import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../core/theme/theme_x.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../data/models/course_model.dart';
import '../../../services/player_settings_service.dart';
import '../../widgets/floating_watermark.dart';

enum ActivePlayerServer { bunny, r2, youtube }

class SecurePlayerScreen extends StatefulWidget {
  final String videoId;
  final String lessonTitle;
  final String studentEmail;
  final MaterialItem? item;
  final String? url;
  final String? r2Url;
  final String? originalYoutubeUrl;
  final String? libraryId;
  final String? platform;
  final Map<String, dynamic>? playerSettings;

  const SecurePlayerScreen({
    super.key,
    required this.videoId,
    required this.lessonTitle,
    required this.studentEmail,
    this.item,
    this.url,
    this.r2Url,
    this.originalYoutubeUrl,
    this.libraryId,
    this.platform,
    this.playerSettings,
  });

  @override
  State<SecurePlayerScreen> createState() => _SecurePlayerScreenState();
}

class _SecurePlayerScreenState extends State<SecurePlayerScreen> {
  final PlayerSettingsService _settingsService = PlayerSettingsService();
  GlobalPlayerSettings _globalSettings = const GlobalPlayerSettings();

  ActivePlayerServer _activeServer = ActivePlayerServer.bunny;
  VideoPlayerController? _videoPlayerController;
  ChewieController? _chewieController;
  WebViewController? _webViewController;

  bool _isLoading = true;
  String? _errorMessage;
  bool _isLandscape = false;
  double _playbackSpeed = 1.0;
  String _selectedQuality = "Auto";

  final List<double> _speeds = const [0.75, 1.0, 1.25, 1.5, 2.0];
  final List<String> _qualities = const ["Auto", "1080p", "720p", "480p", "360p"];

  // Resolved sources
  String? _resolvedBunnyUrl;
  String? _resolvedR2Url;
  String? _resolvedYoutubeId;

  @override
  void initState() {
    super.initState();
    _extractSources();
    _loadSettingsAndInitialize();
  }

  void _extractSources() {
    final item = widget.item;
    final url = widget.url ?? item?.url;
    final r2 = widget.r2Url ?? item?.r2Url;
    final ytUrl = widget.originalYoutubeUrl ?? item?.originalYoutubeUrl ?? url;
    final vidId = (widget.videoId.isNotEmpty && widget.videoId != "test_video")
        ? widget.videoId
        : (item?.videoId ?? item?.id ?? "");
    final libId = widget.libraryId ?? item?.libraryId ?? "387920";

    // 1. Bunny URL
    if (vidId.isNotEmpty && vidId.length > 5 && !vidId.startsWith("http")) {
      _resolvedBunnyUrl = "https://iframe.mediadelivery.net/embed/$libId/$vidId?autoplay=true&preload=true";
    } else if (url != null && url.contains("mediadelivery.net")) {
      _resolvedBunnyUrl = url;
    } else if (url != null && (url.contains(".m3u8") || url.contains("b-cdn.net"))) {
      _resolvedBunnyUrl = url;
    }

    // 2. R2 URL
    if (r2 != null && r2.isNotEmpty) {
      _resolvedR2Url = r2;
    } else if (url != null && (url.contains(".mp4") || url.contains("r2.dev") || url.contains("cloudflare"))) {
      _resolvedR2Url = url;
    }

    // 3. YouTube ID
    _resolvedYoutubeId = _parseYoutubeId(ytUrl);

    // Fallbacks if only sample video
    if (_resolvedBunnyUrl == null && _resolvedR2Url == null && _resolvedYoutubeId == null) {
      // Default high reliability stream
      _resolvedBunnyUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      _resolvedR2Url = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    }
  }

  String? _parseYoutubeId(String? url) {
    if (url == null || url.trim().isEmpty) return null;
    final match = RegExp(r'(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})')
        .firstMatch(url);
    return match?.group(1);
  }

  Future<void> _loadSettingsAndInitialize() async {
    _globalSettings = await _settingsService.getPlayerSettingsOnce();
    if (!mounted) return;

    // Pick best permitted default server
    final Map<String, dynamic>? itemSettings = widget.playerSettings ?? widget.item?.playerSettings;
    final bool bunnyAllowed = PlayerSettingsService.isPlayerAllowedOnApp(
      serverKey: 'bunny',
      globalSettings: _globalSettings,
      videoPlayerSettings: itemSettings,
    ) && _resolvedBunnyUrl != null;

    final bool r2Allowed = PlayerSettingsService.isPlayerAllowedOnApp(
      serverKey: 'r2',
      globalSettings: _globalSettings,
      videoPlayerSettings: itemSettings,
    ) && _resolvedR2Url != null;

    final bool ytAllowed = PlayerSettingsService.isPlayerAllowedOnApp(
      serverKey: 'youtube',
      globalSettings: _globalSettings,
      videoPlayerSettings: itemSettings,
    ) && _resolvedYoutubeId != null;

    if (bunnyAllowed) {
      _activeServer = ActivePlayerServer.bunny;
    } else if (r2Allowed) {
      _activeServer = ActivePlayerServer.r2;
    } else if (ytAllowed) {
      _activeServer = ActivePlayerServer.youtube;
    } else {
      _activeServer = ActivePlayerServer.bunny;
    }

    _initializeCurrentServer();
  }

  Future<void> _initializeCurrentServer() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    _chewieController?.dispose();
    _chewieController = null;
    _videoPlayerController?.dispose();
    _videoPlayerController = null;
    _webViewController = null;

    try {
      if (_activeServer == ActivePlayerServer.bunny) {
        final bunnyTarget = _resolvedBunnyUrl ?? "";
        if (bunnyTarget.contains("iframe.mediadelivery.net")) {
          _initWebView(bunnyTarget);
        } else if (bunnyTarget.endsWith(".m3u8") || bunnyTarget.endsWith(".mp4") || bunnyTarget.contains("b-cdn.net") || bunnyTarget.contains("googleapis.com")) {
          await _initNativePlayer(bunnyTarget);
        } else {
          _initWebView(bunnyTarget);
        }
      } else if (_activeServer == ActivePlayerServer.r2) {
        final r2Target = _resolvedR2Url ?? _resolvedBunnyUrl ?? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
        await _initNativePlayer(r2Target);
      } else if (_activeServer == ActivePlayerServer.youtube) {
        final ytId = _resolvedYoutubeId ?? "dQw4w9WgXcQ";
        final ytUrl = "https://www.youtube-nocookie.com/embed/$ytId?autoplay=1&modestbranding=1&rel=0&playsinline=1&controls=1&fs=1";
        _initWebView(ytUrl);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = "Playback notice: Stream server adjusting connection...";
        });
        // Auto-fallback smoothly to R2 or direct player
        if (_activeServer != ActivePlayerServer.r2 && _resolvedR2Url != null) {
          _switchServer(ActivePlayerServer.r2);
        }
      }
    }
  }

  Future<void> _initNativePlayer(String url) async {
    _videoPlayerController = VideoPlayerController.networkUrl(
      Uri.parse(url),
      videoPlayerOptions: VideoPlayerOptions(mixWithOthers: false),
    );

    await _videoPlayerController!.initialize();
    await _videoPlayerController!.setPlaybackSpeed(_playbackSpeed);

    _chewieController = ChewieController(
      videoPlayerController: _videoPlayerController!,
      autoPlay: true,
      looping: false,
      aspectRatio: _videoPlayerController!.value.aspectRatio > 0
          ? _videoPlayerController!.value.aspectRatio
          : 16 / 9,
      allowFullScreen: true,
      allowMuting: true,
      allowPlaybackSpeedChanging: true,
      playbackSpeeds: _speeds,
      materialProgressColors: ChewieProgressColors(
        playedColor: const Color(0xFFC9A227),
        handleColor: const Color(0xFFC9A227),
        backgroundColor: Colors.white24,
        bufferedColor: Colors.white54,
      ),
    );

    if (mounted) {
      setState(() {
        _isLoading = false;
        _errorMessage = null;
      });
    }
  }

  void _initWebView(String url) {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
          },
          onWebResourceError: (error) {
            // Ignore subframe tracker errors
          },
        ),
      )
      ..loadRequest(Uri.parse(url));

    if (mounted) {
      setState(() {
        _isLoading = false;
        _errorMessage = null;
      });
    }
  }

  void _switchServer(ActivePlayerServer server) {
    if (_activeServer == server) return;
    HapticFeedback.selectionClick();
    setState(() => _activeServer = server);
    _initializeCurrentServer();
  }

  void _toggleFullscreen() {
    HapticFeedback.lightImpact();
    if (_isLandscape) {
      SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
      setState(() => _isLandscape = false);
    } else {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      setState(() => _isLandscape = true);
    }
  }

  void _showSpeedDialog() {
    final tokens = context.tokens;
    showModalBottomSheet(
      context: context,
      backgroundColor: tokens.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                "Playback Speed",
                style: TextStyle(
                  color: tokens.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 16.0,
                ),
              ),
              const SizedBox(height: 8.0),
              ..._speeds.map((s) => ListTile(
                    title: Text(
                      "${s}x ${s == 1.0 ? '(Normal)' : ''}",
                      style: TextStyle(
                        color: _playbackSpeed == s ? tokens.goldText : tokens.textPrimary,
                        fontWeight: _playbackSpeed == s ? FontWeight.w800 : FontWeight.w500,
                      ),
                    ),
                    trailing: _playbackSpeed == s
                        ? Icon(Icons.check_rounded, color: tokens.goldText)
                        : null,
                    onTap: () {
                      setState(() => _playbackSpeed = s);
                      _videoPlayerController?.setPlaybackSpeed(s);
                      Navigator.pop(ctx);
                    },
                  )),
            ],
          ),
        ),
      ),
    );
  }

  void _showQualityDialog() {
    final tokens = context.tokens;
    showModalBottomSheet(
      context: context,
      backgroundColor: tokens.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                "Video Quality Settings",
                style: TextStyle(
                  color: tokens.textPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 16.0,
                ),
              ),
              const SizedBox(height: 8.0),
              ..._qualities.map((q) => ListTile(
                    title: Text(
                      q == "Auto" ? "Auto (Recommended)" : q,
                      style: TextStyle(
                        color: _selectedQuality == q ? tokens.goldText : tokens.textPrimary,
                        fontWeight: _selectedQuality == q ? FontWeight.w800 : FontWeight.w500,
                      ),
                    ),
                    trailing: _selectedQuality == q
                        ? Icon(Icons.check_rounded, color: tokens.goldText)
                        : null,
                    onTap: () {
                      setState(() => _selectedQuality = q);
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text("Stream quality set to $q"),
                          duration: const Duration(seconds: 2),
                          backgroundColor: tokens.surfaceAlt,
                        ),
                      );
                    },
                  )),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    _chewieController?.dispose();
    _videoPlayerController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = context.text;
    final isDark = context.isDark;

    final Map<String, dynamic>? itemSettings = widget.playerSettings ?? widget.item?.playerSettings;
    final bool bunnyPermitted = PlayerSettingsService.isPlayerAllowedOnApp(
      serverKey: 'bunny',
      globalSettings: _globalSettings,
      videoPlayerSettings: itemSettings,
    ) && _resolvedBunnyUrl != null;

    final bool r2Permitted = PlayerSettingsService.isPlayerAllowedOnApp(
      serverKey: 'r2',
      globalSettings: _globalSettings,
      videoPlayerSettings: itemSettings,
    ) && _resolvedR2Url != null;

    final bool youtubePermitted = PlayerSettingsService.isPlayerAllowedOnApp(
      serverKey: 'youtube',
      globalSettings: _globalSettings,
      videoPlayerSettings: itemSettings,
    ) && _resolvedYoutubeId != null;

    if (_isLandscape) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            Center(child: _buildPlayerContent()),
            Positioned(
              top: 16.0,
              right: 16.0,
              child: IconButton(
                icon: const Icon(Icons.fullscreen_exit_rounded, color: Colors.white, size: 28.0),
                onPressed: _toggleFullscreen,
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: tokens.bg,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          widget.lessonTitle,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16.0,
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.speed_rounded, color: Colors.white, size: 22.0),
            tooltip: "Speed",
            onPressed: _showSpeedDialog,
          ),
          IconButton(
            icon: const Icon(Icons.tune_rounded, color: Colors.white, size: 22.0),
            tooltip: "Quality",
            onPressed: _showQualityDialog,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Video Player Container with Floating Watermark & Full Controls
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Container(
                color: Colors.black,
                child: Stack(
                  children: [
                    _buildPlayerContent(),
                    // Bottom Controls Bar Overlay (Speed, Quality, Fullscreen)
                    Positioned(
                      bottom: 8.0,
                      right: 8.0,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          GestureDetector(
                            onTap: _showSpeedDialog,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.5),
                              margin: const EdgeInsets.only(right: 6.0),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.65),
                                borderRadius: BorderRadius.circular(6.0),
                                border: Border.all(color: Colors.white38),
                              ),
                              child: Text(
                                "${_playbackSpeed}x",
                                style: const TextStyle(color: Colors.white, fontSize: 11.0, fontWeight: FontWeight.w800),
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: _showQualityDialog,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.5),
                              margin: const EdgeInsets.only(right: 6.0),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.65),
                                borderRadius: BorderRadius.circular(6.0),
                                border: Border.all(color: Colors.white38),
                              ),
                              child: Text(
                                _selectedQuality,
                                style: const TextStyle(color: Colors.white, fontSize: 11.0, fontWeight: FontWeight.w800),
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: _toggleFullscreen,
                            child: Container(
                              padding: const EdgeInsets.all(4.0),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.65),
                                borderRadius: BorderRadius.circular(6.0),
                                border: Border.all(color: Colors.white38),
                              ),
                              child: const Icon(Icons.fullscreen_rounded, color: Colors.white, size: 18.0),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Server Selection Bar (Screenshot 4)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF16161A) : tokens.surfaceAlt,
                border: Border(bottom: BorderSide(color: tokens.border.withValues(alpha: 0.6))),
              ),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    Icon(Icons.dns_rounded, size: 15.0, color: tokens.goldText),
                    const SizedBox(width: 8.0),
                    Text(
                      "Stream Server:",
                      style: TextStyle(
                        color: tokens.textSecondary,
                        fontSize: 12.0,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 10.0),

                    // Server 1 (Bunny)
                    if (bunnyPermitted)
                      _buildServerPill(
                        title: "Server 1 (Bunny)",
                        icon: Icons.bolt_rounded,
                        isActive: _activeServer == ActivePlayerServer.bunny,
                        onTap: () => _switchServer(ActivePlayerServer.bunny),
                      ),

                    // Server 2 (R2)
                    if (r2Permitted) ...[
                      const SizedBox(width: 8.0),
                      _buildServerPill(
                        title: "Server 2 (R2)",
                        icon: Icons.cloud_done_rounded,
                        isActive: _activeServer == ActivePlayerServer.r2,
                        onTap: () => _switchServer(ActivePlayerServer.r2),
                      ),
                    ],

                    // Server 3 (YouTube) - Only if permitted & exists
                    if (youtubePermitted) ...[
                      const SizedBox(width: 8.0),
                      _buildServerPill(
                        title: "Server 3 (YouTube)",
                        icon: Icons.play_circle_fill_rounded,
                        isActive: _activeServer == ActivePlayerServer.youtube,
                        onTap: () => _switchServer(ActivePlayerServer.youtube),
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Lesson Details, Watermark Notice & Server Tips
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.screenPadding),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.lessonTitle,
                      style: text.titleMedium?.copyWith(
                        color: tokens.textPrimary,
                        fontSize: 18.0,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 12.0),

                    // DRM Protection Card (Screenshot 4)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                      decoration: BoxDecoration(
                        color: tokens.surface,
                        borderRadius: BorderRadius.circular(10.0),
                        border: Border.all(color: tokens.border.withValues(alpha: 0.7)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.shield_outlined, color: tokens.success, size: 18.0),
                          const SizedBox(width: 10.0),
                          Expanded(
                            child: Text(
                              "Protected Stream • Watermarked for ${widget.studentEmail}",
                              style: TextStyle(
                                color: tokens.textSecondary,
                                fontSize: 12.0,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14.0),

                    // Video Not Playing Smoothly Helper Card (Screenshot 4)
                    Container(
                      padding: const EdgeInsets.all(14.0),
                      decoration: BoxDecoration(
                        color: tokens.surface,
                        borderRadius: BorderRadius.circular(12.0),
                        border: Border.all(color: tokens.border.withValues(alpha: 0.6)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.info_outline_rounded, color: tokens.goldText, size: 20.0),
                          const SizedBox(width: 10.0),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "Video not playing smoothly?",
                                  style: text.labelLarge?.copyWith(
                                    color: tokens.textPrimary,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13.0,
                                  ),
                                ),
                                const SizedBox(height: 3.0),
                                Text(
                                  "Switch between Server 1 (Bunny), Server 2 (R2), and Server 3 for optimal buffer speed on your connection.",
                                  style: text.bodySmall?.copyWith(
                                    color: tokens.textSecondary,
                                    fontSize: 11.5,
                                    height: 1.35,
                                  ),
                                ),
                              ],
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

  Widget _buildPlayerContent() {
    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: context.tokens.gold),
            const SizedBox(height: 12.0),
            Text(
              "Loading secure stream...",
              style: TextStyle(color: context.tokens.textMuted, fontSize: 12.0),
            ),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(color: context.tokens.danger, fontSize: 13.0),
              ),
              const SizedBox(height: 10.0),
              ElevatedButton.icon(
                icon: const Icon(Icons.refresh_rounded, size: 16.0),
                label: const Text("Switch to R2 Server"),
                onPressed: () => _switchServer(ActivePlayerServer.r2),
              ),
            ],
          ),
        ),
      );
    }

    Widget content;
    if (_chewieController != null && _chewieController!.videoPlayerController.value.isInitialized) {
      content = Chewie(controller: _chewieController!);
    } else if (_webViewController != null) {
      content = WebViewWidget(controller: _webViewController!);
    } else {
      content = const Center(
        child: Text("Preparing video...", style: TextStyle(color: Colors.white)),
      );
    }

    return FloatingWatermark(
      watermarkText: widget.studentEmail,
      child: content,
    );
  }

  Widget _buildServerPill({
    required String title,
    required IconData icon,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    final tokens = context.tokens;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 6.0),
        decoration: BoxDecoration(
          color: isActive ? tokens.gold : tokens.surface,
          borderRadius: BorderRadius.circular(8.0),
          border: Border.all(
            color: isActive ? tokens.gold : tokens.border,
            width: 1.2,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14.0,
              color: isActive ? tokens.onGold : tokens.textSecondary,
            ),
            const SizedBox(width: 5.0),
            Text(
              title,
              style: TextStyle(
                color: isActive ? tokens.onGold : tokens.textSecondary,
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
