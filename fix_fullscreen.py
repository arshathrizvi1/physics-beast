import re

path = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\java\com\brilliantacademy\app\MainActivity.java'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add immersive mode functions if they don't exist
immersive_code = """
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        android.view.View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN);
    }
"""

if "hideSystemUI()" not in content:
    # insert before the last closing brace of the class
    # find the last closing brace
    last_brace_idx = content.rfind('}')
    if last_brace_idx != -1:
        content = content[:last_brace_idx] + immersive_code + "\n}\n"
        
    # Also we need to call hideSystemUI() in onCreate if it exists, but usually Capacitor's BridgeActivity handles onCreate.
    # onWindowFocusChanged is enough to trigger it when the app opens.

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected Immersive Full Screen Mode!")
