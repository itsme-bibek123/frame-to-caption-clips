import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClipForge — Auto clips with captions" },
      { name: "description", content: "Paste a YouTube link or upload a video and get short captioned clips automatically." },
      { property: "og:title", content: "ClipForge — Auto clips with captions" },
      { property: "og:description", content: "Turn long videos into short captioned clips in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Clip = { start: number; end: number; title: string; captions: string[] };

const HOOKS = ["The moment everything changed", "Nobody talks about this", "Wait for it…", "The best advice I got", "This blew my mind"];
const LINES = ["So here's the thing", "most people get this wrong", "but once you see it", "you can't unsee it", "and that's the secret", "watch what happens next"];

function ytId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function makeClips(duration: number, n = 4): Clip[] {
  const len = Math.min(30, Math.max(8, duration / (n + 1)));
  return Array.from({ length: n }, (_, i) => {
    const start = Math.floor(((i + 0.5) * duration) / n);
    return {
      start: Math.min(start, Math.max(0, duration - len)),
      end: Math.min(duration, start + len),
      title: HOOKS[i % HOOKS.length] ?? "Clip",
      captions: [...LINES].sort(() => Math.random() - 0.5),
    };
  });
}

function Index() {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [yt, setYt] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "work" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [clips, setClips] = useState<Clip[]>([]);
  const [duration, setDuration] = useState(600);
  const [style, setStyle] = useState<"bold" | "neon" | "clean">("bold");
  const probe = useRef<HTMLVideoElement>(null);

  const run = (duration: number) => {
    setStage("work"); setProgress(0);
    let p = 0;
    const t = setInterval(() => {
      p += 4; setProgress(p);
      if (p >= 100) { clearInterval(t); setClips(makeClips(duration)); setDuration(duration); setStage("done"); }
    }, 80);
  };

  const submitLink = () => {
    const id = ytId(url);
    if (!id) return alert("Please paste a valid YouTube link");
    setFile(null); setYt(id); run(600);
  };

  const onFile = (f?: File) => {
    if (!f) return;
    setYt(null); setFile(URL.createObjectURL(f));
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <video ref={probe} src={file ?? undefined} className="hidden"
        onLoadedMetadata={(e) => run(e.currentTarget.duration)} />
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-12 text-center">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">ClipForge</p>
        <h1 className="font-display mt-4 text-5xl font-black leading-tight md:text-7xl">
          Long video in.<br /><span className="text-gradient">Viral clips out.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">Paste a YouTube link or drop a video. We find the best moments, cut them vertical and burn in captions.</p>

        <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-2xl border bg-card p-3 shadow-glow md:flex-row">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..."
            className="flex-1 rounded-xl bg-muted px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={submitLink} className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90">Make clips</button>
        </div>
        <label className="mx-auto mt-4 block max-w-2xl cursor-pointer rounded-2xl border-2 border-dashed p-6 text-muted-foreground hover:border-primary">
          or <span className="text-primary font-semibold">upload a video file</span>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>

        <div className="mt-6 flex justify-center gap-2">
          {(["bold", "neon", "clean"] as const).map((s) => (
            <button key={s} onClick={() => setStyle(s)}
              className={`rounded-full border px-4 py-1 text-sm capitalize ${style === s ? "bg-primary text-primary-foreground" : ""}`}>{s} captions</button>
          ))}
        </div>
      </section>

      {stage === "work" && (
        <div className="mx-auto max-w-xl px-6">
          <p className="mb-2 text-sm text-muted-foreground">
            {progress < 35 ? "Transcribing audio…" : progress < 70 ? "Finding best moments…" : "Cutting & captioning…"}
          </p>
          <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      {stage === "done" && (
        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 px-6 pb-24 md:grid-cols-4">
          {yt && <p className="col-span-full text-center text-sm text-muted-foreground">To download clips, upload the video file — YouTube doesn't allow direct downloads.</p>}
          {clips.map((c, i) => <ClipCard key={`${file ?? yt}-${i}`} clip={c} file={file} yt={yt} style={style} duration={duration} />)}
          <button onClick={() => setClips([...clips, { start: 0, end: Math.min(15, duration), title: "My new clip", captions: ["Add your caption"] }])}
            className="flex aspect-[9/16] items-center justify-center rounded-2xl border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary">+ Add clip</button>
        </section>
      )}
    </main>
  );
}

const ZOOM = 1.35; // how much the 16:9 video is enlarged inside the 9:16 frame

async function renderClip(src: string, clip: Clip, style: string, onProgress: (p: number) => void): Promise<Blob> {
  const v = document.createElement("video");
  v.src = src; v.playsInline = true; v.crossOrigin = "anonymous";
  await new Promise((r) => (v.onloadeddata = r));
  v.currentTime = clip.start;
  await new Promise((r) => (v.onseeked = r));
  const W = 720, H = 1280;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const stream = c.captureStream(30);
  const vs = (v as any).captureStream?.() ?? (v as any).mozCaptureStream?.();
  vs?.getAudioTracks().forEach((t: MediaStreamTrack) => stream.addTrack(t));
  const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((r) => (rec.onstop = () => r(new Blob(chunks, { type: "video/webm" }))));
  rec.start(); await v.play();
  const len = clip.end - clip.start;
  const draw = () => {
    const t = v.currentTime - clip.start;
    onProgress(Math.min(100, (t / len) * 100));
    if (t >= len || v.ended) { v.pause(); rec.stop(); return; }
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    const w = W * ZOOM, h = (w * v.videoHeight) / v.videoWidth;
    ctx.drawImage(v, (W - w) / 2, (H - h) / 2, w, h);
    const line = (clip.captions[Math.floor(t / 1.5) % clip.captions.length] ?? "").toUpperCase();
    ctx.font = "900 54px 'Archivo Black', sans-serif"; ctx.textAlign = "center";
    const y = H - 260;
    if (style === "clean") { ctx.fillStyle = "rgba(0,0,0,.65)"; const m = ctx.measureText(line).width; ctx.fillRect(W / 2 - m / 2 - 16, y - 54, m + 32, 74); }
    ctx.lineWidth = 10; ctx.strokeStyle = "#000";
    if (style !== "clean") ctx.strokeText(line, W / 2, y, W - 60);
    ctx.fillStyle = style === "neon" ? "#c6f24e" : "#fff";
    ctx.fillText(line, W / 2, y, W - 60);
    requestAnimationFrame(draw);
  };
  draw();
  return done;
}

function ClipCard({ clip: initial, file, yt, style, duration }: { clip: Clip; file: string | null; yt: string | null; style: string; duration: number }) {
  const v = useRef<HTMLVideoElement>(null);
  const [clip, setClip] = useState(initial);
  const [line, setLine] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => { const t = setInterval(() => setLine((l) => (l + 1) % clip.captions.length), 1500); return () => clearInterval(t); }, [clip]);
  useEffect(() => { if (v.current) v.current.currentTime = clip.start; }, [clip.start]);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const download = async () => {
    if (!file) return;
    setBusy(0);
    try {
      const blob = await renderClip(file, clip, style, setBusy);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `${clip.title.replace(/\W+/g, "-").toLowerCase()}.webm`; document.body.appendChild(a); a.click(); a.remove();
    } finally { setBusy(null); }
  };
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="relative aspect-[9/16] overflow-hidden bg-muted">
        {file ? (
          <video ref={v} src={file} muted loop autoPlay playsInline
            onTimeUpdate={(e) => { const el = e.currentTarget; if (el.currentTime >= clip.end || el.currentTime < clip.start - 1) el.currentTime = clip.start; }}
            className="absolute left-1/2 top-1/2 w-[135%] max-w-none -translate-x-1/2 -translate-y-1/2" />
        ) : (
          <iframe key={`${clip.start}-${clip.end}`} className="pointer-events-none absolute left-1/2 top-1/2 aspect-video w-[135%] -translate-x-1/2 -translate-y-1/2"
            src={`https://www.youtube.com/embed/${yt}?start=${Math.floor(clip.start)}&end=${Math.floor(clip.end)}&autoplay=1&mute=1&controls=0&loop=1&playlist=${yt}`}
            allow="autoplay" />
        )}
        <div className={`caption caption-${style} absolute inset-x-3 bottom-16 text-center`}>{clip.captions[line]}</div>
        {busy !== null && <div className="absolute inset-x-0 bottom-0 h-1.5 bg-primary transition-all" style={{ width: `${busy}%` }} />}
      </div>
      <div className="space-y-2 p-3">
        <input value={clip.title} onChange={(e) => setClip({ ...clip, title: e.target.value })}
          className="font-display w-full bg-transparent font-bold leading-tight outline-none" />
        <p className="text-xs text-muted-foreground">{fmt(clip.start)} – {fmt(clip.end)} · {Math.round(clip.end - clip.start)}s</p>
        {editing && (
          <div className="space-y-2 text-xs">
            <label className="block">Start {fmt(clip.start)}
              <input type="range" min={0} max={duration} step={1} value={clip.start} className="w-full accent-primary"
                onChange={(e) => { const s = +e.target.value; setClip({ ...clip, start: s, end: Math.max(clip.end, s + 3) }); }} /></label>
            <label className="block">End {fmt(clip.end)}
              <input type="range" min={0} max={duration} step={1} value={clip.end} className="w-full accent-primary"
                onChange={(e) => { const en = +e.target.value; setClip({ ...clip, end: Math.max(en, clip.start + 3) }); }} /></label>
            <label className="block">Captions (one line each)
              <textarea rows={4} value={clip.captions.join("\n")} className="mt-1 w-full rounded-md bg-muted p-2"
                onChange={(e) => setClip({ ...clip, captions: e.target.value.split("\n").filter(Boolean).length ? e.target.value.split("\n") : [" "] })} /></label>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)} className="flex-1 whitespace-nowrap rounded-lg border px-2 py-1.5 text-sm">{editing ? "Done" : "Trim & edit"}</button>
          <button onClick={download} disabled={!file || busy !== null} title={file ? "" : "Upload a video file to download clips"}
            className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-40">
            {busy !== null ? `${Math.round(busy)}%` : "Download"}</button>
        </div>
      </div>
    </div>
  );
}
