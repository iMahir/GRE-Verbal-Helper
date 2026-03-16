"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AudioPlayerProps {
  src: string;
  title: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

function fmt(secs: number): string {
  if (!isFinite(secs) || secs < 0) return "--:--";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AudioPlayer({ src, title }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1); // default 1x

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const speed = SPEEDS[speedIdx];

  // ── Wire up audio events ────────────────────────────────────────────────
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onTimeUpdate = () => setCurrentTime(a.currentTime);
    const onDurationChange = () => setDuration(a.duration);
    const onLoadedMetadata = () => { setDuration(a.duration); setLoading(false); };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onProgress = () => {
      if (a.buffered.length > 0) {
        setBuffered((a.buffered.end(a.buffered.length - 1) / (a.duration || 1)) * 100);
      }
    };

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("durationchange", onDurationChange);
    a.addEventListener("loadedmetadata", onLoadedMetadata);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("progress", onProgress);

    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("durationchange", onDurationChange);
      a.removeEventListener("loadedmetadata", onLoadedMetadata);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("progress", onProgress);
    };
  }, []);

  // ── Controls ────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  }, []);

  const skip = useCallback((secs: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + secs));
  }, []);

  const cycleSpeed = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    a.playbackRate = SPEEDS[next];
  }, [speedIdx]);

  // ── Touch/click seek on the track bar ──────────────────────────────────
  const getSeekFraction = (e: React.MouseEvent | React.TouchEvent) => {
    const bar = trackRef.current;
    if (!bar) return null;
    const rect = bar.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleSeekStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const frac = getSeekFraction(e);
      if (frac === null) return;
      const a = audioRef.current;
      if (!a || !isFinite(a.duration)) return;
      a.currentTime = frac * a.duration;
      setCurrentTime(frac * a.duration);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="card p-4 sm:p-5 select-none">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Title */}
      <div className="flex items-start gap-3 mb-4">
        {/* Podcast icon badge */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-400">
            <circle cx="12" cy="12" r="2"/>
            <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Podcast</p>
          <p className="text-sm font-medium text-zinc-200 line-clamp-2 leading-snug">{title}</p>
        </div>
      </div>

      {/* Seek track */}
      <div
        ref={trackRef}
        className="relative h-10 flex items-center cursor-pointer group mb-1"
        onClick={handleSeekStart}
        onTouchStart={handleSeekStart}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label="Seek"
      >
        {/* Track background */}
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          {/* Buffered */}
          <div
            className="absolute h-1.5 bg-zinc-700 rounded-full"
            style={{ width: `${buffered}%` }}
          />
          {/* Played */}
          <div
            className="relative h-1.5 bg-zinc-200 rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Scrub handle */}
        <div
          className="absolute w-4 h-4 bg-zinc-100 rounded-full shadow-md -translate-x-1/2 transition-none pointer-events-none"
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Time stamps */}
      <div className="flex justify-between text-[11px] text-zinc-600 mb-5 px-0.5">
        <span>{fmt(currentTime)}</span>
        <span>{fmt(duration)}</span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between px-1">
        {/* Skip back 30 */}
        <button
          onClick={() => skip(-30)}
          aria-label="Skip back 30 seconds"
          className="w-11 h-11 flex flex-col items-center justify-center rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 active:scale-90 transition-all"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          <span className="text-[9px] leading-none mt-0.5">30</span>
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="w-16 h-16 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:scale-95 transition-all shadow-lg"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
          ) : playing ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}>
              <path d="M5 3l14 9-14 9V3z"/>
            </svg>
          )}
        </button>

        {/* Skip forward 30 */}
        <button
          onClick={() => skip(30)}
          aria-label="Skip forward 30 seconds"
          className="w-11 h-11 flex flex-col items-center justify-center rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 active:scale-90 transition-all"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
          <span className="text-[9px] leading-none mt-0.5">30</span>
        </button>

        {/* Speed */}
        <button
          onClick={cycleSpeed}
          aria-label={`Playback speed ${speed}x`}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-300 text-[13px] font-semibold hover:bg-zinc-700 active:scale-90 transition-all"
        >
          {speed}×
        </button>
      </div>
    </div>
  );
}
