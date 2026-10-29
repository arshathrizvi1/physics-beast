import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/auth_service.dart';
import '../main_shell.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _schoolController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  String _selectedStream = "Physical Science";
  String _selectedBatch = "2026";
  bool _isLoading = false;
  String? _errorMessage;

  final List<String> _streams = ["Physical Science", "Biological Science", "Technology", "Commerce", "Arts"];
  final List<String> _batches = ["2025 A/L", "2026 A/L", "2027 A/L"];

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _schoolController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final authService = Provider.of<AuthService>(context, listen: false);
    final error = await authService.register(
      email: _emailController.text,
      password: _passwordController.text,
      name: _nameController.text,
      phone: _phoneController.text,
      stream: _selectedStream,
      batchId: _selectedBatch,
      school: _schoolController.text,
    );

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (error == null) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const MainShell()),
        (route) => false,
      );
    } else {
      setState(() {
        _errorMessage = error;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Create Student Account",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  "Join Brilliant Academy and access all premium lectures",
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 24),

                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.danger.withOpacity(0.3)),
                    ),
                    child: Text(_errorMessage!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                  ),
                  const SizedBox(height: 16),
                ],

                CustomTextField(
                  controller: _nameController,
                  label: "Full Name",
                  hint: "Kamal Perera",
                  prefixIcon: Icons.person_outline,
                  validator: (v) => (v == null || v.isEmpty) ? "Enter full name" : null,
                ),
                const SizedBox(height: 16),

                CustomTextField(
                  controller: _phoneController,
                  label: "WhatsApp Mobile Number",
                  hint: "077 123 4567",
                  prefixIcon: Icons.phone_outlined,
                  keyboardType: TextInputType.phone,
                  validator: (v) => (v == null || v.length < 9) ? "Enter valid phone number" : null,
                ),
                const SizedBox(height: 16),

                // Stream dropdown
                const Text(
                  "A/L Stream",
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedStream,
                      isExpanded: true,
                      dropdownColor: AppColors.card,
                      style: const TextStyle(color: Colors.white, fontSize: 15),
                      items: _streams.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedStream = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Batch dropdown
                const Text(
                  "Target Batch",
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedBatch,
                      isExpanded: true,
                      dropdownColor: AppColors.card,
                      style: const TextStyle(color: Colors.white, fontSize: 15),
                      items: _batches.map((b) => DropdownMenuItem(value: b, child: Text(b))).toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedBatch = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                CustomTextField(
                  controller: _schoolController,
                  label: "School",
                  hint: "Royal College / Ananda College",
                  prefixIcon: Icons.location_city_outlined,
                  validator: (v) => (v == null || v.isEmpty) ? "Enter your school" : null,
                ),
                const SizedBox(height: 16),

                CustomTextField(
                  controller: _emailController,
                  label: "Email Address",
                  hint: "student@example.com",
                  prefixIcon: Icons.email_outlined,
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) => (v == null || !v.contains('@')) ? "Enter valid email" : null,
                ),
                const SizedBox(height: 16),

                CustomTextField(
                  controller: _passwordController,
                  label: "Create Password",
                  hint: "••••••••",
                  prefixIcon: Icons.lock_outline,
                  obscureText: true,
                  validator: (v) => (v == null || v.length < 6) ? "Minimum 6 characters" : null,
                ),
                const SizedBox(height: 28),

                CustomButton(
                  text: "Complete Registration",
                  onPressed: _handleRegister,
                  isLoading: _isLoading,
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
