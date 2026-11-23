'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
if (typeof window !== 'undefined' && (maplibregl as any).setWorkerUrl) { (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs'); }
import { TRAFFIC_COLOR_MAP, type CorridorDTO, type IncidentDTO, type SignalDTO } from '@/types/traffic';
import { AVELLANEDA_CENTER } from '@/lib/avellaneda-network';

interface TrafficMapProps {
  corridors: CorridorDTO[]; signals: SignalDTO[]; incidents: IncidentDTO[];
  showSignals: boolean; pickLocationMode: boolean; pickedCoords: { lat: number; lng: number } | null;
  onSelectSignal: (signal: SignalDTO) => void; onSelectIncident: (incident: IncidentDTO) => void;
  onPickLocation: (coords: { lat: number; lng: number }) => void; focusCoords?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  searchPlace?: { lat: number; lng: number; label: string } | null;
}

function createUserLocationElement() {
  const el = document.createElement('div');
  el.className = 'user-location';
  el.setAttribute('aria-label', 'Tu ubicación');
  el.innerHTML =
    '<span class="user-location__pulse"></span>' +
    '<span class="user-location__dot"></span>';
  return el;
}

const SIGNAL_COLOR: Record<string, string> = {
  FUNCIONANDO: '#16a34a', APAGADO: '#18181b', TILDADO: '#dc2626', IRREGULAR: '#f97316', SIN_INFORMACION: '#94a3b8',
};

export default function TrafficMap({
  corridors, signals, incidents, showSignals, pickLocationMode, pickedCoords,
  onSelectSignal, onSelectIncident, onPickLocation, focusCoords, userLocation, searchPlace,
}: TrafficMapProps) {
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const pickMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: [AVELLANEDA_CENTER.lng, AVELLANEDA_CENTER.lat], zoom: AVELLANEDA_CENTER.zoom,
      minZoom: 11.5, maxZoom: 18,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      map.addSource('avellaneda-corridors', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'corridors-casing', type: 'line', source: 'avellaneda-corridors', paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.8 } });
      map.addLayer({ id: 'corridors-status', type: 'line', source: 'avellaneda-corridors', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['==', ['get', 'isCabaAccess'], true], 5.5, 4], 'line-opacity': 0.92 } });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateSource = () => {
      const source = map.getSource('avellaneda-corridors') as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData({
        type: 'FeatureCollection',
        features: corridors.map((c) => ({
          type: 'Feature',
          properties: { code: c.code, name: c.name, status: c.status, isCabaAccess: c.isCabaAccess, color: TRAFFIC_COLOR_MAP[c.status]?.hex ?? '#64748b' },
          geometry: { type: 'LineString', coordinates: c.coordinates },
        })),
      });
    };
    if (map.isStyleLoaded()) updateSource(); else map.once('load', updateSource);
  }, [corridors]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (pickLocationMode) onPickLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };
    map.getCanvas().style.cursor = pickLocationMode ? 'crosshair' : '';
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [pickLocationMode, onPickLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pickMarkerRef.current) { pickMarkerRef.current.remove(); pickMarkerRef.current = null; }
    if (pickLocationMode && pickedCoords) {
      pickMarkerRef.current = new maplibregl.Marker({ color: '#2563eb', draggable: true })
        .setLngLat([pickedCoords.lng, pickedCoords.lat])
        .on('dragend', () => {
          const pos = pickMarkerRef.current?.getLngLat();
          if (pos) onPickLocation({ lat: pos.lat, lng: pos.lng });
        }).addTo(map);
    }
  }, [pickLocationMode, pickedCoords, onPickLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    const lngLat: [number, number] = [userLocation.lng, userLocation.lat];
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(lngLat);
    } else {
      userMarkerRef.current = new maplibregl.Marker({ element: createUserLocationElement(), anchor: 'center' })
        .setLngLat(lngLat).addTo(map);
    }
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    searchMarkerRef.current?.remove();
    searchMarkerRef.current = null;
    if (!searchPlace) return;
    const popup = new maplibregl.Popup({ offset: 32, closeButton: false, className: 'search-popup' }).setText(searchPlace.label);
    searchMarkerRef.current = new maplibregl.Marker({ color: '#dc2626' })
      .setLngLat([searchPlace.lng, searchPlace.lat]).setPopup(popup).addTo(map);
    searchMarkerRef.current.togglePopup();
    map.flyTo({ center: [searchPlace.lng, searchPlace.lat], zoom: 17, duration: 800 });
  }, [searchPlace]);

  useEffect(() => {
    if (!mapRef.current || !focusCoords) return;
    mapRef.current.flyTo({ center: [focusCoords.lng, focusCoords.lat], zoom: 15, duration: 700 });
  }, [focusCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (showSignals) {
      for (const sig of signals) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[11px] font-bold text-white cursor-pointer';
        el.style.backgroundColor = SIGNAL_COLOR[sig.status] ?? '#94a3b8';
        el.textContent = '\u{1F6A6}';
        el.title = sig.intersection;
        el.onclick = (e) => { e.stopPropagation(); onSelectSignal(sig); };
        markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([sig.lng, sig.lat]).addTo(map));
      }
    }
    for (const inc of incidents) {
      const isCut = inc.type === 'CALLE_CORTADA' || inc.type === 'AVENIDA_CORTADA';
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'px-2 py-1 rounded-full border-2 border-white shadow-lg text-xs font-extrabold text-white cursor-pointer';
      el.style.backgroundColor = isCut ? '#18181b' : inc.severity >= 3 ? '#dc2626' : '#ea580c';
      el.textContent = isCut ? '\u26D4' : inc.type === 'ANIEGO' ? '\u{1F30A}' : '\u26A0\uFE0F';
      el.onclick = (e) => { e.stopPropagation(); onSelectIncident(inc); };
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([inc.lng, inc.lat]).addTo(map));
    }
  }, [signals, incidents, showSignals, onSelectSignal, onSelectIncident]);

  return <div ref={containerRef} className="w-full h-full" />;
}
