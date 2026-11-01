import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../data/models/user_model.dart';
import '../core/constants/app_constants.dart';

class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  UserModel? _currentUser;
  bool _isLoading = true;
  StreamSubscription<DocumentSnapshot>? _userSubscription;

  UserModel? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;

  AuthService() {
    _initAuthListener();
  }

  void _initAuthListener() {
    _auth.authStateChanges().listen((User? firebaseUser) {
      if (firebaseUser == null) {
        _userSubscription?.cancel();
        _currentUser = null;
        _isLoading = false;
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
        .listen((snapshot) {
      if (snapshot.exists && snapshot.data() != null) {
        _currentUser = UserModel.fromMap(uid, snapshot.data()!);
      } else {
        _currentUser = UserModel(
          uid: uid,
          email: _auth.currentUser?.email ?? '',
          name: _auth.currentUser?.displayName ?? '',
          role: 'student',
        );
      }
      _isLoading = false;
      notifyListeners();
    }, onError: (err) {
      debugPrint("User snapshot error: $err");
      _isLoading = false;
      notifyListeners();
    });
  }

  /// Sign in with email and password, with automatic retry for transient network / OkHttp glitches
  Future<String?> login(String email, String password) async {
    const maxAttempts = 2;
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        _isLoading = true;
        notifyListeners();
        await _auth.signInWithEmailAndPassword(
          email: email.trim(),
          password: password,
        );
        return null; // Success
      } on FirebaseAuthException catch (e) {
        final isStreamError = e.message?.contains("unexpected end of stream") == true ||
            e.code == 'network-request-failed';
        if (isStreamError && attempt < maxAttempts) {
          debugPrint("Transient OkHttp stream error encountered, retrying attempt $attempt...");
          await Future.delayed(const Duration(milliseconds: 600));
          continue;
        }
        _isLoading = false;
        notifyListeners();
        return _formatAuthError(e);
      } catch (e) {
        final errStr = e.toString();
        if (errStr.contains("unexpected end of stream") && attempt < maxAttempts) {
          debugPrint("Transient stream error caught, retrying attempt $attempt...");
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

      // Trigger the interactive authentication flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        // User cancelled the sign-in dialog
        _isLoading = false;
        notifyListeners();
        return null;
      }

      // Obtain auth details from the request
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      // Create a credential for Firebase
      final OAuthCredential credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the Google user credential
      final UserCredential userCredential = await _auth.signInWithCredential(credential);
      final User? user = userCredential.user;

      if (user != null) {
        // Ensure user profile document exists in Firestore
        final userDocRef = _firestore.collection(AppConstants.colUsers).doc(user.uid);
        final doc = await userDocRef.get();
        if (!doc.exists) {
          await userDocRef.set({
            'email': user.email ?? '',
            'name': user.displayName ?? 'Student',
            'phone': user.phoneNumber ?? '',
            'photoUrl': user.photoURL ?? '',
            'role': 'student',
            'createdAt': DateTime.now().millisecondsSinceEpoch,
            'totalXp': 100, // Sign-up bonus
            'streakDays': 1,
            'accessibleCourses': [],
            'folderAccess': {},
          });
        }
      }

      return null; // Success
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
      final newUserData = {
        'email': email.trim(),
        'name': name.trim(),
        'phone': phone.trim(),
        'stream': stream,
        'batchId': batchId,
        'school': school.trim(),
        'role': 'student',
        'createdAt': DateTime.now().millisecondsSinceEpoch,
        'totalXp': 100, // Sign-up bonus
        'streakDays': 1,
        'accessibleCourses': [],
        'folderAccess': {},
      };

      await _firestore.collection(AppConstants.colUsers).doc(uid).set(newUserData);
      return null; // Success
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
    super.dispose();
  }
}
