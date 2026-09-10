import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type Problem = {
  id: string;
  title: string;
  public_id: string;
  domain: string;
  stage: string;
  verification?: string;
  public_latitude?: number | null;
  public_longitude?: number | null;
};

type Position = { lat: number; lng: number } | null;

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

export function ProblemMap({ problems, devicePosition, onProblemSelect }: { problems: Problem[]; devicePosition: Position; onProblemSelect?: (problem: Problem) => void }) {
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container.current) return;
    let disposed = false;
    let map: import("leaflet").Map | null = null;
    let observer: ResizeObserver | null = null;

    void import("leaflet").then((L) => {
      if (disposed || !container.current) return;
      // These coordinates are the public problem coordinates stored with the
      // challenge. The reporter's device position is deliberately excluded.
      const markers = problems.filter((problem) =>
        ["community_verified", "officially_verified"].includes(problem.verification ?? "") &&
        Number.isFinite(Number(problem.public_latitude)) && Number.isFinite(Number(problem.public_longitude)),
      );
      map = L.map(container.current, { scrollWheelZoom: true, zoomControl: true }).setView([20.5937, 78.9629], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const points: [number, number][] = markers.map((problem) => [Number(problem.public_latitude), Number(problem.public_longitude)]);
      const problemLayer = L.layerGroup().addTo(map);
      const drawProblemMarkers = () => {
        problemLayer.clearLayers();
        // At wider zoom levels, nearby reports are grouped into one tappable
        // marker. Zooming in reveals individual public problem pins.
        const clustered = map!.getZoom() < 12;
        const groups = new Map<string, Problem[]>();
        markers.forEach((problem) => {
          const lat = Number(problem.public_latitude), lng = Number(problem.public_longitude);
          const key = clustered ? `${lat.toFixed(2)}:${lng.toFixed(2)}` : problem.id;
          groups.set(key, [...(groups.get(key) ?? []), problem]);
        });
        groups.forEach((group) => {
          const first = group[0]!;
          const lat = Number(first.public_latitude), lng = Number(first.public_longitude);
          if (group.length > 1) {
            const clusterIcon = L.divIcon({ className: "", html: `<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#168A45;color:white;border:3px solid white;font-weight:700;box-shadow:0 2px 7px rgba(15,35,23,.35)">${group.length}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] });
            L.marker([lat, lng], { icon: clusterIcon }).bindPopup(`<strong>${group.length} verified problems nearby</strong><br/><small>Tap the map controls to zoom in and inspect each problem.</small>`).on("click", () => map!.setView([lat, lng], Math.min(map!.getZoom() + 3, 18))).addTo(problemLayer);
            return;
          }
          const color = first.stage === "impact" ? "#0B5D2A" : "#168A45";
          const icon = L.divIcon({ className: "", html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 5px rgba(15,23,42,.35)"></span>`, iconSize: [20, 20], iconAnchor: [10, 10] });
          const marker = L.marker([lat, lng], { icon }).bindPopup(`<strong>${escapeHtml(first.title)}</strong><br/><small>${escapeHtml(first.public_id)} | ${escapeHtml(first.domain)}<br/>${escapeHtml(first.stage.replaceAll("_", " "))}</small>`).addTo(problemLayer);
          marker.on("click", () => onProblemSelect?.(first));
        });
      };
      drawProblemMarkers();
      map.on("zoomend", drawProblemMarkers);
      /*for (const problem of markers) {
        const lat = Number(problem.public_latitude);
        const lng = Number(problem.public_longitude);
        points.push([lat, lng]);
        const color = problem.stage === "impact" ? "#0B5D2A" : "#168A45";
        const icon = L.divIcon({
          className: "",
          html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 5px rgba(15,23,42,.35)"></span>`,
          iconSize: [20, 20], iconAnchor: [10, 10],
        });
        const marker = L.marker([lat, lng], { icon })
          .bindPopup(`<strong>${escapeHtml(problem.title)}</strong><br/><small>${escapeHtml(problem.public_id)} | ${escapeHtml(problem.domain)}<br/>${escapeHtml(problem.stage.replaceAll("_", " "))}</small>`)
          .addTo(map);
        marker.on("click", () => onProblemSelect?.(problem));
      }*/

      if (devicePosition) {
        const icon = L.divIcon({
          className: "",
          html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#168A45;border:4px solid white;box-shadow:0 0 0 5px rgba(22,138,69,.22),0 1px 5px rgba(15,35,23,.35)"></span>',
          iconSize: [26, 26], iconAnchor: [13, 13],
        });
        L.marker([devicePosition.lat, devicePosition.lng], { icon }).bindPopup("<strong>You are here</strong><br/><small>Your live device location is visible only on this device.</small>").addTo(map);
      }

      if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 14 });
      else if (points.length === 1) map.setView(points[0]!, 13);
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(container.current);
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [problems, devicePosition, onProblemSelect]);

  return <div ref={container} className="h-80 w-full overflow-hidden rounded-2xl" aria-label="Interactive problem map" />;
}
