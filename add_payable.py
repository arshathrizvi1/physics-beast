import os

course_file = 'src/app/course/[id]/page.tsx'
with open(course_file, 'r', encoding='utf-8') as f:
    course_code = f.read()

# We need to insert the payable fetch logic at the start of handlePaymentSubmit for card payments
payable_logic = """
    if (paymentMethod === 'card') {
      setIsSubmittingPayment(true);
      try {
        const res = await fetch('/api/payable/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: id,
            courseName: course.name || checkoutFolder.name,
            price: checkoutFolder.price,
            userId: user.uid,
            userEmail: user.email,
            studentId: user.studentId,
            userName: user.name
          })
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert("Payment gateway error: " + (data.error || "Unknown error"));
          setIsSubmittingPayment(false);
        }
      } catch (err) {
        console.error(err);
        alert("Failed to connect to payment gateway.");
        setIsSubmittingPayment(false);
      }
      return;
    }
"""

if "fetch('/api/payable/create-checkout'" not in course_code:
    # Insert it right after `setIsSubmittingPayment(true);` or right after `if (!user || !checkoutFolder) return;`
    course_code = course_code.replace(
        "if (!user || !checkoutFolder) return;",
        f"if (!user || !checkoutFolder) return;\n{payable_logic}"
    )

# Also, when the page loads, we need to check if ?payment=success is in the URL and verify the payment
verify_logic = """
  // Check for successful Payable return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');

    if (paymentStatus === 'success' && sessionId && user) {
      // Show processing state
      const verifyPayment = async () => {
        try {
          const res = await fetch('/api/payable/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkoutId: sessionId })
          });
          const data = await res.json();
          if (data.success) {
            // Update local user state immediately
            if (user) {
                const now = Date.now();
                const folderAccess = user.folderAccess || {};
                folderAccess[id] = now + (30 * 24 * 60 * 60 * 1000); // 30 days
                
                // Clear URL params
                window.history.replaceState({}, document.title, window.location.pathname);
                alert("Payment Successful! Access granted.");
                // Reload course data implicitly if needed, or window reload
                window.location.reload();
            }
          } else {
            alert("Payment verification failed: " + (data.status || data.error));
          }
        } catch (err) {
          console.error(err);
        }
      };
      verifyPayment();
    } else if (paymentStatus === 'cancelled') {
      alert("Payment was cancelled.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, id]);
"""

if "const urlParams = new URLSearchParams(" not in course_code:
    # Find a good place to insert it. e.g. right before `// Anti-IDM / Downloader Extension DOM removal`
    course_code = course_code.replace(
        "// Anti-IDM / Downloader Extension DOM removal",
        f"{verify_logic}\n\n      // Anti-IDM / Downloader Extension DOM removal"
    )

# Now, we also need to change the UI for the card payment option so it says "Proceed to Payable Gateway" instead of the mock card input.
ui_replacement = """
                      ) : (paymentConfig?.cardEnabled !== false) ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 pb-4 text-center py-8">
                          <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCard className="w-8 h-8" />
                          </div>
                          <h3 className="font-bold text-lg">Payable Secure Checkout</h3>
                          <p className="text-sm text-muted-foreground">You will be redirected to the secure Payable.lk payment gateway to complete your transaction.</p>
                        </div>
                      ) : null
"""

# The existing block starts with `) : (paymentConfig?.cardEnabled !== false) ? (` and ends with `</div>\n                      ) : null` or something similar.
# Let's just use regex or a simple slice. We'll search for `) : (paymentConfig?.cardEnabled !== false) ? (` and the subsequent `) : null}`
start_idx = course_code.find(") : (paymentConfig?.cardEnabled !== false) ? (")
if start_idx != -1:
    end_marker = "</div>\n                        </div>\n                      ) : null"
    end_idx = course_code.find(end_marker, start_idx)
    if end_idx != -1:
        course_code = course_code[:start_idx] + ui_replacement.strip() + course_code[end_idx + len(end_marker):]

with open(course_file, 'w', encoding='utf-8') as f:
    f.write(course_code)
print("Updated course page with Payable checkout logic")
