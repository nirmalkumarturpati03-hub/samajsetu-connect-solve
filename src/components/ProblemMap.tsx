import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type Problem = {
  id: string;
  title: string;
  public_id: string;
  domain: string;
  stage: string;
  public_latitude?: number | null;
  public_longitude?: number | null;
};

type Position = { lat: number; lng: number } | null;

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

export function ProblemMap({ problems, devicePosition }: { problems: Problem[]; devicePosition: Position }) {
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container.current) return;
    let disposed = false;
    let map: import("leaflet").Map | null = null;
    let observer: ResizeObserver | null = null;

    void import("leaflet").then((L) => {
      if (disposed || !container.current) return;
      const markers = problems.filter((problem) =>
        Number.isFinite(Number(problem.public_latitude)) && Number.isFinite(Number(problem.public_longitude)),
      );
      map = L.map(container.current, { scrollWheelZoom: true, zoomControl: true }).setView([20.5937, 78.9629], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const points: [number, number][] = [];
      for (const problem of markers) {
        const lat = Number(problem.public_latitude);
        const lng = Number(problem.public_longitude);
        points.push([lat, lng]);
        const color = problem.stage === "impact" ? "#16a34a" : "#2563eb";
        const icon = L.divIcon({
          className: "",
          html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 5px rgba(15,23,42,.35)"></span>`,
          iconSize: [20, 20], iconAnchor: [10, 10],
        });
        L.marker([lat, lng], { icon })
          .bindPopup(`<strong>${escapeHtml(problem.title)}</strong><br/><small>${escapeHtml(problem.public_id)} · ${escapeHtml(problem.domain)}<br/>${escapeHtml(problem.stage.replaceAll("_", " "))}</small>`)
          .addTo(map);
      }

      if (devicePosition) {
        points.push([devicePosition.lat, devicePosition.lng]);
        const icon = L.divIcon({
          className: "",
          html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#0ea5e9;border:4px solid white;box-shadow:0 0 0 5px rgba(14,165,233,.22),0 1px 5px rgba(15,23,42,.35)"></span>',
          iconSize: [26, 26], iconAnchor: [13, 13],
        });
        L.marker([devicePosition.lat, devicePosition.lng], { icon }).bindPopup("<strong>You are here</strong><br/><small>Your live device location is visible only on this device.</small>").addTo(map);
      }

      if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 14 });
      else if (points.length === 1) map.setView(points[0], 13);
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(container.current);
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [problems, devicePosition]);

  return <div ref={container} className="h-80 w-full overflow-hidden rounded-2xl" aria-label="Interactive problem map" />;
}
