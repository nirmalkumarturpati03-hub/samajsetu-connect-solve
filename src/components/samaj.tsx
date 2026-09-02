import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, FileText, LogOut, Menu, Paperclip, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl, STATUS_LABEL, STATUS_TONE, type MediaItem } from "@/lib/samaj";
import type { Session } from "@supabase/supabase-js";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready };
}

export function Shell({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const nav = (
    <>
      <a href="/?view=problems" className="hover:text-primary">
        Nearby problems
      </a>
      <a href="/?view=track" className="hover:text-primary">
        Track a report
      </a>
      {session ? (
        <>
          <a href="/?view=dashboard" className="hover:text-primary">
            SPO dashboard
          </a>
          <button
            onClick={() => supabase.auth.signOut()}
            className="inline-flex items-center gap-1 hover:text-primary"
          >
            <LogOut size={14} /> Sign out
          </button>
        </>
      ) : (
        <a href="/?view=auth" className="hover:text-primary">
          Organisation login
        </a>
      )}
      <a
        href="/?view=report"
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
      >
        Report a problem
      </a>
    </>
  );
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between">
          <a href="/" className="font-display text-xl font-bold text-primary">
            SamajSetu
          </a>
          <nav className="hidden items-center gap-5 text-sm font-semibold md:flex">{nav}</nav>
          <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <nav className="flex flex-col gap-3 border-t border-border px-5 py-4 text-sm font-semibold md:hidden">
            {nav}
          </nav>
        )}
      </header>
      {children}
      <footer className="border-t border-border bg-surface">
        <div className="container-page flex flex-col gap-1 py-8 text-xs text-muted-foreground">
          <p className="font-display text-sm font-bold text-ink">SamajSetu</p>
          <p>Connecting Community Problems with Collaborative Solutions.</p>
          <p>Smart India Hackathon 2026 · SIH26043 · Government of Jharkhand · Demo build.</p>
        </div>
      </footer>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[status] ?? "bg-surface text-ink"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

/** File picker with camera capture support. Files are uploaded by the parent on submit. */
export function MediaPicker({
  files,
  setFiles,
  label = "Photos / videos",
}: {
  files: File[];
  setFiles: (f: File[]) => void;
  label?: string;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const add = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).filter((f) => f.size <= 50 * 1024 * 1024);
    setFiles([...files, ...next]);
  };
  return (
    <div className="space-y-2">
      <span className="text-sm font-bold text-ink">{label}</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"
        >
          <Camera size={16} /> Camera
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"
        >
          <Paperclip size={16} /> Choose files
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs"
            >
              <span className="truncate">
                {f.name} · {(f.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="text-destructive"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Up to 50 MB per file.</p>
    </div>
  );
}

export function MediaGallery({ items }: { items: MediaItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((m) => (
        <MediaThumb key={m.path} item={m} />
      ))}
    </div>
  );
}

function MediaThumb({ item }: { item: MediaItem }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    signedUrl(item.path).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [item.path]);
  if (!url)
    return <div className="h-24 w-32 animate-pulse rounded-lg border border-border bg-surface" />;
  if (item.type.startsWith("image/"))
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img
          src={url}
          alt={item.name}
          className="h-24 w-32 rounded-lg border border-border object-cover"
        />
      </a>
    );
  if (item.type.startsWith("video/"))
    return <video src={url} controls className="h-24 w-32 rounded-lg border border-border" />;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex h-24 w-32 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface p-2 text-center text-xs"
    >
      <FileText size={18} /> <span className="truncate w-full">{item.name}</span>
    </a>
  );
}
