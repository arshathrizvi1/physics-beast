"use client";

import React, { useState, useRef, useEffect } from "react";
import { RefreshCw, AlertCircle, ShieldCheck, Maximize, Minimize, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document, Page, pdfjs } from "react-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

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
  title = "PDF Document", 
  className = "", 
  height = "650px",
  allowDownload = false 
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const documentContainerRef = useRef<HTMLDivElement>(null);

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
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => prevPageNumber + offset);
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);
  
  
  

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
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit={true}
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform, state }) => (
          <div className="flex flex-col h-full w-full">
            {/* Viewer Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-secondary/20 border-b border-border text-xs text-muted-foreground shrink-0">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => zoomOut()}
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="min-w-[40px] text-center font-medium">
                  {Math.round(state.scale * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => zoomIn()}
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
                  onClick={() => resetTransform()}
                  className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground hidden sm:flex"
                  title="Reset Zoom"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </Button>
              </div>

              {/* Pagination controls */}
              {numPages && (
                <div className="flex items-center gap-2 bg-background/80 rounded-md p-0.5 border border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={pageNumber <= 1}
                    onClick={previousPage}
                    className="h-6 w-6"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="px-2 font-medium">
                    Page {pageNumber} of {numPages}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={pageNumber >= numPages}
                    onClick={nextPage}
                    className="h-6 w-6"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
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

            {/* Embedded PDF container */}
            <div 
              ref={documentContainerRef}
              className="relative w-full flex-1 overflow-hidden bg-black/5 flex justify-center py-4"
            >
              <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                <Document
                  file={trimmed}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
                      <RefreshCw className="w-8 h-8 mb-4 animate-spin text-primary" />
                      <p>Loading document...</p>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-destructive p-6 text-center">
                      <AlertCircle className="w-10 h-10 mb-2 opacity-80" />
                      <p className="font-medium">Failed to load PDF file.</p>
                      <p className="text-sm mt-2 opacity-80">
                        The file might be corrupted, or your server is blocking cross-origin requests (CORS).
                      </p>
                      <p className="text-xs mt-4 max-w-sm text-center font-mono bg-destructive/10 p-2 rounded">
                        If using Amazon S3, ensure your bucket&apos;s CORS configuration allows GET requests from this domain.
                      </p>
                    </div>
                  }
                  className="flex flex-col items-center"
                >
                  <Page 
                    pageNumber={pageNumber} 
                    scale={1.5}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-xl bg-white"
                    width={containerWidth ? Math.min(containerWidth - 32, 1000) : undefined}
                  />
                </Document>
              </TransformComponent>
            </div>
          </div>
        )}
      </TransformWrapper>
      
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
