"use client";

/**
 * Floating SOS / Darurat button — fixed bottom-right, visible to all roles.
 * Features:
 * - Live camera viewfinder (getUserMedia, rear camera preferred)
 * - Timestamp + "LAPORAN DARURAT" watermark burned into photo via Canvas
 * - Preview before confirming
 * - GPS tagging
 * - Fallback to file-input if getUserMedia not supported
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Siren, MapPin, Camera, CheckCircle, Loader2, X,
  RefreshCw, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Live timestamp display in viewfinder ─────────────────────────────────────
function LiveTimestamp({ coords }: { coords: { lat: number; lng: number } | null }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const ts = now.toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div className="bg-black/60 rounded-lg px-3 py-1.5 space-y-0.5">
      <p className="text-white text-[11px] font-mono leading-tight">{ts}</p>
      {coords && (
        <p className="text-yellow-300 text-[10px] font-mono leading-tight">
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}

// ─── Camera Modal ─────────────────────────────────────────────────────────────
function CameraModal({
  coords,
  onCapture,
  onClose,
}: {
  coords: { lat: number; lng: number } | null;
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const [preview,   setPreview]   = useState<string | null>(null);
  const [camError,  setCamError]  = useState(false);
  const [facingEnv, setFacingEnv] = useState(true);   // true = rear camera

  // Start camera stream
  const startStream = useCallback(async (env: boolean) => {
    // Stop any existing stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: env ? "environment" : "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCamError(false);
    } catch {
      setCamError(true);
    }
  }, []);

  useEffect(() => {
    startStream(true);
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flipCamera() {
    const next = !facingEnv;
    setFacingEnv(next);
    startStream(next);
  }

  // ── Capture frame + burn timestamp watermark ──────────────────────────────
  function capture() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const W = video.videoWidth  || 1280;
    const H = video.videoHeight || 720;
    canvas.width  = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d")!;

    // 1. Draw video frame
    ctx.drawImage(video, 0, 0, W, H);

    // 2. Watermark bar at bottom
    const barH   = Math.max(56, Math.floor(H * 0.1));
    const fs     = Math.max(14, Math.floor(barH * 0.3));
    const fsSub  = Math.max(11, Math.floor(barH * 0.22));

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, H - barH, W, barH);

    // 3. "🚨 LAPORAN DARURAT" label
    ctx.font      = `bold ${fs}px sans-serif`;
    ctx.fillStyle = "#ff4444";
    ctx.fillText("🚨 LAPORAN DARURAT", 16, H - barH + fs + 4);

    // 4. Timestamp
    const now = new Date();
    const ts  = now.toLocaleString("id-ID", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    ctx.font      = `${fsSub}px monospace`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(ts, 16, H - barH + fs + fsSub + 8);

    // 5. GPS if available
    if (coords) {
      const gps = `📍 ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      ctx.font      = `${fsSub}px monospace`;
      ctx.fillStyle = "#ffdd00";
      const gpsW = ctx.measureText(gps).width;
      ctx.fillText(gps, W - gpsW - 16, H - barH + fs + 8);
    }

    // 6. Thin red top border accent
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(0, 0, W, 4);

    // Stop stream & show preview
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setPreview(canvas.toDataURL("image/jpeg", 0.88));
  }

  function retake() {
    setPreview(null);
    startStream(facingEnv);
  }

  function confirmCapture() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `darurat-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
      onClose();
    }, "image/jpeg", 0.88);
  }

  // Fallback: native file input (for browsers blocking getUserMedia)
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Stamp timestamp on file input image too
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const W = img.width, H = img.height;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const barH = Math.max(56, Math.floor(H * 0.1));
      const fs   = Math.max(14, Math.floor(barH * 0.3));
      const fsSub= Math.max(11, Math.floor(barH * 0.22));
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, H - barH, W, barH);
      ctx.font = `bold ${fs}px sans-serif`;
      ctx.fillStyle = "#ff4444";
      ctx.fillText("🚨 LAPORAN DARURAT", 16, H - barH + fs + 4);
      const ts = new Date().toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
      ctx.font = `${fsSub}px monospace`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(ts, 16, H - barH + fs + fsSub + 8);
      ctx.fillStyle = "#ef4444"; ctx.fillRect(0,0,W,4);
      setPreview(canvas.toDataURL("image/jpeg", 0.88));
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    img.src = URL.createObjectURL(file);
  }

  return (
    <div className="fixed inset-0 bg-black z-[110] flex flex-col">
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0">
        <div className="flex items-center gap-2 text-white">
          <Camera className="h-4 w-4" />
          <span className="text-sm font-bold">Foto Darurat</span>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Viewfinder / Preview */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {preview ? (
          // ── Preview mode ─────────────────────────────────────────────────
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="w-full h-full object-contain" />
        ) : camError ? (
          // ── Camera error fallback ─────────────────────────────────────────
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <Camera className="h-12 w-12 text-white/30" />
            <p className="text-white/60 text-sm">Kamera tidak dapat diakses.<br />Pilih foto dari galeri.</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="text-white border-white/30 bg-white/10">
              Pilih dari Galeri
            </Button>
          </div>
        ) : (
          // ── Live viewfinder ───────────────────────────────────────────────
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Red corner overlay */}
            <div className="absolute inset-0 border-4 border-red-600/40 pointer-events-none" />
            {/* Timestamp watermark preview */}
            <div className="absolute bottom-4 left-4">
              <LiveTimestamp coords={coords} />
            </div>
            {/* Flip camera button */}
            <button
              onClick={flipCamera}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black shrink-0 px-6 py-5">
        {preview ? (
          <div className="flex gap-3">
            <button
              onClick={retake}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/20 text-white text-sm font-medium hover:bg-white/5 active:scale-95 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              Ulangi
            </button>
            <button
              onClick={confirmCapture}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95 transition-all"
            >
              <CheckCircle className="h-4 w-4" />
              Gunakan Foto
            </button>
          </div>
        ) : !camError ? (
          <div className="flex items-center justify-center gap-6">
            {/* File input fallback */}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white/60 hover:text-white hover:border-white/60"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />

            {/* Shutter button */}
            <button
              onClick={capture}
              className="w-18 h-18 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform shadow-lg"
              style={{ width: "72px", height: "72px" }}
            >
              <div className="w-16 h-16 rounded-full border-4 border-gray-300 bg-red-500 hover:bg-red-600 transition-colors" />
            </button>

            {/* Spacer */}
            <div className="w-10" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── SOS Modal ────────────────────────────────────────────────────────────────
function SOSModal({
  pengirimDefault,
  onClose,
}: {
  pengirimDefault: string;
  onClose: () => void;
}) {
  const [isi,        setIsi]        = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords,     setCoords]     = useState<{ lat: number; lng: number } | null>(null);
  const [fotoUrl,    setFotoUrl]    = useState("");
  const [fotoName,   setFotoName]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [showCam,    setShowCam]    = useState(false);
  const [uploading,  setUploading]  = useState(false);

  async function getGPS() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsLoading(false); },
      ()  => setGpsLoading(false),
      { timeout: 8000 },
    );
  }

  async function uploadFile(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "keluhan");
    const res  = await fetch("/api/v1/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.success) {
      setFotoUrl(json.url);
      setFotoName(file.name);
    }
    setUploading(false);
  }

  async function handleSubmit() {
    if (!isi.trim()) return;
    setSubmitting(true);
    await fetch("/api/v1/keluhan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pengirim:  pengirimDefault || "Warga",
        kategori:  "DARURAT",
        judul:     "🚨 DARURAT / SOS",
        isi:       isi.trim(),
        isUrgent:  true,
        fotoUrl:   fotoUrl || null,
        latitude:  coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        force:     true,
      }),
    });
    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="font-bold text-lg">Laporan Terkirim!</h3>
          <p className="text-sm text-muted-foreground">
            Pengurus RT sudah diberitahu. Tetap tenang dan tunggu respons.
          </p>
          <Button className="w-full" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* SOS Form modal */}
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
          {/* Red header */}
          <div className="bg-red-600 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Siren className="h-5 w-5" />
              <span className="font-bold text-lg">LAPORAN DARURAT</span>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Jelaskan situasi darurat. Laporan ini langsung ditandai{" "}
              <strong className="text-red-600">URGENT</strong> dan pengurus RT akan segera merespons.
            </p>

            <textarea
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              rows={4}
              className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="Contoh: Ada kebakaran di rumah No. 12, api sudah besar..."
              autoFocus
            />

            {/* GPS + Camera row */}
            <div className="flex gap-2">
              {/* GPS */}
              {coords ? (
                <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl flex-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="flex-1 rounded-xl" onClick={getGPS} disabled={gpsLoading}>
                  {gpsLoading
                    ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    : <MapPin className="h-3.5 w-3.5 mr-1.5" />}
                  {gpsLoading ? "Mencari..." : "Tandai Lokasi"}
                </Button>
              )}

              {/* Camera button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`rounded-xl px-3 ${fotoUrl ? "border-green-400 text-green-700 bg-green-50" : ""}`}
                onClick={() => setShowCam(true)}
                disabled={uploading}
              >
                {uploading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Camera className="h-3.5 w-3.5" />}
                {fotoUrl && <span className="ml-1 text-[10px]">✓</span>}
              </Button>
            </div>

            {/* Photo preview strip */}
            {fotoUrl && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoUrl} alt="foto" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-800">Foto siap dikirim</p>
                  <p className="text-[10px] text-green-600 truncate">{fotoName}</p>
                </div>
                <button onClick={() => { setFotoUrl(""); setFotoName(""); }} className="text-green-500 hover:text-red-500 shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white h-11 text-base font-semibold rounded-xl"
              onClick={handleSubmit}
              disabled={submitting || !isi.trim()}
            >
              {submitting
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Siren className="h-4 w-4 mr-2" />}
              Kirim Laporan Darurat
            </Button>
          </div>
        </div>
      </div>

      {/* Camera overlay — rendered on top of SOS modal */}
      {showCam && (
        <CameraModal
          coords={coords}
          onCapture={uploadFile}
          onClose={() => setShowCam(false)}
        />
      )}
    </>
  );
}

// ─── Floating button ───────────────────────────────────────────────────────────
export function SOSFloatingButton() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  if (!session) return null;

  return (
    <>
      {/* Floating pill */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[76px] right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-3 rounded-full shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95"
        aria-label="Tombol Darurat SOS"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
        </span>
        <Siren className="h-5 w-5" />
        <span className="text-sm">DARURAT</span>
      </button>

      {open && (
        <SOSModal
          pengirimDefault={session.user?.name ?? "Warga"}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
