import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/theme_x.dart';
import '../theme/app_spacing.dart';

class AppScaffold extends StatelessWidget {
  final Widget body;
  final PreferredSizeWidget? appBar;
  final Widget? bottomNavigationBar;
  final Widget? floatingActionButton;
  final bool includeBottomNavInset;
  final bool safeAreaTop;
  final bool safeAreaBottom;
  final Color? backgroundColor;

  const AppScaffold({
    super.key,
    required this.body,
    this.appBar,
    this.bottomNavigationBar,
    this.floatingActionButton,
    this.includeBottomNavInset = false,
    this.safeAreaTop = true,
    this.safeAreaBottom = true,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final isDark = context.isDark;

    final overlayStyle = SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
      statusBarBrightness: isDark ? Brightness.dark : Brightness.light,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
    );

    Widget content = body;

    if (includeBottomNavInset) {
      content = Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.bottomNavTotalInset),
        child: content,
      );
    }

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: overlayStyle,
      child: Scaffold(
        backgroundColor: backgroundColor ?? tokens.bg,
        appBar: appBar,
        body: SafeArea(
          top: safeAreaTop,
          bottom: safeAreaBottom,
          child: content,
        ),
        bottomNavigationBar: bottomNavigationBar,
        floatingActionButton: floatingActionButton,
      ),
    );
  }
}
