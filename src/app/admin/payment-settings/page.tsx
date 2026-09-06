"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, CreditCard, Building } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    bankEnabled: true,
    cardEnabled: true,
    bankName: "Bank of Ceylon",
    branchName: "Rakwana Branch",
    accountNo: "0008766934",
    accountName: "MRM arshath"
  });

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'siteConfig', 'payments');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as any);
        }
      } catch (err) {
        console.error("Failed to load payment config", err);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'siteConfig', 'payments'), config);
      alert("Payment settings saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || user?.role !== 'admin') return <div className="p-12 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin">
          <Button variant="outline" size="icon" className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-primary" />
            Payment Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure accepted payment methods and bank details</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-primary/20">
          <CardHeader className="bg-secondary/10 border-b border-border/50">
            <CardTitle className="text-lg">Payment Methods</CardTitle>
            <CardDescription>Toggle which payment methods are available to students during checkout.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-background border border-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">Manual Bank Transfer</p>
                  <p className="text-sm text-muted-foreground">Students upload a deposit slip for manual approval</p>
                </div>
              </div>
              <Switch 
                checked={config.bankEnabled} 
                onCheckedChange={(c) => setConfig({ ...config, bankEnabled: c })} 
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-background border border-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">Online Card Payment</p>
                  <p className="text-sm text-muted-foreground">Process payments automatically via Stripe/PayHere</p>
                </div>
              </div>
              <Switch 
                checked={config.cardEnabled} 
                onCheckedChange={(c) => setConfig({ ...config, cardEnabled: c })} 
              />
            </div>
          </CardContent>
        </Card>

        {config.bankEnabled && (
          <Card className="border-secondary/40">
            <CardHeader className="bg-secondary/5 border-b border-border/50">
              <CardTitle className="text-lg">Bank Account Details</CardTitle>
              <CardDescription>These details will be shown to students when they choose Bank Transfer.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input 
                    value={config.bankName} 
                    onChange={e => setConfig({...config, bankName: e.target.value})} 
                    placeholder="e.g. Bank of Ceylon"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch Name</Label>
                  <Input 
                    value={config.branchName} 
                    onChange={e => setConfig({...config, branchName: e.target.value})} 
                    placeholder="e.g. Rakwana Branch"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input 
                    value={config.accountNo} 
                    onChange={e => setConfig({...config, accountNo: e.target.value})} 
                    placeholder="e.g. 0008766934"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Holder Name</Label>
                  <Input 
                    value={config.accountName} 
                    onChange={e => setConfig({...config, accountName: e.target.value})} 
                    placeholder="e.g. MRM arshath"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving} className="gap-2 px-8 py-6 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Payment Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
