"use client";

import React from "react";
import { VideoPlayerSettings, defaultPlayerSettings } from "@/lib/playerDeviceControl";
import { Monitor, Smartphone, TabletSmartphone, PlayCircle } from "lucide-react";

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

interface Props {
  value: VideoPlayerSettings;
  onChange: (value: VideoPlayerSettings) => void;
  title?: string;
  description?: string;
}

export function PlayerSettingsEditor({
  value,
  onChange,
  title = "Player & Device Access Controls",
  description = "Choose which players (Bunny Cloud or YouTube) students can view and which devices are allowed for each."
}: Props) {
  const current = value || defaultPlayerSettings;

  const updateBunny = (key: keyof typeof current.bunny, val: boolean) => {
    onChange({
      ...current,
      bunny: {
        ...current.bunny,
        [key]: val,
      },
    });
  };

  const updateYoutube = (key: keyof typeof current.youtube, val: boolean) => {
    onChange({
      ...current,
      youtube: {
        ...current.youtube,
        [key]: val,
      },
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-secondary/10 p-4">
      <div>
        <h4 className="text-sm font-bold flex items-center gap-2 text-foreground">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>

      {/* Primary Default Player Selector */}
      <div className="p-3.5 rounded-xl border border-primary/20 bg-background/70 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <span>⭐</span> Default Primary Player (Opens First)
          </label>
          <span className="text-[11px] font-semibold text-primary px-2 py-0.5 rounded bg-primary/10">
            {current.defaultPlayer === 'piped' ? 'Piped Clean Player' : (current.defaultPlayer === 'youtube' ? 'YouTube Player' : 'Bunny Cloud')}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-tight">
          Select which player is loaded by default when a student opens a video. If both players are enabled for their device, students can switch using the Source tabs.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onChange({ ...current, defaultPlayer: 'bunny' })}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium text-left transition-all ${
              (current.defaultPlayer || 'bunny') === 'bunny'
                ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary'
                : 'border-border/60 bg-secondary/20 text-muted-foreground hover:text-foreground'
            }`}
          >
            <PlayCircle className="w-4 h-4 shrink-0 text-primary" />
            <div>
              <p className="font-bold text-xs">Bunny Cloud</p>
              <p className="text-[10px] opacity-80 font-normal">Primary (Recommended)</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...current, defaultPlayer: 'piped' })}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium text-left transition-all ${
              current.defaultPlayer === 'piped'
                ? 'border-purple-500 bg-purple-500/10 text-purple-400 shadow-sm ring-1 ring-purple-500'
                : 'border-border/60 bg-secondary/20 text-muted-foreground hover:text-foreground'
            }`}
          >
            <PlayCircle className="w-4 h-4 shrink-0 text-purple-400" />
            <div>
              <p className="font-bold text-xs">Piped Format</p>
              <p className="text-[10px] opacity-80 font-normal">Clean Proxy (No Logo)</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...current, defaultPlayer: 'youtube' })}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium text-left transition-all ${
              current.defaultPlayer === 'youtube'
                ? 'border-red-500 bg-red-500/10 text-red-500 shadow-sm ring-1 ring-red-500'
                : 'border-border/60 bg-secondary/20 text-muted-foreground hover:text-foreground'
            }`}
          >
            <YoutubeIcon className="w-4 h-4 shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-xs">YouTube</p>
              <p className="text-[10px] opacity-80 font-normal">Direct YouTube</p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bunny / Cloud Player Card */}
        <div className={`p-3.5 rounded-lg border transition-all ${current.bunny?.enabled !== false ? 'border-primary/40 bg-background/80 shadow-sm' : 'border-border/40 bg-secondary/20 opacity-70'}`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Bunny Cloud Player</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={current.bunny?.enabled !== false}
                onChange={(e) => updateBunny('enabled', e.target.checked)}
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
              />
              <span>{current.bunny?.enabled !== false ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          <p className="text-[11px] text-muted-foreground mb-3">
            Allowed Devices for Bunny Player:
          </p>

          <div className="space-y-2 pl-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={current.bunny?.enabled === false}
                checked={current.bunny?.pcWeb !== false}
                onChange={(e) => updateBunny('pcWeb', e.target.checked)}
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer disabled:opacity-40"
              />
              <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium">PC Web (Desktop Browser)</span>
            </label>

            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={current.bunny?.enabled === false}
                checked={current.bunny?.mobileWeb !== false}
                onChange={(e) => updateBunny('mobileWeb', e.target.checked)}
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer disabled:opacity-40"
              />
              <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium">Android / Mobile Web Browser</span>
            </label>

            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={current.bunny?.enabled === false}
                checked={current.bunny?.androidApp !== false}
                onChange={(e) => updateBunny('androidApp', e.target.checked)}
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer disabled:opacity-40"
              />
              <TabletSmartphone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium">Android App (Native APK)</span>
            </label>
          </div>
        </div>

        {/* YouTube Player Card */}
        <div className={`p-3.5 rounded-lg border transition-all ${current.youtube?.enabled !== false ? 'border-red-500/40 bg-background/80 shadow-sm' : 'border-border/40 bg-secondary/20 opacity-70'}`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <YoutubeIcon className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold">YouTube Player</span>
            </div>
            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={current.youtube?.enabled !== false}
                onChange={(e) => updateYoutube('enabled', e.target.checked)}
                className="w-4 h-4 rounded text-red-500 accent-red-600 cursor-pointer"
              />
              <span>{current.youtube?.enabled !== false ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          <p className="text-[11px] text-muted-foreground mb-3">
            Allowed Devices for YouTube Player:
          </p>

          <div className="space-y-2 pl-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={current.youtube?.enabled === false}
                checked={current.youtube?.pcWeb !== false}
                onChange={(e) => updateYoutube('pcWeb', e.target.checked)}
                className="w-4 h-4 rounded text-red-500 accent-red-600 cursor-pointer disabled:opacity-40"
              />
              <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium">PC Web (Desktop Browser)</span>
            </label>

            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={current.youtube?.enabled === false}
                checked={current.youtube?.mobileWeb !== false}
                onChange={(e) => updateYoutube('mobileWeb', e.target.checked)}
                className="w-4 h-4 rounded text-red-500 accent-red-600 cursor-pointer disabled:opacity-40"
              />
              <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium">Android / Mobile Web Browser</span>
            </label>

            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={current.youtube?.enabled === false}
                checked={current.youtube?.androidApp !== false}
                onChange={(e) => updateYoutube('androidApp', e.target.checked)}
                className="w-4 h-4 rounded text-red-500 accent-red-600 cursor-pointer disabled:opacity-40"
              />
              <TabletSmartphone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium">Android App (Native APK)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
