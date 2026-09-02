import { useEffect, useState } from "react";
import { LocateFixed, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  distanceKm,
  getPosition,
  logEvent,
  uploadMedia,
  type MediaItem,
} from "@/lib/samaj";
import { Field, MediaPicker, StatusBadge, inputClass } from "@/components/samaj";

export type ProblemRow = {
  id: string;
  public_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  district: string | null;
  location_text: string | null;
  lat: number | null;
  lng: number | null;
  affected_count: number;
  created_at: string;
};

export function NearbyProblems({ limit, radiusKm = 25 }: { limit?: number; radiusKm?: number }) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ProblemRow[]>([]);
  const [support, setSupport] = useState<ProblemRow | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("problems")
      .select(
        "id,public_id,title,description,category,status,district,location_text,lat,lng,affected_count,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as ProblemRow[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const locate = async () => {
    setLocating(true);
    setError("");
    try {
      setPos(await getPosition());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to read your location");
    }
    setLocating(false);
  };

  const withDistance = rows
    .map((r) => ({
      row: r,
      km:
        pos && r.lat != null && r.lng != null
          ? distanceKm(pos, { lat: r.lat, lng: r.lng })
          : null,
    }))
    .filter((r) => (pos ? r.km !== null && r.km <= radiusKm : true))
    .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
  const shown = limit ? withDistance.slice(0, limit) : withDistance;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={locate}
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-bold text-white"
        >
          <LocateFixed size={16} /> {locating ? "Locating…" : "Use my location"}
        </button>
        {pos && (
          <span className="text-xs text-muted-foreground">
            Showing problems within {radiusKm} km of {pos.lat.toFixed(3)}, {pos.lng.toFixed(3)}
          </span>
        )}
        {!pos && !error && (
          <span className="text-xs text-muted-foreground">
            Allow location access to see problems reported around you.
          </span>
        )}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No problems found here yet. Be the first to report one.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map(({ row, km }) => (
            <li key={row.id} className="card-surface flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <a
                  href={`/?track=${row.public_id}`}
                  className="font-display font-bold text-ink hover:text-primary"
                >
                  {row.title}
                </a>
                <StatusBadge status={row.status} />
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{row.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} /> {row.location_text || row.district || "Location pending"}
                </span>
                {km != null && <span className="font-bold text-primary">{km.toFixed(1)} km away</span>}
                <span className="inline-flex items-center gap-1">
                  <Users size={13} /> {row.affected_count} affected
                </span>
                <span className="rounded bg-surface px-2 py-0.5">{row.category}</span>
                <span className="font-mono">{row.public_id}</span>
              </div>
              <button
                onClick={() => setSupport(row)}
                className="mt-1 self-start rounded-lg border border-primary px-3 py-1.5 text-xs font-bold text-primary"
              >
                I am also affected
              </button>
            </li>
          ))}
        </ul>
      )}

      {support && (
        <SupportDialog
          problem={support}
          close={() => setSupport(null)}
          done={() => {
            setSupport(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

export function SupportDialog({
  problem,
  close,
  done,
}: {
  problem: ProblemRow;
  close: () => void;
  done: () => void;
}) {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      let media: MediaItem[] = [];
      if (files.length) media = await uploadMedia(files, `supports/${problem.id}`);
      const { error: insertError } = await supabase.from("problem_supports").insert({
        problem_id: problem.id,
        comment: comment.trim() || null,
        supporter_name: name.trim() || null,
        media: media as unknown as never,
      });
      if (insertError) throw insertError;
      await supabase
        .from("problems")
        .update({ affected_count: problem.affected_count + 1, updated_at: new Date().toISOString() })
        .eq("id", problem.id);
      await logEvent(problem.id, "Additional citizen affected", comment.trim() || undefined);
      done();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record your support");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={close}>
      <div
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="font-display text-lg font-bold">I am also affected</h2>
          <p className="text-sm text-muted-foreground">
            Supporting <span className="font-mono">{problem.public_id}</span> — {problem.title}. This
            avoids a duplicate report and raises the priority of the existing one.
          </p>
        </div>
        <Field label="Your name (optional)">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Comment / how it affects you">
          <textarea
            rows={3}
            className={inputClass}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>
        <MediaPicker files={files} setFiles={setFiles} label="Supporting photos / videos" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={close} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Confirm support"}
          </button>
        </div>
      </div>
    </div>
  );
}
