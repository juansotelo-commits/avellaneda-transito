'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
if (typeof window !== 'undefined' && (maplibregl as any).setWorkerUrl) { (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs'); }
import { LIVE_KIND_LABELS, TRAFFIC_COLOR_MAP, type CorridorDTO, type IncidentDTO, type LiveIncidentDTO, type SignalDTO } from '@/types/traffic';
import { AVELLANEDA_CENTER } from '@/lib/avellaneda-network';

interface TrafficMapProps {
  corridors: CorridorDTO[]; signals: SignalDTO[]; incidents: IncidentDTO[];
  showSignals: boolean; pickLocationMode: boolean; pickedCoords: { lat: number; lng: number } | null;
  onSelectSignal: (signal: SignalDTO) => void; onSelectIncident: (incident: IncidentDTO) => void;
  onPickLocation: (coords: { lat: number; lng: number }) => void; focusCoords?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  searchPlace?: { lat: number; lng: number; label: string } | null;
  liveIncidents?: LiveIncidentDTO[]; showLive?: boolean;
}

function liveColor(inc: LiveIncidentDTO) {
  if (inc.kind === 'CORTE') return '#18181b';
  if (inc.kind === 'OBRA' || inc.kind === 'CARRIL_CERRADO') return '#7c3aed';
  if (inc.kind === 'ACCIDENTE' || inc.severity === 3) return '#dc2626';
  if (inc.severity === 2) return '#f97316';
  return '#eab308';
}

function livePopupContent(p: Record<string, unknown>) {
  const root = document.createElement('div');
  root.className = 'live-popup';
  const title = document.createElement('p');
  title.className = 'live-popup__title';
  title.textContent = String(p.title ?? 'Incidente');
  root.appendChild(title);
  const lines = [
    p.description && p.description !== p.title ? String(p.description) : null,
    p.from ? `${p.from}${p.to ? ` → ${p.to}` : ''}` : null,
    typeof p.delayMinutes === 'number' && p.delayMinutes > 0 ? `Demora estimada: ${p.delayMinutes} min` : null,
  ].filter(Boolean) as string[];
  for (const text of lines) {
    const el = document.createElement('p');
    el.textContent = text;
    root.appendChild(el);
  }
  const source = document.createElement('p');
  source.className = 'live-popup__source';
  source.textContent = 'Fuente: TomTom (en vivo)';
  root.appendChild(source);
  return root;
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
  liveIncidents = [], showLive = true,
}: TrafficMapProps) {
  const pickModeRef = useRef(pickLocationMode);
  useEffect(() => { pickModeRef.current = pickLocationMode; }, [pickLocationMode]);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const pickMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const emptyCollection: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
  const corridorsDataRef = useRef<GeoJSON.FeatureCollection>(emptyCollection);
  const liveDataRef = useRef<GeoJSON.FeatureCollection>(emptyCollection);

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
      map.addSource('avellaneda-corridors', { type: 'geojson', data: corridorsDataRef.current });
      map.addLayer({ id: 'corridors-casing', type: 'line', source: 'avellaneda-corridors', paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.8 } });
      map.addLayer({ id: 'corridors-status', type: 'line', source: 'avellaneda-corridors', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['==', ['get', 'isCabaAccess'], true], 5.5, 4], 'line-opacity': 0.92 } });

      // Incidentes en vivo (TomTom)
      map.addSource('live-traffic', {
        type: 'geojson', data: liveDataRef.current,
        attribution: 'Tránsito en vivo © TomTom',
      });
      // Borde blanco debajo, para que resalten sobre el mapa.
      map.addLayer({ id: 'live-casing', type: 'line', source: 'live-traffic', filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 7, 14, 9, 17, 13], 'line-opacity': 0.9 } });
      map.addLayer({ id: 'live-lines', type: 'line', source: 'live-traffic', filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 4.5, 14, 6, 17, 9], 'line-opacity': 0.95 } });
      map.addLayer({ id: 'live-points', type: 'circle', source: 'live-traffic', filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-color': ['get', 'color'], 'circle-radius': 7, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });

      const showPopup = (e: maplibregl.MapLayerMouseEvent) => {
        if (pickModeRef.current || !e.features?.length) return;
        new maplibregl.Popup({ closeButton: true, maxWidth: '260px', className: 'live-popup-wrap' })
          .setLngLat(e.lngLat).setDOMContent(livePopupContent(e.features[0].properties ?? {})).addTo(map);
      };
      for (const layer of ['live-lines', 'live-points']) {
        map.on('click', layer, showPopup);
        map.on('mouseenter', layer, () => { if (!pickModeRef.current) map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { if (!pickModeRef.current) map.getCanvas().style.cursor = ''; });
      }
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Los datos se guardan siempre en estas refs. Si las capas todavía no existen,
  // el handler de 'load' los aplica al crearlas; si ya existen, se aplican al instante.
  // (Antes se esperaba un 'load' que a veces ya había ocurrido, y el mapa quedaba sin líneas.)
  useEffect(() => {
    corridorsDataRef.current = {
      type: 'FeatureCollection',
      features: corridors.map((c) => ({
        type: 'Feature',
        properties: { code: c.code, name: c.name, status: c.status, isCabaAccess: c.isCabaAccess, color: TRAFFIC_COLOR_MAP[c.status]?.hex ?? '#64748b' },
        geometry: { type: 'LineString', coordinates: c.coordinates },
      })),
    };
    (mapRef.current?.getSource('avellaneda-corridors') as maplibregl.GeoJSONSource | undefined)?.setData(corridorsDataRef.current);
  }, [corridors]);

  useEffect(() => {
    liveDataRef.current = {
      type: 'FeatureCollection',
      features: (showLive ? liveIncidents : []).map((inc) => ({
        type: 'Feature',
        properties: {
          title: LIVE_KIND_LABELS[inc.kind], description: inc.description, from: inc.from, to: inc.to,
          delayMinutes: inc.delayMinutes, color: liveColor(inc),
        },
        geometry: inc.geometry,
      })),
    };
    (mapRef.current?.getSource('live-traffic') as maplibregl.GeoJSONSource | undefined)?.setData(liveDataRef.current);
  }, [liveIncidents, showLive]);

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
