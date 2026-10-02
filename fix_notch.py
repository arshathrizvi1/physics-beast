import re

path = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\java\com\brilliantacademy\app\MainActivity.java'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

cutout_code = """
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
"""

if "LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES" not in content:
    # We will inject this right after super.onCreate(savedInstanceState);
    content = content.replace(
        "super.onCreate(savedInstanceState);",
        "super.onCreate(savedInstanceState);\n" + cutout_code
    )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected Cutout Mode into Android!")
