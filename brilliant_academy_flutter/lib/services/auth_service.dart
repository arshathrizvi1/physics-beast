import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:local_auth/local_auth.dart';
import '../data/models/user_model.dart';
import '../core/constants/app_constants.dart';

class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  static const String _keyLocalDeviceId = "brilliant_local_device_id";
  static const String _keySavedEmail = "brilliant_saved_email";
  static const String _keySavedPassword = "brilliant_saved_password";
  static const String _keyRememberMe = "brilliant_remember_me";

  UserModel? _currentUser;
  bool _isLoading = true;
  String? _localDeviceId;
  StreamSubscription<DocumentSnapshot>? _userSubscription;

  final Completer<bool> _initialAuthCompleter = Completer<bool>();
  final StreamController<String> _sessionRevokedController = StreamController<String>.broadcast();

  UserModel? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null && _auth.currentUser != null;
  bool get isLoading => _isLoading;
  Stream<String> get onSessionRevoked => _sessionRevokedController.stream;

  AuthService() {
    _initDeviceId();
    _initAuthListener();
  }

  Future<void> _initDeviceId() async {
    _localDeviceId = await getLocalDeviceId();
  }

  Future<String> getLocalDeviceId() async {
    if (_localDeviceId != null) return _localDeviceId!;
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(_keyLocalDeviceId);
    if (id == null || id.isEmpty) {
      final now = DateTime.now().millisecondsSinceEpoch;
      final rand = (1000 + (DateTime.now().microsecondsSinceEpoch % 9000));
      id = "mobile_${now}_$rand";
      await prefs.setString(_keyLocalDeviceId, id);
    }
    _localDeviceId = id;
    return id;
  }

  /// Wait for Firebase Auth to initialize on cold startup
  Future<bool> waitForAuthReady({Duration timeout = const Duration(seconds: 4)}) async {
    if (!_isLoading) return isAuthenticated;
    try {
      return await _initialAuthCompleter.future.timeout(timeout, onTimeout: () => isAuthenticated);
    } catch (_) {
      return isAuthenticated;
    }
  }

  void _finishInitialLoading(bool authenticated) {
    if (!_initialAuthCompleter.isCompleted) {
      _initialAuthCompleter.complete(authenticated);
    }
  }

  void _initAuthListener() {
    _auth.authStateChanges().listen((User? firebaseUser) {
      if (firebaseUser == null) {
        _userSubscription?.cancel();
        _currentUser = null;
        _isLoading = false;
        _finishInitialLoading(false);
        notifyListeners();
      } else {
        _subscribeToUserProfile(firebaseUser.uid);
      }
    });
  }

  void _subscribeToUserProfile(String uid) {
    _userSubscription?.cancel();
    _userSubscription = _firestore
        .collection(AppConstants.colUsers)
        .doc(uid)
        .snapshots()
        .listen((snapshot) async {
      if (snapshot.exists && snapshot.data() != null) {
        final data = snapshot.data()!;
        _currentUser = UserModel.fromMap(uid, data);

        // Single Device Login Enforcement (Matching Website AuthContext.tsx lines 250-285 & 354-367)
        final role = data['role'] ?? 'student';
        if (role != 'admin' && role != 'teacher') {
          final localId = await getLocalDeviceId();
          final remoteDeviceId = data['deviceId'];

          final isRevoked = remoteDeviceId == 'REVOKED';
          final isMismatched = remoteDeviceId != null &&
              remoteDeviceId.toString().isNotEmpty &&
              remoteDeviceId != localId;

          if (isRevoked || isMismatched) {
            debugPrint("Single Device Enforcement: Logged out because session was accessed on another device.");
            await logout();
            _sessionRevokedController.add(isRevoked
                ? "You have been signed out from this device by the administrator."
                : "You have been logged out because your account was accessed from another device.");
            return;
          }
        }
      } else {
        _currentUser = UserModel(
          uid: uid,
          email: _auth.currentUser?.email ?? '',
          name: _auth.currentUser?.displayName ?? '',
          role: 'student',
        );
      }
      _isLoading = false;
      _finishInitialLoading(true);
      notifyListeners();
    }, onError: (err) {
      debugPrint("User snapshot error: $err");
      _isLoading = false;
      _finishInitialLoading(_auth.currentUser != null);
      notifyListeners();
    });
  }

  /// Bind device ID upon successful login
  Future<void> _bindCurrentDevice(String uid) async {
    try {
      final docRef = _firestore.collection(AppConstants.colUsers).doc(uid);
      final snap = await docRef.get();
      final role = snap.data()?['role'] ?? 'student';

      if (role != 'admin' && role != 'teacher') {
        final localId = await getLocalDeviceId();
        await docRef.update({
          'deviceId': localId,
          'isApproved': true,
          'lastLoginAt': FieldValue.serverTimestamp(),
          'lastDeviceType': 'Android Native App',
        });
      }
    } catch (e) {
      debugPrint("Could not bind deviceId in DB: $e");
    }
  }

  /// Sign in with email and password
  Future<String?> login(String email, String password) async {
    const maxAttempts = 2;
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        _isLoading = true;
        notifyListeners();
        final userCredential = await _auth.signInWithEmailAndPassword(
          email: email.trim(),
          password: password,
        );

        if (userCredential.user != null) {
          await _bindCurrentDevice(userCredential.user!.uid);

          // Save credentials for passkey / biometric sign-in
          try {
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString(_keySavedEmail, email.trim());
            await prefs.setString(_keySavedPassword, password);
            await prefs.setBool('passkey_enrolled', true);
            await prefs.setString('passkey_email', email.trim());
            await prefs.setString('passkey_uid', userCredential.user!.uid);
          } catch (e) {
            debugPrint("Could not cache credentials for passkey: $e");
          }
        }

        return null; // Success
      } on FirebaseAuthException catch (e) {
        final isStreamError = e.message?.contains("unexpected end of stream") == true ||
            e.code == 'network-request-failed';
        if (isStreamError && attempt < maxAttempts) {
          debugPrint("Transient OkHttp stream error, retrying attempt $attempt...");
          await Future.delayed(const Duration(milliseconds: 600));
          continue;
        }
        _isLoading = false;
        notifyListeners();
        return _formatAuthError(e);
      } catch (e) {
        final errStr = e.toString();
        if (errStr.contains("unexpected end of stream") && attempt < maxAttempts) {
          await Future.delayed(const Duration(milliseconds: 600));
          continue;
        }
        _isLoading = false;
        notifyListeners();
        return "Authentication error: $errStr";
      }
    }
    _isLoading = false;
    notifyListeners();
    return "Network connection was interrupted. Please check your internet connection and try again.";
  }

  /// Sign in with Google Account
  Future<String?> signInWithGoogle() async {
    try {
      _isLoading = true;
      notifyListeners();

      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        _isLoading = false;
        notifyListeners();
        return null;
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final OAuthCredential credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final UserCredential userCredential = await _auth.signInWithCredential(credential);
      final User? user = userCredential.user;

      if (user != null) {
        final userDocRef = _firestore.collection(AppConstants.colUsers).doc(user.uid);
        final doc = await userDocRef.get();
        final localId = await getLocalDeviceId();

        if (!doc.exists) {
          await userDocRef.set({
            'email': user.email ?? '',
            'name': user.displayName ?? 'Student',
            'phone': user.phoneNumber ?? '',
            'photoUrl': user.photoURL ?? '',
            'role': 'student',
            'deviceId': localId,
            'isApproved': true,
            'createdAt': DateTime.now().millisecondsSinceEpoch,
            'totalXp': 100,
            'streakDays': 1,
            'accessibleCourses': [],
            'folderAccess': {},
          });
        } else {
          await _bindCurrentDevice(user.uid);
        }

        try {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(_keySavedEmail, user.email ?? '');
          await prefs.setBool('passkey_enrolled', true);
          await prefs.setString('passkey_email', user.email ?? '');
          await prefs.setString('passkey_uid', user.uid);
        } catch (_) {}
      }

      return null;
    } on FirebaseAuthException catch (e) {
      _isLoading = false;
      notifyListeners();
      return _formatAuthError(e);
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      final errStr = e.toString();
      if (errStr.contains("network_error") || errStr.contains("7")) {
        return "Network error connecting to Google Play Services. Please check internet access.";
      }
      if (errStr.contains("10") || errStr.contains("DEVELOPER_ERROR")) {
        return "Google Sign-In configuration error: SHA-1 fingerprint needs to be registered in Firebase Console.";
      }
      return "Google Sign-In failed: $errStr";
    }
  }

  Future<String?> register({
    required String email,
    required String password,
    required String name,
    required String phone,
    required String stream,
    required String batchId,
    required String school,
  }) async {
    try {
      _isLoading = true;
      notifyListeners();
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      final uid = credential.user!.uid;
      final localId = await getLocalDeviceId();

      final newUserData = {
        'email': email.trim(),
        'name': name.trim(),
        'phone': phone.trim(),
        'stream': stream,
        'batchId': batchId,
        'school': school.trim(),
        'role': 'student',
        'deviceId': localId,
        'isApproved': true,
        'createdAt': DateTime.now().millisecondsSinceEpoch,
        'totalXp': 100,
        'streakDays': 1,
        'accessibleCourses': [],
        'folderAccess': {},
      };

      await _firestore.collection(AppConstants.colUsers).doc(uid).set(newUserData);

      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_keySavedEmail, email.trim());
        await prefs.setString(_keySavedPassword, password);
        await prefs.setBool('passkey_enrolled', true);
        await prefs.setString('passkey_email', email.trim());
        await prefs.setString('passkey_uid', uid);
      } catch (_) {}

      return null;
    } on FirebaseAuthException catch (e) {
      _isLoading = false;
      notifyListeners();
      return _formatAuthError(e);
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return e.toString();
    }
  }

  // --- Saved Credentials (Remember Me) ---
  Future<Map<String, dynamic>> getSavedCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    final remember = prefs.getBool(_keyRememberMe) ?? true;
    final email = prefs.getString(_keySavedEmail) ?? '';
    final password = prefs.getString(_keySavedPassword) ?? '';
    return {
      'rememberMe': remember,
      'email': email,
      'password': password,
    };
  }

  Future<void> saveCredentials({
    required String email,
    required String password,
    required bool rememberMe,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyRememberMe, rememberMe);
    if (rememberMe) {
      await prefs.setString(_keySavedEmail, email.trim());
      await prefs.setString(_keySavedPassword, password);
    } else {
      await prefs.remove(_keySavedEmail);
      await prefs.remove(_keySavedPassword);
    }
  }

  Future<void> updateUserProfile({
    String? name,
    String? phone,
    String? address,
    String? school,
    String? photoUrl,
  }) async {
    if (_currentUser == null) return;
    final Map<String, dynamic> updates = {};
    if (name != null) updates['name'] = name.trim();
    if (phone != null) updates['phone'] = phone.trim();
    if (address != null) updates['address'] = address.trim();
    if (school != null) updates['school'] = school.trim();
    if (photoUrl != null) updates['photoUrl'] = photoUrl.trim();

    if (updates.isNotEmpty) {
      await _firestore.collection(AppConstants.colUsers).doc(_currentUser!.uid).update(updates);
    }
  }

  Future<Map<String, dynamic>> registerPasskey() async {
    if (_currentUser == null) {
      return {'success': false, 'error': 'You must be signed in to enroll a passkey.'};
    }
    
    final localAuth = LocalAuthentication();
    try {
      final bool canCheckBiometrics = await localAuth.canCheckBiometrics;
      final bool isDeviceSupported = await localAuth.isDeviceSupported();

      if (!canCheckBiometrics && !isDeviceSupported) {
        return {
          'success': false,
          'error': 'Biometric sensors or device credentials are not configured or available on this device.'
        };
      }

      final bool didAuthenticate = await localAuth.authenticate(
        localizedReason: 'Scan fingerprint or Face ID to link this device as your Passkey',
        biometricOnly: false,
        persistAcrossBackgrounding: true,
      );

      if (!didAuthenticate) {
        return {'success': false, 'error': 'Biometric registration was cancelled.'};
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('passkey_registered_${_currentUser!.uid}', true);
      await prefs.setBool('passkey_enrolled', true);
      await prefs.setString('passkey_email', _currentUser!.email);
      await prefs.setString('passkey_uid', _currentUser!.uid);

      try {
        await _firestore.collection(AppConstants.colUsers).doc(_currentUser!.uid).update({
          'hasPasskey': true,
          'passkeyRegisteredAt': DateTime.now().millisecondsSinceEpoch,
        });
      } catch (_) {}

      return {'success': true};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Checks whether a biometric passkey is available and enrolled on this device
  Future<bool> hasPasskeyOnDevice() async {
    try {
      final localAuth = LocalAuthentication();
      final bool canCheckBiometrics = await localAuth.canCheckBiometrics;
      final bool isDeviceSupported = await localAuth.isDeviceSupported();
      if (!canCheckBiometrics && !isDeviceSupported) return false;

      final prefs = await SharedPreferences.getInstance();
      final bool isEnrolled = prefs.getBool('passkey_enrolled') ?? false;
      final String? savedEmail = prefs.getString(_keySavedEmail) ?? prefs.getString('passkey_email');
      final String? savedPassword = prefs.getString(_keySavedPassword);

      return isEnrolled || (savedEmail != null && savedEmail.isNotEmpty && savedPassword != null && savedPassword.isNotEmpty);
    } catch (e) {
      debugPrint("hasPasskeyOnDevice error: $e");
      return false;
    }
  }

  /// Authenticate with biometric Passkey (Fingerprint / Face ID)
  Future<String?> signInWithPasskey() async {
    final localAuth = LocalAuthentication();
    try {
      final bool canCheckBiometrics = await localAuth.canCheckBiometrics;
      final bool isDeviceSupported = await localAuth.isDeviceSupported();

      if (!canCheckBiometrics && !isDeviceSupported) {
        return "Biometric authentication is not supported or enabled on this device.";
      }

      final prefs = await SharedPreferences.getInstance();
      final String? savedEmail = prefs.getString(_keySavedEmail) ?? prefs.getString('passkey_email');
      final String? savedPassword = prefs.getString(_keySavedPassword);

      if (_auth.currentUser == null && (savedEmail == null || savedEmail.isEmpty || savedPassword == null || savedPassword.isEmpty)) {
        return "No registered passkey found on this device. Please sign in with email & password once to register.";
      }

      final bool didAuthenticate = await localAuth.authenticate(
        localizedReason: 'Scan fingerprint or Face ID to sign in to Brilliant Academy',
        biometricOnly: false,
        persistAcrossBackgrounding: true,
      );

      if (!didAuthenticate) {
        return "Biometric authentication cancelled.";
      }

      _isLoading = true;
      notifyListeners();

      // Case 1: Firebase Auth already has active session
      if (_auth.currentUser != null) {
        final uid = _auth.currentUser!.uid;
        await _bindCurrentDevice(uid);
        _subscribeToUserProfile(uid);
        _isLoading = false;
        notifyListeners();
        return null;
      }

      // Case 2: Saved email and password from previous enrollment
      if (savedEmail != null && savedPassword != null) {
        final userCredential = await _auth.signInWithEmailAndPassword(
          email: savedEmail.trim(),
          password: savedPassword,
        );

        if (userCredential.user != null) {
          await _bindCurrentDevice(userCredential.user!.uid);
          await prefs.setBool('passkey_enrolled', true);
          await prefs.setString('passkey_email', userCredential.user!.email ?? savedEmail);
          await prefs.setString('passkey_uid', userCredential.user!.uid);
        }

        _isLoading = false;
        notifyListeners();
        return null;
      }

      _isLoading = false;
      notifyListeners();
      return "Passkey credentials missing. Please sign in with your password once.";
    } on FirebaseAuthException catch (e) {
      _isLoading = false;
      notifyListeners();
      return _formatAuthError(e);
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return "Passkey authentication error: $e";
    }
  }

  Future<void> logout() async {
    await _userSubscription?.cancel();
    try {
      await _googleSignIn.signOut();
    } catch (_) {}
    await _auth.signOut();
    _currentUser = null;
    notifyListeners();
  }

  String _formatAuthError(FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
        return "No account found with this email. Please check or register.";
      case 'wrong-password':
        return "Incorrect password. Please try again.";
      case 'invalid-credential':
        return "Invalid email or password.";
      case 'email-already-in-use':
        return "An account already exists with this email.";
      case 'weak-password':
        return "The password provided is too weak.";
      case 'invalid-email':
        return "The email address is invalid.";
      case 'network-request-failed':
        return "Network connection failure. Please check your internet connection.";
      case 'user-disabled':
        return "This user account has been disabled.";
      default:
        final msg = e.message ?? "Authentication failed";
        if (msg.contains("unexpected end of stream")) {
          return "Connection interrupted by network provider. Please retry in a few moments.";
        }
        return msg;
    }
  }

  @override
  void dispose() {
    _userSubscription?.cancel();
    _sessionRevokedController.close();
    super.dispose();
  }
}
