"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    console.error("Global app error caught:", error);
    
    // Auto-reload on chunk load errors
    if (
      error.message?.toLowerCase().includes("chunk") || 
      error.message?.toLowerCase().includes("fetch") ||
      error.message?.toLowerCase().includes("network") ||
      error.message?.toLowerCase().includes("failed to load")
    ) {
      console.log("Chunk error detected. Auto-reloading...");
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center w-full">
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>
      
      <h2 className="text-2xl font-bold mb-3 tracking-tight">Something went wrong</h2>
      
      <p className="text-muted-foreground mb-8 max-w-md text-sm leading-relaxed">
        We encountered an unexpected error while loading this page. This usually happens when the app has been updated. Please refresh to get the latest version.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Button 
          onClick={() => window.location.reload()} 
          size="lg"
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload App
        </Button>
        <Button 
          asChild
          variant="outline"
          size="lg"
          className="font-semibold"
        >
          <Link href="/dashboard">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
