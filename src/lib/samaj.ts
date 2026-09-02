import { supabase } from "@/integrations/supabase/client";

export const CATEGORIES = [
  "Water & Sanitation",
  "Roads & Infrastructure",
  "Electricity & Energy",
  "Waste Management",
  "Health",
  "Education",
  "Public Safety",
  "Environment",
  "Other",
] as const;

export const DISTRICTS = [
  "Ranchi",
  "East Singhbhum",
  "Dhanbad",
  "Bokaro",
  "Hazaribagh",
  "Deoghar",
  "Giridih",
  "Palamu",
  "Other",
] as const;

export const ORG_TYPES = [
  "University",
  "College",
  "Polytechnic",
  "NGO",
  "Government Department",
  "MSME / Industry",
  "Community Group",
] as const;

export const PROBLEM_STATUS_FLOW = [
  { key: "reported", label: "Citizen report" },
  { key: "assigned", label: "Institution / NGO assigned" },
  { key: "in_progress", label: "Tasks assigned & work in progress" },
  { key: "verification", label: "SPO verification" },
  { key: "resolved", label: "Resolved" },
] as const;

export const STATUS_LABEL: Record<string, string> = {
  reported: "Reported",
  assigned: "Assigned",
  in_progress: "In progress",
  verification: "Under verification",
  resolved: "Resolved",
  escalated: "Escalated / re-routing",
};

export const STATUS_TONE: Record<string, string> = {
  reported: "bg-amber-100 text-amber-900",
  assigned: "bg-sky-100 text-sky-900",
  in_progress: "bg-indigo-100 text-indigo-900",
  verification: "bg-violet-100 text-violet-900",
  resolved: "bg-emerald-100 text-emerald-900",
  escalated: "bg-rose-100 text-rose-900",
};

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export type MediaItem = { path: string; type: string; name: string };

export async function uploadMedia(files: File[], folder: string): Promise<MediaItem[]> {
  const out: MediaItem[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const { error } = await supabase.storage
      .from("media")
      .upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (error) throw error;
    out.push({ path, type: file.type || "application/octet-stream", name: file.name });
  }
  return out;
}

export async function signedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("media").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not supported on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.message || "Location permission denied")),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  });
}

/** Skill / expertise overlap score used for escalation re-routing recommendations. */
export function matchScore(
  problem: { category: string; district: string | null; lat: number | null; lng: number | null },
  org: {
    expertise: string[] | null;
    district: string;
    lat: number | null;
    lng: number | null;
  },
): number {
  let score = 0;
  const expertise = (org.expertise ?? []).map((e) => e.toLowerCase());
  if (expertise.some((e) => e === problem.category.toLowerCase())) score += 60;
  else if (expertise.some((e) => problem.category.toLowerCase().includes(e.split(" ")[0] ?? "")))
    score += 30;
  if (problem.district && org.district === problem.district) score += 25;
  if (problem.lat != null && problem.lng != null && org.lat != null && org.lng != null) {
    const d = distanceKm(
      { lat: problem.lat, lng: problem.lng },
      { lat: org.lat, lng: org.lng },
    );
    score += Math.max(0, 15 - d / 10);
  }
  return Math.round(score);
}

export async function logEvent(problemId: string, event: string, detail?: string) {
  await supabase.from("problem_events").insert({
    problem_id: problemId,
    event,
    ...(detail ? { detail } : {}),
  });
}
