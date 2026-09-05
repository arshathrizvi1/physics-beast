"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, DollarSign, TrendingUp, Users, FileText, CheckCircle2, Eye, X, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function FinanceReportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [viewingReceipt, setViewingReceipt] = useState<{
    url: string;
    studentName: string;
    amount: number;
    folderName: string;
    date?: number;
  } | null>(null);

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      const qPayments = query(collection(db, 'payments'), orderBy("createdAt", "desc"));
      const unsub = onSnapshot(qPayments, (snapshot) => {
        setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    }
  }, [user]);

  if (loading || user?.role !== 'admin') {
    return <div className="p-12 text-center animate-pulse">Loading secure financial data...</div>;
  }

  const approvedPayments = payments.filter(p => p.status === 'approved');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const rejectedPayments = payments.filter(p => p.status === 'rejected');

  const totalIncome = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingIncome = pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-secondary/50 pb-6">
          <Link href="/admin">
            <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <TrendingUp className="w-8 h-8" /> Financial Overview
            </h1>
            <p className="text-muted-foreground">Comprehensive income and payment history reports.</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-green-500/30 bg-green-500/5 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase text-green-600">Total Cleared Income</CardDescription>
              <CardTitle className="text-3xl font-black text-green-500">Rs. {totalIncome.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">From {approvedPayments.length} approved transactions</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30 bg-yellow-500/5 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase text-yellow-600">Pending Verification</CardDescription>
              <CardTitle className="text-3xl font-black text-yellow-500">Rs. {pendingIncome.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">From {pendingPayments.length} unapproved receipts</p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase text-primary">Unique Paying Students</CardDescription>
              <CardTitle className="text-3xl font-black text-primary">
                {new Set(approvedPayments.map(p => p.studentId)).size}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Total distinct student purchasers</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Income Breakdown */}
        <Card className="border-secondary/50 shadow-md">
          <CardHeader className="bg-primary/5 border-b border-primary/20">
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Monthly Income Breakdown
            </CardTitle>
            <CardDescription>Cleared revenue grouped by month.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            {(() => {
              const monthlyIncome = approvedPayments.reduce((acc, pay: any) => {
                const d = new Date(pay.createdAt);
                if (isNaN(d.getTime())) return acc;
                const monthKey = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                if (!acc[monthKey]) acc[monthKey] = 0;
                acc[monthKey] += Number((pay as any).amount || 0);
                return acc;
              }, {} as Record<string, number>);

              const sortedMonthlyIncome = Object.entries(monthlyIncome).sort((a, b) => {
                return new Date(b[0]).getTime() - new Date(a[0]).getTime();
              });

              if (sortedMonthlyIncome.length === 0) {
                return <p className="text-muted-foreground italic text-center">No cleared income recorded yet.</p>;
              }

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {sortedMonthlyIncome.map(([month, amount]: [string, any]) => (
                    <div key={month} className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{month}</p>
                      <p className="text-xl font-black text-green-600">Rs. {Number(amount).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Full History Table */}
        <Card className="border-secondary/50 shadow-md">
          <CardHeader className="bg-primary/5 border-b border-primary/20">
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <FileText className="w-5 h-5" /> All Transaction History
            </CardTitle>
            <CardDescription>A complete log of every payment attempt, approval, and rejection.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/20">
                    <tr>
                      <th className="px-6 py-4 rounded-tl-lg">Date</th>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Course / Folder</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4">Receipt</th>
                      <th className="px-6 py-4 rounded-tr-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/20">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-secondary/5 transition-colors">
                        <td className="px-6 py-4 text-xs">
                          {new Date(p.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold">{p.studentName}</div>
                          <div className="text-xs text-muted-foreground">{p.studentEmail}</div>
                        </td>
                        <td className="px-6 py-4 font-medium">{p.folderName}</td>
                        <td className="px-6 py-4 font-bold">Rs. {p.amount}</td>
                        <td className="px-6 py-4 uppercase text-xs">{p.method}</td>
                        <td className="px-6 py-4">
                          {p.receiptBase64 || p.receiptUrl ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingReceipt({
                                url: p.receiptBase64 || p.receiptUrl,
                                studentName: p.studentName || "Student",
                                amount: p.amount || 0,
                                folderName: p.folderName || "Course Folder",
                                date: p.createdAt
                              })}
                              className="text-primary hover:bg-primary/10 border-primary/40 flex items-center gap-1.5 h-8 font-semibold shadow-sm text-xs"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Receipt
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">No Receipt</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                            p.status === 'approved' ? 'bg-green-500/20 text-green-500' : 
                            p.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                            'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* RECEIPT POPUP MODAL */}
      {viewingReceipt && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setViewingReceipt(null)}
        >
          <div 
            className="bg-card border border-border/80 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-secondary/10">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Receipt: {viewingReceipt.studentName}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {viewingReceipt.folderName} • <span className="text-green-500 font-bold">Rs. {viewingReceipt.amount}</span>
                  {viewingReceipt.date ? ` • ${new Date(viewingReceipt.date).toLocaleString()}` : ''}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setViewingReceipt(null)}
                className="rounded-full w-8 h-8 p-0 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Receipt Image / PDF Display */}
            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-black/50 min-h-[320px]">
              {viewingReceipt.url.startsWith("data:application/pdf") || viewingReceipt.url.toLowerCase().includes(".pdf") ? (
                <div className="w-full flex flex-col items-center gap-3">
                  <iframe 
                    src={viewingReceipt.url} 
                    className="w-full h-[65vh] rounded-lg border border-border/30 bg-white" 
                    title={`Receipt PDF from ${viewingReceipt.studentName}`}
                  />
                </div>
              ) : (
                <img 
                  src={viewingReceipt.url} 
                  alt={`Receipt from ${viewingReceipt.studentName}`} 
                  className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-2xl border border-border/30"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-border/50 bg-secondary/10 flex justify-between items-center">
              {(() => {
                const isPdf = viewingReceipt.url.startsWith("data:application/pdf") || viewingReceipt.url.toLowerCase().includes(".pdf");
                return (
                  <a 
                    href={viewingReceipt.url} 
                    download={`receipt-${viewingReceipt.studentName}.${isPdf ? 'pdf' : 'jpg'}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline px-3 py-1.5 rounded-md hover:bg-primary/10 transition-colors font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open / Download {isPdf ? "PDF Document" : "Full Resolution"}
                  </a>
                );
              })()}
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => setViewingReceipt(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
