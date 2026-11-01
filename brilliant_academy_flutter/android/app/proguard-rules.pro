# Flutter Rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Keep JNI Native Methods & MainActivity
-keepclasseswithmembernames class * {
    native <methods>;
}
-keep class com.brilliantacademy.app.** { *; }

# Strip logging in release builds
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
}

# AndroidX and Google Play Services
-dontwarn androidx.**
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
