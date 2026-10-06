import os

course_file = 'src/app/course/[id]/page.tsx'
with open(course_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract lines 401 to 442 (index 400 to 441)
# Note: In Python, indexing is 0-based.
# Wait, rather than hardcoding line numbers, let's use string manipulation because the file might change.

with open(course_file, 'r', encoding='utf-8') as f:
    code = f.read()

# Find the injected useEffect
start_str = "  // Check for successful Payable return\n  useEffect(() => {\n    const urlParams = new URLSearchParams("
end_str = "    } else if (paymentStatus === 'cancelled') {\n      alert(\"Payment was cancelled.\");\n      window.history.replaceState({}, document.title, window.location.pathname);\n    }\n  }, [user, id]);"

start_idx = code.find("  // Check for successful Payable return")
end_idx = code.find(end_str) + len(end_str)

if start_idx != -1 and end_idx != -1:
    extracted = code[start_idx:end_idx]
    
    # Remove it from its current location
    code = code[:start_idx] + code[end_idx:]
    
    # Insert it before `useEffect(() => { \n    if (!id) return;`
    target_str = "  useEffect(() => {\n    if (!id) return;"
    target_idx = code.find(target_str)
    
    if target_idx != -1:
        code = code[:target_idx] + extracted + "\n\n" + code[target_idx:]
    else:
        print("Could not find target_str")

    with open(course_file, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Fixed useEffect nesting")
else:
    print("Could not find extracted block")
