"use client";

import React, { useState, useRef, useEffect } from "react";
import { RefreshCw, AlertCircle, ShieldCheck, Maximize, Minimize, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PdfViewerProps {
  url: string;
  title?: string;
  className?: string;
  height?: string;
  allowDownload?: boolean;
}

export function PdfViewer({ 
  url, 
  title = "PDF Document", 
  className = "", 
  height = "650px",
  allowDownload = false 
}: PdfViewerProps) {
  const [viewerMode, setViewerMode] = useState<"native" | "gdocs">("native");
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground p-6 text-center">
        <AlertCircle className="w-10 h-10 mb-2 opacity-60" />
        <p className="text-sm">No PDF attached.</p>
      </div>
    );
  }

  let trimmed = url.trim();
  
  // Enforce HTTPS for Cloudinary URLs
  if (trimmed.startsWith("http://res.cloudinary.com")) {
    trimmed = trimmed.replace("http://", "https://");
  }

  const isGoogleDrive = trimmed.includes("drive.google.com");

  // Format the direct source URL for native embedding or Google Drive embed
  let directViewerUrl = trimmed;
  if (isGoogleDrive) {
    const fileIdMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      directViewerUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  } else if (directViewerUrl.includes("cloudinary.com") && !directViewerUrl.toLowerCase().includes(".pdf")) {
    // Cloudinary URLs need a .pdf extension for the browser's PDF viewer to activate
    directViewerUrl += ".pdf";
  }

  const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(directViewerUrl)}&embedded=true`;

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col w-full h-full bg-secondary/5 rounded-b-xl overflow-hidden ${isFullscreen ? 'bg-background' : ''} ${className}`}
    >
      {/* Viewer Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-secondary/20 border-b border-border text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {!isGoogleDrive && (
            <div className="flex items-center bg-background/80 rounded-md p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setViewerMode("native")}
                className={`px-2 py-1 rounded transition-colors text-xs font-medium cursor-pointer ${
                  viewerMode === "native" 
                    ? "bg-primary text-primary-foreground shadow-xs" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Standard Viewer
              </button>
              <button
                type="button"
                onClick={() => setViewerMode("gdocs")}
                className={`px-2 py-1 rounded transition-colors text-xs font-medium cursor-pointer ${
                  viewerMode === "gdocs" 
                    ? "bg-primary text-primary-foreground shadow-xs" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Alternative Viewer
              </button>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleReload}
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            title="Reload Viewer"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Reload</span>
          </Button>

          {allowDownload && !isGoogleDrive && (
            <a
              href={directViewerUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!allowDownload && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground opacity-80 px-2 border-r border-border mr-1">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <span className="hidden sm:inline">Protected View</span>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={toggleFullscreen}
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
          </Button>
        </div>
      </div>

      {/* Embedded PDF container */}
      <div className="relative w-full flex-1 min-h-[650px] bg-white flex flex-col" style={{ minHeight: isFullscreen ? '100vh' : height }}>
        
        {/* Anti-Download Overlay to hide Google Drive/Docs Pop-out button */}
        {!allowDownload && (isGoogleDrive || viewerMode === "gdocs") && (
          <div 
            className="absolute top-0 right-0 w-[100px] h-[80px] bg-white z-50 flex flex-col items-center justify-center pointer-events-auto cursor-not-allowed border-b border-l border-gray-200 shadow-sm"
            title="Pop-out disabled for exam security"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <ShieldCheck className="w-6 h-6 text-green-600/60 mb-1" />
            <span className="text-[10px] font-bold text-gray-400">SECURE</span>
          </div>
        )}

        {isGoogleDrive ? (
          <iframe
            key={`drive-${reloadKey}`}
            src={directViewerUrl}
            className="w-full h-full min-h-[650px] border-0 flex-1"
            title={title}
            allow="autoplay"
            sandbox={allowDownload ? undefined : "allow-scripts allow-same-origin"}
          />
        ) : viewerMode === "native" ? (
          <object
            key={`native-${reloadKey}`}
            data={allowDownload ? directViewerUrl : `${directViewerUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            type="application/pdf"
            className="w-full h-full min-h-[650px] border-0 flex-1"
            title={title}
            onContextMenu={(e) => {
              if (!allowDownload) e.preventDefault();
            }}
          >
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Browser PDF Viewer Not Supported</h3>
              <p className="text-sm text-gray-600 max-w-md">
                Your browser doesn't support rendering this PDF inline. Please switch to the "Alternative Viewer" to view the question paper.
              </p>
            </div>
          </object>
        ) : (
          <iframe
            key={`gdocs-${reloadKey}`}
            src={googleDocsViewerUrl}
            className="w-full h-full min-h-[650px] border-0 flex-1"
            title={title}
            allow="autoplay"
            sandbox={allowDownload ? undefined : "allow-scripts allow-same-origin"}
          />
        )}
      </div>
    </div>
  );
}
