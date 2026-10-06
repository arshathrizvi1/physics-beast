import os

course_file = 'src/app/course/[id]/page.tsx'
with open(course_file, 'r', encoding='utf-8') as f:
    course_code = f.read()

# Start marker
start_marker = ") : (paymentConfig?.cardEnabled !== false) ? ("
start_idx = course_code.find(start_marker)

if start_idx != -1:
    end_marker = "</div>\n                      ) : ("
    end_idx = course_code.find(end_marker, start_idx)
    
    if end_idx != -1:
        new_ui = """) : (paymentConfig?.cardEnabled !== false) ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 pb-4 text-center py-8">
                          <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCard className="w-8 h-8" />
                          </div>
                          <h3 className="font-bold text-lg">Payable Secure Checkout</h3>
                          <p className="text-sm text-muted-foreground">You will be redirected to the secure Payable.lk payment gateway to complete your transaction.</p>
                        </div>
                      ) : ("""
        
        course_code = course_code[:start_idx] + new_ui + course_code[end_idx + len(end_marker):]

with open(course_file, 'w', encoding='utf-8') as f:
    f.write(course_code)
print("Updated card UI successfully")
