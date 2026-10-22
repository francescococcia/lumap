"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const POSITRON = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export type MapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string | null;
};

type VenueMapProps = {
  pins: MapPin[];
  center: { lat: number; lng: number };
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

if (typeof document !== "undefined" && !document.getElementById("lumap-pin-css")) {
  const style = document.createElement("style");
  style.id = "lumap-pin-css";
  style.textContent = `
@keyframes lumapPinIn { 0% { transform: translateY(-18px) scale(0.4); opacity: 0 } 60% { transform: translateY(2px) scale(1.12); opacity: 1 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes lumapPulse { 0% { box-shadow: 0 0 0 0 rgba(120,84,246,0.45) } 100% { box-shadow: 0 0 0 16px rgba(120,84,246,0) } }
.lumap-pin { cursor: pointer; }
.lumap-pin-dot { width: 28px; height: 28px; border-radius: 999px; border: 3px solid #fff; color: #fff; font: 600 12px/22px system-ui, sans-serif; text-align: center; box-shadow: 0 4px 12px rgba(32,32,42,0.25); transition: transform .2s ease, background .2s ease; animation: lumapPinIn .55s cubic-bezier(.2,.8,.2,1) both; }
.lumap-pin:hover .lumap-pin-dot { transform: scale(1.15); }
.lumap-pin.is-selected .lumap-pin-dot { background: #7854f6 !important; transform: scale(1.25); animation: lumapPulse 1.4s ease-out infinite; }
`;
  document.head.appendChild(style);
}

function pinColor(status: string | null) {
  return status === "pending" ? "#e39b2b" : "#2faf78";
}

export function VenueMap({ pins, center, selectedId, onSelect }: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const initialCenter = useRef(center);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start = initialCenter.current;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: POSITRON,
      center: [start.lng, start.lat],
      zoom: 11.5,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = pins.map((pin, index) => {
        const el = document.createElement("div");
        el.className = "lumap-pin";
        el.dataset.id = pin.id;
        el.title = pin.name;
        const dot = document.createElement("div");
        dot.className = "lumap-pin-dot";
        dot.textContent = String(index + 1);
        dot.style.background = pinColor(pin.status);
        dot.style.animationDelay = `${index * 0.12}s`;
        el.appendChild(dot);
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectRef.current?.(pin.id);
        });
        return new maplibregl.Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(map);
      });

      if (pins.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        pins.forEach((pin) => bounds.extend([pin.lng, pin.lat]));
        map.fitBounds(bounds, { padding: 72, maxZoom: 14, duration: 700 });
      } else {
        map.easeTo({ center: [center.lng, center.lat], zoom: 12, duration: 700 });
      }
    };

    if (map.loaded()) draw();
    else map.once("load", draw);
  }, [pins, center]);

  useEffect(() => {
    const map = mapRef.current;
    markersRef.current.forEach((marker) => {
      const el = marker.getElement();
      el.classList.toggle("is-selected", el.dataset.id === selectedId);
    });
    const pin = pins.find((item) => item.id === selectedId);
    if (map && pin) {
      map.flyTo({ center: [pin.lng, pin.lat], zoom: 15, offset: [-120, 0], duration: 900, essential: true });
    }
  }, [selectedId, pins]);

  return <div ref={containerRef} className="h-full w-full" />;
}
