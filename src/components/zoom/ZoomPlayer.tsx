"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ZoomPlayerProps {
  meetingNumber: string;
  userName: string;
  userEmail: string;
  password?: string;
  role?: number;
}

export default function ZoomPlayer({
  meetingNumber,
  userName,
  userEmail,
  password = "",
  role = 0,
}: ZoomPlayerProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Construct URL with query parameters
  const params = new URLSearchParams({
    mn: meetingNumber,
    name: userName,
    email: userEmail,
    pwd: password,
    role: role.toString(),
  });

  const iframeSrc = /zoom-frame.html?v=2&;

  return (
    <div className="w-full h-full relative bg-zinc-900 rounded-lg overflow-hidden min-h-[500px]">
      {!iframeLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-10 text-white">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Preparing Meeting Environment...</p>
        </div>
      )}

      <iframe
        src={iframeSrc}
        className="w-full h-full border-0 absolute inset-0 z-0"
        allow="camera; microphone; display-capture"
        onLoad={() => setIframeLoaded(true)}
      />
    </div>
  );
}


