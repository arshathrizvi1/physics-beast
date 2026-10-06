import os
import re

# 1. Update Payment Settings Page
settings_file = 'src/app/admin/payment-settings/page.tsx'
with open(settings_file, 'r', encoding='utf-8') as f:
    settings_code = f.read()

# Add imports for Firebase storage if not present
if 'import { storage }' not in settings_code:
    settings_code = settings_code.replace('import { db } from "@/lib/firebase";', 'import { db, storage } from "@/lib/firebase";\nimport { ref, uploadBytes, getDownloadURL } from "firebase/storage";')

# Update initial config state
if 'qrEnabled' not in settings_code:
    settings_code = settings_code.replace(
        'bank2AccountName: ""\n  });',
        'bank2AccountName: "",\n    qrEnabled: false,\n    qrImageUrl: ""\n  });'
    )

# Add the UI for QR Code after the Online Card Payment block
qr_ui = """
            <div className="flex items-center justify-between p-4 bg-background border border-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Lanka QR Payment</p>
                  <p className="text-sm text-muted-foreground">Students can scan a Lanka QR code and upload the receipt</p>
                </div>
              </div>
              <Switch 
                checked={config.qrEnabled} 
                onCheckedChange={(c) => setConfig({ ...config, qrEnabled: c })} 
              />
            </div>
"""
if 'Lanka QR Payment' not in settings_code:
    settings_code = settings_code.replace('</CardContent>\n        </Card>\n\n        {config.bankEnabled', f'{qr_ui}\n          </CardContent>\n        </Card>\n\n        {{config.bankEnabled')

# Add the Bank Settings for QR Code
qr_settings = """
        {config.qrEnabled && (
          <Card className="border-green-500/20">
            <CardHeader className="bg-green-500/5 border-b border-border/50">
              <CardTitle className="text-lg">Lanka QR Details</CardTitle>
              <CardDescription>Upload your Lanka QR code image here. Students will scan this to pay.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-4">
                {config.qrImageUrl && (
                  <div className="w-48 h-48 border rounded-xl overflow-hidden relative bg-white flex items-center justify-center p-2 mx-auto">
                    <img src={config.qrImageUrl} alt="Lanka QR" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="space-y-2 max-w-sm mx-auto text-center">
                  <Label>Upload QR Code Image</Label>
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const storageRef = ref(storage, `site/lanka-qr-${Date.now()}.png`);
                        await uploadBytes(storageRef, file);
                        const url = await getDownloadURL(storageRef);
                        setConfig({...config, qrImageUrl: url});
                        alert("QR Code uploaded successfully! Don't forget to click Save.");
                      } catch (err) {
                        console.error(err);
                        alert("Failed to upload image.");
                      }
                    }}
                    className="bg-black border-border file:text-primary file:bg-primary/10 file:border-0 file:rounded-md file:px-2 file:py-1 cursor-pointer" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
"""
if 'Lanka QR Details' not in settings_code:
    settings_code = settings_code.replace('<div className="flex justify-end pt-4">', f'{qr_settings}\n\n        <div className="flex justify-end pt-4">')

with open(settings_file, 'w', encoding='utf-8') as f:
    f.write(settings_code)
print("Updated Payment Settings Page")

# 2. Update Course Page
course_file = 'src/app/course/[id]/page.tsx'
with open(course_file, 'r', encoding='utf-8') as f:
    course_code = f.read()

# Update state type
course_code = course_code.replace("useState<'bank' | 'card'>('bank');", "useState<'bank' | 'card' | 'qr'>('bank');")
course_code = course_code.replace("paymentMethod === 'bank' ? 'Bank Transfer' : paymentMethod.toUpperCase();", "paymentMethod === 'bank' ? 'Bank Transfer' : paymentMethod === 'qr' ? 'Lanka QR Payment' : paymentMethod.toUpperCase();")
course_code = course_code.replace("if (paymentMethod === 'bank' && !receiptFile)", "if ((paymentMethod === 'bank' || paymentMethod === 'qr') && !receiptFile)")

# Update Config effect logic (so QR works if it's the only one enabled)
if "else if (conf.qrEnabled) setPaymentMethod('qr');" not in course_code:
    course_code = course_code.replace(
        "if (conf.cardEnabled && !conf.bankEnabled) setPaymentMethod('card');\n            else if (!conf.cardEnabled && conf.bankEnabled) setPaymentMethod('bank');",
        "if (conf.cardEnabled && !conf.bankEnabled && !conf.qrEnabled) setPaymentMethod('card');\n            else if (!conf.cardEnabled && conf.bankEnabled) setPaymentMethod('bank');\n            else if (conf.qrEnabled && !conf.bankEnabled && !conf.cardEnabled) setPaymentMethod('qr');"
    )

# Add the QR Tab button
qr_tab = """
                          {paymentConfig?.qrEnabled && (
                            <button 
                              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${paymentMethod === 'qr' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                              onClick={() => setPaymentMethod('qr')}
                            >
                              Lanka QR
                            </button>
                          )}
"""
if 'Lanka QR' not in course_code.split('Card Payment')[0] and 'Lanka QR' not in course_code:
    course_code = course_code.replace('Card Payment\n                          </button>\n                        </div>', f'Card Payment\n                          </button>{qr_tab}                        </div>')

# Fix conditional rendering for Bank UI
course_code = course_code.replace(
    "{(!paymentConfig && paymentMethod === 'bank') || (paymentConfig && paymentMethod === 'bank' && paymentConfig.bankEnabled) ? (",
    "{(!paymentConfig && paymentMethod === 'bank') || (paymentConfig && paymentMethod === 'bank' && paymentConfig.bankEnabled) ? ("
)

# Add QR UI below Bank UI
qr_ui_display = """
                      {paymentConfig && paymentMethod === 'qr' && paymentConfig.qrEnabled && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-4 text-center">
                            <p className="text-sm font-medium text-green-400">Please scan the Lanka QR code to transfer Rs. {checkoutFolder.price}</p>
                            
                            {paymentConfig.qrImageUrl ? (
                              <div className="w-48 h-48 mx-auto bg-white p-2 rounded-xl">
                                <img src={paymentConfig.qrImageUrl} alt="Lanka QR" className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <p className="text-sm text-zinc-500">QR Code not uploaded by admin yet.</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Upload Payment Receipt</Label>
                            <Input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                              className="bg-secondary/20 border-border/50 file:text-primary file:bg-primary/10 file:border-0 file:rounded-md cursor-pointer"
                            />
                            <p className="text-xs text-zinc-500">Please upload a screenshot of your successful transaction.</p>
                          </div>
                        </div>
                      )}
"""
if 'Please scan the Lanka QR code' not in course_code:
    # Find the end of the bank block. It ends with:
    # </div>
    # </div>
    # ) : ... (the stripe element)
    course_code = course_code.replace(
        "                          </div>\n                        </div>\n                      ) : paymentMethod === 'card' ?",
        f"                          </div>\n                        </div>\n                      ) : {qr_ui_display.strip()}\n                      {paymentMethod === 'card' ?"
    )

with open(course_file, 'w', encoding='utf-8') as f:
    f.write(course_code)
print("Updated Course Page")
