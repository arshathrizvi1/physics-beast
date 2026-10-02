import re

path = r'C:\Projects\Brilliant Academy\physics-beast\android\app\src\main\java\com\brilliantacademy\app\MainActivity.java'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to inject the GPU acceleration flags when the WebView is initialized.
# We can do this in the onResume method where we already fetch bridge.getWebView().

gpu_code = """
            // ULTIMATE GPU PERFORMANCE TUNING
            webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);
            
            android.webkit.WebSettings settings = webView.getSettings();
            
            // Enable smooth scrolling and off-screen rendering
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                settings.setOffscreenPreRaster(true); // Pre-renders out-of-screen content using GPU
            }
            
            // Force hardware rendering for HTML5 canvas and WebGL
            settings.setRenderPriority(android.webkit.WebSettings.RenderPriority.HIGH);
            settings.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
"""

# Let's inject this into onResume where we have:
# WebView webView = this.bridge.getWebView();
# if (webView != null) {

if "LAYER_TYPE_HARDWARE" not in content:
    content = content.replace(
        'AppInterface bridgeInterface = new AppInterface();',
        gpu_code + '\n            AppInterface bridgeInterface = new AppInterface();'
    )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected WebView GPU Acceleration Settings!")
