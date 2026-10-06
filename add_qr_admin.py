import os
import re

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
