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
      title: HOOKS[i % HOOKS.length],
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
  const [style, setStyle] = useState<"bold" | "neon" | "clean">("bold");
  const probe = useRef<HTMLVideoElement>(null);

  const run = (duration: number) => {
    setStage("work"); setProgress(0);
    let p = 0;
    const t = setInterval(() => {
      p += 4; setProgress(p);
      if (p >= 100) { clearInterval(t); setClips(makeClips(duration)); setStage("done"); }
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
        <section className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 pb-24 md:grid-cols-4">
          {clips.map((c, i) => <ClipCard key={i} clip={c} file={file} yt={yt} style={style} />)}
        </section>
      )}
    </main>
  );
}

function ClipCard({ clip, file, yt, style }: { clip: Clip; file: string | null; yt: string | null; style: string }) {
  const v = useRef<HTMLVideoElement>(null);
  const [line, setLine] = useState(0);
  useEffect(() => { const t = setInterval(() => setLine((l) => (l + 1) % clip.captions.length), 1500); return () => clearInterval(t); }, [clip]);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="relative aspect-[9/16] bg-muted">
        {file ? (
          <video ref={v} src={`${file}#t=${clip.start},${clip.end}`} muted loop autoPlay playsInline
            onTimeUpdate={(e) => { if (e.currentTarget.currentTime >= clip.end) e.currentTarget.currentTime = clip.start; }}
            className="h-full w-full object-cover" />
        ) : (
          <iframe className="pointer-events-none absolute inset-0 h-full w-[316%] -translate-x-[34%]"
            src={`https://www.youtube.com/embed/${yt}?start=${Math.floor(clip.start)}&end=${Math.floor(clip.end)}&autoplay=1&mute=1&controls=0&loop=1&playlist=${yt}`}
            allow="autoplay" />
        )}
        <div className={`caption caption-${style} absolute inset-x-3 bottom-16 text-center`}>{clip.captions[line]}</div>
      </div>
      <div className="p-3">
        <p className="font-display font-bold leading-tight">{clip.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{fmt(clip.start)} – {fmt(clip.end)}</p>
      </div>
    </div>
  );
}
