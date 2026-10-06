const fs = require('fs');
let code = fs.readFileSync('src/app/login/page.tsx', 'utf8');

// Inject the Reset Password UI
const resetUI = `
  if (resetOobCode) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-md border-secondary/50 shadow-lg shadow-primary/5">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">Reset Your Password</CardTitle>
            <CardDescription>Enter a strong new password below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input 
                    id="newPassword" 
                    type={showPassword ? "text" : "password"} 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Enter new password"
                    required 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm Password</Label>
                <div className="relative">
                  <Input 
                    id="confirmNewPassword" 
                    type={showPassword ? "text" : "password"} 
                    value={confirmNewPassword} 
                    onChange={(e) => setConfirmNewPassword(e.target.value)} 
                    placeholder="Confirm new password"
                    required 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full font-bold" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Updating...</span>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Login/Signup View
`;

code = code.replace('  // Login/Signup View', resetUI);
fs.writeFileSync('src/app/login/page.tsx', code);
console.log('UI injected successfully.');
