import os

course_file = 'src/app/course/[id]/page.tsx'
with open(course_file, 'r', encoding='utf-8') as f:
    course_code = f.read()

qr_ui_display = """
                      ) : (paymentConfig && paymentMethod === 'qr' && paymentConfig.qrEnabled) ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 pb-4">
                          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-4 text-center">
                            <p className="text-sm font-medium text-green-400">Please scan the Lanka QR code to transfer Rs. {checkoutFolder.price}</p>
                            
                            {paymentConfig.qrImageUrl ? (
                              <div className="w-48 h-48 mx-auto bg-white p-2 rounded-xl border border-green-500/30 shadow-lg relative overflow-hidden group flex items-center justify-center">
                                <img src={paymentConfig.qrImageUrl} alt="Lanka QR" className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <p className="text-sm text-zinc-500 py-8">QR Code not uploaded by admin yet.</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Upload Payment Receipt</Label>
                            <div className="border-2 border-dashed border-secondary rounded-lg p-6 text-center hover:bg-secondary/10 transition-colors cursor-pointer relative">
                              {receiptFile ? (
                                <div className="space-y-2">
                                  <FileText className="w-8 h-8 text-primary mx-auto" />
                                  <p className="text-sm font-medium text-primary">{receiptFile.name}</p>
                                  <p className="text-xs text-muted-foreground">Click to change file</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="w-12 h-12 bg-secondary/30 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                                    <ChevronDown className="w-6 h-6" />
                                  </div>
                                  <p className="text-sm font-medium">Click to upload deposit slip</p>
                                  <p className="text-xs text-muted-foreground">JPEG, PNG, or PDF</p>
                                </div>
                              )}
                              <input 
                                type="file" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setReceiptFile(e.target.files[0]);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (paymentConfig?.cardEnabled !== false) ? (
"""

if 'Please scan the Lanka QR code' not in course_code:
    course_code = course_code.replace(
        ") : (paymentConfig?.cardEnabled !== false) ? (",
        qr_ui_display.strip()
    )

with open(course_file, 'w', encoding='utf-8') as f:
    f.write(course_code)
print("Updated Course Page with QR UI logic")
