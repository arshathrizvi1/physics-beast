"use client";

import React, { useState, useRef, useEffect } from "react";
import { RefreshCw, AlertCircle, ShieldCheck, Maximize, Minimize, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document, Page, pdfjs } from "react-pdf";

// We import the styles required by react-pdf
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  title?: string;
  className?: string;
  height?: string;
  allowDownload?: boolean;
}

export function PdfViewer({ 
  url, 
  title = "Document", 
  className = "", 
  height = "600px",
  allowDownload = false 
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [renderScale, setRenderScale] = useState<number>(1.0); // The high-res react-pdf scale
  const [cssScale, setCssScale] = useState<number>(1.0); // The smooth CSS preview scale
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const documentContainerRef = useRef<HTMLDivElement>(null);

  // Helper to set zoom from buttons (updates render directly)
  const handleSetZoom = (newZoom: number) => {
    setRenderScale(Math.max(0.5, Math.min(newZoom, 4.0)));
    setCssScale(1.0);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Update container width for responsive PDF rendering
  useEffect(() => {
    const updateWidth = () => {
      if (documentContainerRef.current) {
        setContainerWidth(documentContainerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isFullscreen]);

  // Unified Mouse, Touch, and Trackpad Logic
  useEffect(() => {
    const container = documentContainerRef.current;
    if (!container) return;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let scrollStartX = 0;
    let scrollStartY = 0;

    // Pinch/Wheel states
    let pinchStartDist = 0;
    let currentCssScale = 1.0;
    let renderTimeout: NodeJS.Timeout | null = null;

    const commitZoom = () => {
      if (currentCssScale !== 1.0) {
        setRenderScale(prev => {
          let next = prev * currentCssScale;
          return Math.max(0.5, Math.min(next, 4.0));
        });
        setCssScale(1.0);
        currentCssScale = 1.0;
      }
    };

    const handleZoomStep = (scaleMultiplier: number) => {
      currentCssScale *= scaleMultiplier;
      // Clamp temporary visual scale to avoid crazy zooms before commit
      currentCssScale = Math.max(0.2, Math.min(currentCssScale, 8.0)); 
      setCssScale(currentCssScale);
      
      if (renderTimeout) clearTimeout(renderTimeout);
      renderTimeout = setTimeout(commitZoom, 300);
    };

    // Trackpad / Mouse Wheel Zoom
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault(); // Prevent browser native whole-page zoom
        const multiplier = e.deltaY > 0 ? 0.95 : 1.05;
        handleZoomStep(multiplier);
      }
    };

    // Touch Pinch-to-Zoom
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        pinchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist > 0) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        
        const scaleFactor = dist / pinchStartDist;
        pinchStartDist = dist; // Reset for continuous delta
        
        handleZoomStep(scaleFactor);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDist = 0;
      }
    };

    // Mouse Drag-to-Pan
    const onMouseDown = (e: MouseEvent) => {
      // Only trigger pan on left click (button 0)
      if (e.button !== 0) return;
      
      // Don't intercept clicks on scrollbars (rough heuristic: if clicking near the right edge)
      if (container.offsetWidth - e.offsetX < 20 || container.offsetHeight - e.offsetY < 20) {
        return;
      }

      isDragging = true;
      container.style.cursor = 'grabbing';
      dragStartX = e.pageX - container.offsetLeft;
      dragStartY = e.pageY - container.offsetTop;
      scrollStartX = container.scrollLeft;
      scrollStartY = container.scrollTop;
    };

    const onMouseLeaveOrUp = () => {
      isDragging = false;
      container.style.cursor = 'grab';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const y = e.pageY - container.offsetTop;
      const walkX = (x - dragStartX) * 1.5;
      const walkY = (y - dragStartY) * 1.5;
      container.scrollLeft = scrollStartX - walkX;
      container.scrollTop = scrollStartY - walkY;
    };

    container.style.cursor = 'grab';

    // Attach listeners
    container.addEventListener("wheel", onWheel, { passive: false });
    
    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: false });
    container.addEventListener("touchcancel", onTouchEnd, { passive: false });

    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("mouseleave", onMouseLeaveOrUp);
    container.addEventListener("mouseup", onMouseLeaveOrUp);
    container.addEventListener("mousemove", onMouseMove);

    return () => {
      if (renderTimeout) clearTimeout(renderTimeout);
      
      container.removeEventListener("wheel", onWheel);
      
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);

      container.removeEventListener("mousedown", onMouseDown);
      container.removeEventListener("mouseleave", onMouseLeaveOrUp);
      container.removeEventListener("mouseup", onMouseLeaveOrUp);
      container.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
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

  // Cloudinary URLs may need a .pdf extension
  if (trimmed.includes("cloudinary.com") && !trimmed.toLowerCase().includes(".pdf")) {
    trimmed += ".pdf";
  }

  return (
    <div 
      ref={containerRef}
      aria-label={title}
      className={`flex flex-col w-full bg-secondary/5 rounded-b-xl overflow-hidden border border-border/50 ${
        isFullscreen ? "bg-background h-screen z-50 fixed inset-0" : ""
      } ${className}`}
      style={!isFullscreen ? { height } : undefined}
    >
      <div className="flex flex-col h-full w-full">
        {/* Viewer Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-secondary/20 border-b border-border text-xs text-muted-foreground shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => handleSetZoom(renderScale - 0.25)}
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="min-w-[40px] text-center font-medium">
              {Math.round(renderScale * cssScale * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => handleSetZoom(renderScale + 0.25)}
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => handleSetZoom(1.5)}
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground hidden sm:flex"
              title="Reset Zoom"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </Button>
          </div>

          {/* Page count indicator */}
          {numPages && (
            <div className="flex items-center gap-2 bg-background/80 rounded-md px-3 py-1 border border-border font-medium">
              {numPages} {numPages === 1 ? 'Page' : 'Pages'}
            </div>
          )}

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
              <span className="hidden sm:inline">{isFullscreen ? "Exit Full Screen" : "Full Screen"}</span>
            </Button>
          </div>
        </div>

        {/* Embedded PDF container (Continuous Scroll) */}
        <div 
          ref={documentContainerRef}
          className="relative w-full flex-1 overflow-auto bg-[#323639] custom-scrollbar flex flex-col py-6 gap-6"
        >
          <div 
            style={{ 
              transform: `scale(${cssScale})`, 
              transformOrigin: 'top center'
            }}
            className="flex flex-col min-w-max mx-auto"
          >
            <Document
              file={trimmed}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-zinc-300">
                  <RefreshCw className="w-8 h-8 mb-4 animate-spin text-[#d4af37]" />
                  <p>Loading document...</p>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-red-400 p-6 text-center">
                  <AlertCircle className="w-10 h-10 mb-2 opacity-80" />
                  <p className="font-medium">Failed to load PDF file.</p>
                  <p className="text-sm mt-2 opacity-80 text-zinc-400">
                    The file might be corrupted, or your server is blocking cross-origin requests (CORS).
                  </p>
                  <p className="text-xs mt-4 max-w-sm text-center font-mono bg-red-950/50 p-2 rounded text-red-300">
                    Please enable "Add CORS Headers" in your CDN dashboard (e.g. Bunny CDN Pull Zone settings).
                  </p>
                </div>
              }
              className="flex flex-col gap-6 w-full"
            >
              {numPages && Array.from(new Array(numPages), (el, index) => (
                <div key={`page_${index + 1}`} className="relative group mx-auto">
                  <Page 
                    pageNumber={index + 1} 
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-[0_2px_10px_rgba(0,0,0,0.3)] bg-white"
                    width={containerWidth ? (Math.min(containerWidth - 32, 1200) * renderScale) : undefined}
                  />
                </div>
              ))}
            </Document>
          </div>
        </div>
      </div>
      
      {allowDownload && (
        <div className="bg-background border-t border-border p-4 flex justify-between items-center z-10 shrink-0">
          <div className="text-sm font-medium text-foreground hidden sm:block">
            {title}
          </div>
          <a
            href={trimmed}
            download
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-[#d4af37] hover:bg-[#b5952f] text-black font-bold px-6 py-2.5 rounded-md transition-colors shadow-md w-full sm:w-auto justify-center"
          >
            <Download className="w-5 h-5" />
            Download PDF
          </a>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .react-pdf__Page__canvas {
          margin: 0 auto;
          border-radius: 4px;
        }
        .react-pdf__Page__textContent {
          border-radius: 4px;
        }
        .react-pdf__Page__annotations {
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
      `}} />
    </div>
  );
}
