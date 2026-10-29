import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../data/models/user_model.dart';
import '../core/constants/app_constants.dart';

class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

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

  Future<String?> login(String email, String password) async {
    try {
      _isLoading = true;
      notifyListeners();
      await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      return null; // Success
    } on FirebaseAuthException catch (e) {
      _isLoading = false;
      notifyListeners();
      return e.message ?? "Authentication failed";
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return e.toString();
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
      return e.message ?? "Registration failed";
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return e.toString();
    }
  }

  Future<void> logout() async {
    await _userSubscription?.cancel();
    await _auth.signOut();
    _currentUser = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _userSubscription?.cancel();
    super.dispose();
  }
}
