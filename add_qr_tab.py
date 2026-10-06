import os

course_file = 'src/app/course/[id]/page.tsx'
with open(course_file, 'r', encoding='utf-8') as f:
    course_code = f.read()

qr_tab = """                          {paymentConfig?.qrEnabled && (
                            <button 
                              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${paymentMethod === 'qr' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                              onClick={() => setPaymentMethod('qr')}
                            >
                              Lanka QR
                            </button>
                          )}
"""

if 'Lanka QR\n                            </button>' not in course_code:
    course_code = course_code.replace(
        "Card Payment\n                          </button>\n                        </div>",
        f"Card Payment\n                          </button>\n{qr_tab}                        </div>"
    )

with open(course_file, 'w', encoding='utf-8') as f:
    f.write(course_code)
print("Updated Course Page with QR Tab")
