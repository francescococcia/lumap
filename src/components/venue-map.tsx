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
};

function pinColor(status: string | null) {
  return status === "pending" ? "#e39b2b" : "#2faf78";
}

export function VenueMap({ pins, center }: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const initialCenter = useRef(center);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start = initialCenter.current;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: POSITRON,
      center: [start.lng, start.lat],
      zoom: 11.5,
      attributionControl: true,
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
      markersRef.current = pins.map((pin) => {
        const dot = document.createElement("div");
        dot.title = pin.name;
        dot.style.width = "16px";
        dot.style.height = "16px";
        dot.style.borderRadius = "999px";
        dot.style.background = pinColor(pin.status);
        dot.style.border = "2px solid #ffffff";
        dot.style.boxShadow = "0 1px 6px rgba(32, 32, 42, 0.25)";
        return new maplibregl.Marker({ element: dot }).setLngLat([pin.lng, pin.lat]).addTo(map);
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

  return <div ref={containerRef} className="h-full w-full" />;
}
