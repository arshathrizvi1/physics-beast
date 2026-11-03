import 'package:cloud_firestore/cloud_firestore.dart';

class PlayerDevicePermissions {
  final bool enabled;
  final bool pcWeb;
  final bool mobileWeb;
  final bool androidApp;

  const PlayerDevicePermissions({
    this.enabled = true,
    this.pcWeb = true,
    this.mobileWeb = true,
    this.androidApp = true,
  });

  factory PlayerDevicePermissions.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const PlayerDevicePermissions();
    return PlayerDevicePermissions(
      enabled: map['enabled'] != false,
      pcWeb: map['pcWeb'] != false,
      mobileWeb: map['mobileWeb'] != false,
      androidApp: map['androidApp'] != false,
    );
  }

  bool isPermittedOnAndroid() => enabled && androidApp;
}

class GlobalPlayerSettings {
  final String defaultPlayer; // 'bunny' | 'r2' | 'youtube'
  final PlayerDevicePermissions bunny;
  final PlayerDevicePermissions r2;
  final PlayerDevicePermissions youtube;

  const GlobalPlayerSettings({
    this.defaultPlayer = 'bunny',
    this.bunny = const PlayerDevicePermissions(),
    this.r2 = const PlayerDevicePermissions(),
    this.youtube = const PlayerDevicePermissions(),
  });

  factory GlobalPlayerSettings.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const GlobalPlayerSettings();
    return GlobalPlayerSettings(
      defaultPlayer: (map['defaultPlayer'] is String) ? map['defaultPlayer'] : 'bunny',
      bunny: PlayerDevicePermissions.fromMap(map['bunny'] as Map<String, dynamic>?),
      r2: PlayerDevicePermissions.fromMap(map['r2'] as Map<String, dynamic>?),
      youtube: PlayerDevicePermissions.fromMap(map['youtube'] as Map<String, dynamic>?),
    );
  }
}

class PlayerSettingsService {
  static final PlayerSettingsService _instance = PlayerSettingsService._internal();
  factory PlayerSettingsService() => _instance;
  PlayerSettingsService._internal();

  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  Stream<GlobalPlayerSettings> getPlayerSettingsStream() {
    return _firestore
        .collection('siteConfig')
        .doc('playerSettings')
        .snapshots()
        .map((snap) {
      if (!snap.exists || snap.data() == null) {
        return const GlobalPlayerSettings();
      }
      return GlobalPlayerSettings.fromMap(snap.data());
    }).handleError((_) => const GlobalPlayerSettings());
  }

  Future<GlobalPlayerSettings> getPlayerSettingsOnce() async {
    try {
      final doc = await _firestore.collection('siteConfig').doc('playerSettings').get();
      if (doc.exists && doc.data() != null) {
        return GlobalPlayerSettings.fromMap(doc.data());
      }
    } catch (_) {}
    return const GlobalPlayerSettings();
  }

  /// Determines if a specific player is allowed on the mobile app based on
  /// global admin settings and optional per-video overrides.
  static bool isPlayerAllowedOnApp({
    required String serverKey, // 'bunny' | 'r2' | 'youtube'
    required GlobalPlayerSettings globalSettings,
    Map<String, dynamic>? videoPlayerSettings,
  }) {
    if (videoPlayerSettings != null && videoPlayerSettings.containsKey(serverKey)) {
      final override = PlayerDevicePermissions.fromMap(
        videoPlayerSettings[serverKey] as Map<String, dynamic>?,
      );
      return override.isPermittedOnAndroid();
    }

    switch (serverKey) {
      case 'bunny':
        return globalSettings.bunny.isPermittedOnAndroid();
      case 'r2':
        return globalSettings.r2.isPermittedOnAndroid();
      case 'youtube':
        return globalSettings.youtube.isPermittedOnAndroid();
      default:
        return true;
    }
  }

  /// Resolves which server should be selected by default
  static String resolveInitialServer({
    required List<String> permittedServers,
    required GlobalPlayerSettings globalSettings,
    Map<String, dynamic>? videoPlayerSettings,
  }) {
    if (permittedServers.isEmpty) return 'r2';

    final preferred = (videoPlayerSettings?['defaultPlayer'] as String?) ??
        globalSettings.defaultPlayer;

    if (permittedServers.contains(preferred)) {
      return preferred;
    }
    return permittedServers.first;
  }
}
