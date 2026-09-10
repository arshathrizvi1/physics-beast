"use client";

import React, { useEffect } from "react";

export function AntiScreenshotProtection() {
  useEffect(() => {
    // 1. Create high z-index blackout overlay
    let blackoutDiv = document.getElementById("anti-screenshot-blackout");
    if (!blackoutDiv) {
      blackoutDiv = document.createElement("div");
      blackoutDiv.id = "anti-screenshot-blackout";
      blackoutDiv.style.position = "fixed";
      blackoutDiv.style.top = "0";
      blackoutDiv.style.left = "0";
      blackoutDiv.style.width = "100vw";
      blackoutDiv.style.height = "100vh";
      blackoutDiv.style.backgroundColor = "#000000";
      blackoutDiv.style.zIndex = "2147483647"; // Max 32-bit int z-index
      blackoutDiv.style.color = "white";
      blackoutDiv.style.display = "flex";
      blackoutDiv.style.alignItems = "center";
      blackoutDiv.style.justifyContent = "center";
      blackoutDiv.style.fontSize = "24px";
      blackoutDiv.style.fontWeight = "bold";
      blackoutDiv.style.opacity = "0";
      blackoutDiv.style.pointerEvents = "none";
      blackoutDiv.style.transition = "opacity 0.05s linear";
      blackoutDiv.innerHTML = `
        <div style="text-align:center; padding: 20px;">
          <span style="font-size:64px; display:block; margin-bottom:15px;">🛡️</span>
          <span style="color:#ef4444; font-size: 22px;">Content Protected</span><br/>
          <span style="font-size:14px; font-weight:normal; color:#a1a1aa; margin-top:10px; display:block;">
            Screenshots, screen recording, and app-switching are disabled due to security policy.
          </span>
        </div>
      `;
      document.body.appendChild(blackoutDiv);
    }

    const showBlackout = () => {
      if (blackoutDiv) {
        blackoutDiv.style.opacity = "1";
        blackoutDiv.style.pointerEvents = "all";
      }
    };

    const hideBlackout = () => {
      if (blackoutDiv) {
        blackoutDiv.style.opacity = "0";
        blackoutDiv.style.pointerEvents = "none";
      }
    };

    // 2. Window Blur (Fires instantly on Android Chrome when notification shade pulled down, screen recorder started, or app switcher opened)
    const handleBlur = () => {
      showBlackout();
    };

    const handleFocus = () => {
      hideBlackout();
    };

    // 3. Document Visibility Change
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === "hidden") {
        showBlackout();
      } else {
        hideBlackout();
      }
    };

    // 4. Keyboard Shortcuts (PrintScreen, Mac Cmd+Shift+3/4/5, Ctrl+P, Ctrl+S)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "PrintScreen" ||
        e.keyCode === 44 ||
        (e.ctrlKey && (e.key === "p" || e.key === "s" || e.key === "u")) ||
        (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5"))
      ) {
        e.preventDefault();
        showBlackout();
        try {
          navigator.clipboard.writeText("Content Protected");
        } catch (err) {}
        setTimeout(hideBlackout, 3000);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        showBlackout();
        try {
          navigator.clipboard.writeText("Content Protected");
        } catch (err) {}
        setTimeout(hideBlackout, 3000);
      }
    };

    // 5. Android 3-finger gesture detection (3 or more touches)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length >= 3) {
        showBlackout();
        setTimeout(hideBlackout, 2500);
      }
    };

    // 6. Prevent Context Menu (Long-press on Android Chrome to save image or inspect)
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "VIDEO" ||
          target.tagName === "IMG" ||
          target.tagName === "CANVAS" ||
          target.closest(".protected-content") ||
          target.closest("#pdf-viewer-container"))
      ) {
        e.preventDefault();
        return false;
      }
    };

    // 7. Prevent Dragging elements off page
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "IMG" ||
          target.tagName === "VIDEO" ||
          target.closest(".protected-content"))
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchStart, { passive: true });
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchStart);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);

      if (blackoutDiv && document.body.contains(blackoutDiv)) {
        document.body.removeChild(blackoutDiv);
      }
    };
  }, []);

  return null;
}
