'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
if (typeof window !== 'undefined' && (maplibregl as any).setWorkerUrl) { (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs'); }
import { INCIDENT_LABELS, LIVE_KIND_LABELS, TRAFFIC_COLOR_MAP, type CorridorDTO, type IncidentDTO, type LiveIncidentDTO, type SignalDTO } from '@/types/traffic';
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

function corridorPopupContent(p: Record<string, unknown>) {
  const root = document.createElement('div');
  root.className = 'live-popup';
  const add = (text: string, className?: string) => {
    const el = document.createElement('p');
    if (className) el.className = className;
    el.textContent = text;
    root.appendChild(el);
  };
  add(String(p.name ?? 'Avenida'), 'live-popup__title');
  add(String(p.statusLabel ?? ''));
  const count = Number(p.activeIncidentCount ?? 0);
  add(count > 0 ? `${count} ${count === 1 ? 'reporte activo' : 'reportes activos'} de vecinos` : 'Sin reportes de vecinos');
  if (p.lastReportAt) {
    add(`Último reporte: ${new Date(String(p.lastReportAt)).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' })}`);
  }
  add(`Fuente: ${String(p.sourceLabel ?? 'Reportes ciudadanos')}`, 'live-popup__source');
  return root;
}

/** Punto a mitad del largo de una línea (donde va su título). */
function midpointAlong(coords: [number, number][]): [number, number] {
  if (coords.length < 2) return coords[0];
  const seg = coords.slice(1).map((p, i) => Math.hypot((p[0] - coords[i][0]) * 0.83, p[1] - coords[i][1]));
  let half = seg.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < seg.length; i++) {
    if (half <= seg[i]) {
      const t = seg[i] ? half / seg[i] : 0;
      return [coords[i][0] + t * (coords[i + 1][0] - coords[i][0]), coords[i][1] + t * (coords[i + 1][1] - coords[i][1])];
    }
    half -= seg[i];
  }
  return coords[coords.length - 1];
}

const SIGNAL_LABEL: Record<string, string> = {
  FUNCIONANDO: 'Semáforo funcionando', APAGADO: 'Semáforo apagado', TILDADO: 'Semáforo tildado',
  IRREGULAR: 'Semáforo con fallas', SIN_INFORMACION: 'Semáforo',
};

// Tipografía del estilo del mapa (CARTO Voyager).
const LABEL_FONT = ['Montserrat SemiBold', 'Open Sans Bold', 'Noto Sans Regular'];

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
  const labelsDataRef = useRef<GeoJSON.FeatureCollection>(emptyCollection);
  const signalsDataRef = useRef<GeoJSON.FeatureCollection>(emptyCollection);
  // El manejador de toques se crea una sola vez: lee los semáforos y el callback desde refs.
  const signalsByIdRef = useRef<Map<string, SignalDTO>>(new Map());
  const onSelectSignalRef = useRef(onSelectSignal);
  useEffect(() => { onSelectSignalRef.current = onSelectSignal; }, [onSelectSignal]);

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

      // Semáforos: como capa del mapa (y no un botón por cada uno), porque son cientos.
      // Los que tienen un estado reportado se ven siempre; los que no tienen reportes, solo de cerca.
      map.addSource('signals', { type: 'geojson', data: signalsDataRef.current });
      const signalPaint: maplibregl.CircleLayerSpecification['paint'] = {
        'circle-color': ['get', 'color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 15, 7, 17, 10],
        'circle-stroke-color': '#ffffff', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 16, 2.5],
      };
      map.addLayer({ id: 'signals-unknown', type: 'circle', source: 'signals', minzoom: 14, filter: ['!', ['get', 'known']], paint: signalPaint });
      map.addLayer({ id: 'signals-known', type: 'circle', source: 'signals', filter: ['get', 'known'], paint: signalPaint });
      // Zona para tocar con el dedo, más grande que el punto.
      map.addLayer({ id: 'signals-hit', type: 'circle', source: 'signals', minzoom: 14,
        paint: { 'circle-color': '#000000', 'circle-opacity': 0.01, 'circle-radius': 16 } });

      // Zonas invisibles más anchas que las líneas, para que sea fácil tocarlas con el dedo.
      // (Opacidad 0.01 y no 0: con 0 la librería las ignora al consultar qué se tocó.)
      map.addLayer({ id: 'corridors-hit', type: 'line', source: 'avellaneda-corridors', layout: { 'line-cap': 'round' },
        paint: { 'line-color': '#000000', 'line-opacity': 0.01, 'line-width': 30 } });
      map.addLayer({ id: 'live-hit', type: 'line', source: 'live-traffic', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round' },
        paint: { 'line-color': '#000000', 'line-opacity': 0.01, 'line-width': 30 } });

      const showPopup = (e: maplibregl.MapLayerMouseEvent) => {
        if (pickModeRef.current || !e.features?.length) return;
        new maplibregl.Popup({ closeButton: true, maxWidth: '260px', className: 'live-popup-wrap' })
          .setLngLat(e.lngLat).setDOMContent(livePopupContent(e.features[0].properties ?? {})).addTo(map);
      };
      // Títulos cortos sobre el mapa ("Tránsito lento", "Calle cortada", nombre de la avenida...).
      // El mapa oculta solo los que se pisan y los va mostrando al acercarse.
      map.addSource('map-labels', { type: 'geojson', data: labelsDataRef.current });
      const labelPaint: maplibregl.SymbolLayerSpecification['paint'] = {
        'text-color': ['get', 'textColor'], 'text-halo-color': '#ffffff', 'text-halo-width': 2, 'text-halo-blur': 0.5,
      };
      map.addLayer({ id: 'labels-corridors', type: 'symbol', source: 'map-labels', minzoom: 12.3, filter: ['==', ['get', 'kind'], 'corridor'],
        layout: { 'text-field': ['get', 'text'], 'text-font': LABEL_FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 12],
          'text-max-width': 12, 'text-padding': 6 },
        paint: labelPaint });
      const signalLabelLayout: maplibregl.SymbolLayerSpecification['layout'] = {
        'text-field': ['get', 'text'], 'text-font': LABEL_FONT, 'text-size': 10, 'text-anchor': 'top', 'text-offset': [0, 1], 'text-padding': 2,
      };
      map.addLayer({ id: 'labels-signals', type: 'symbol', source: 'map-labels', minzoom: 14.5,
        filter: ['all', ['==', ['get', 'kind'], 'signal'], ['get', 'known']], layout: signalLabelLayout, paint: labelPaint });
      // Los que no tienen reportes llevan el título "Semáforo" recién bien de cerca, para no tapar las calles.
      map.addLayer({ id: 'labels-signals-unknown', type: 'symbol', source: 'map-labels', minzoom: 16.5,
        filter: ['all', ['==', ['get', 'kind'], 'signal'], ['!', ['get', 'known']]], layout: signalLabelLayout, paint: labelPaint });
      map.addLayer({ id: 'labels-live', type: 'symbol', source: 'map-labels', minzoom: 12, filter: ['==', ['get', 'kind'], 'live'],
        layout: { 'text-field': ['get', 'text'], 'text-font': LABEL_FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 12],
          'text-anchor': 'bottom', 'text-offset': [0, -0.6], 'text-padding': 3 },
        paint: labelPaint });
      map.addLayer({ id: 'labels-incidents', type: 'symbol', source: 'map-labels', minzoom: 12, filter: ['==', ['get', 'kind'], 'incident'],
        layout: { 'text-field': ['get', 'text'], 'text-font': LABEL_FONT, 'text-size': 11, 'text-anchor': 'top', 'text-offset': [0, 1.3], 'text-padding': 2 },
        paint: labelPaint });

      const pointer = (layer: string) => {
        map.on('mouseenter', layer, () => { if (!pickModeRef.current) map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { if (!pickModeRef.current) map.getCanvas().style.cursor = ''; });
      };
      // Al tocar la línea o su título se abre el cartel con todos los detalles.
      // Un solo manejador de toques: decide qué cartel abrir según lo que haya bajo el dedo.
      // Prioridad: incidente en vivo (más específico) y después la avenida. Así no se abren dos a la vez.
      const LIVE_LAYERS = ['live-hit', 'live-points', 'labels-live'];
      const CORRIDOR_LAYERS = ['corridors-hit', 'labels-corridors'];
      const SIGNAL_LAYERS = ['signals-known', 'signals-unknown', 'signals-hit'];
      map.on('click', (e) => {
        if (pickModeRef.current) return;
        // El semáforo es lo más chico y específico: va primero.
        const sig = map.queryRenderedFeatures(e.point, { layers: SIGNAL_LAYERS })
          .map((f) => signalsByIdRef.current.get(String(f.properties?.id))).find(Boolean);
        if (sig) { onSelectSignalRef.current(sig); return; }
        const live = map.queryRenderedFeatures(e.point, { layers: LIVE_LAYERS });
        if (live.length) { showPopup({ ...e, features: live } as maplibregl.MapLayerMouseEvent); return; }
        const corridor = map.queryRenderedFeatures(e.point, { layers: CORRIDOR_LAYERS });
        if (corridor.length) {
          new maplibregl.Popup({ closeButton: true, maxWidth: '260px', className: 'live-popup-wrap' })
            .setLngLat(e.lngLat).setDOMContent(corridorPopupContent(corridor[0].properties ?? {})).addTo(map);
        }
      });
      for (const layer of [...LIVE_LAYERS, ...CORRIDOR_LAYERS, ...SIGNAL_LAYERS]) pointer(layer);
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
        properties: {
          code: c.code, name: c.name, status: c.status, isCabaAccess: c.isCabaAccess, color: TRAFFIC_COLOR_MAP[c.status]?.hex ?? '#64748b',
          statusLabel: TRAFFIC_COLOR_MAP[c.status]?.label ?? '', activeIncidentCount: c.activeIncidentCount,
          lastReportAt: c.lastReportAt, sourceLabel: c.sourceLabel,
        },
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

  // Títulos de cada línea y marca del mapa.
  useEffect(() => {
    const point = (coords: [number, number], properties: Record<string, unknown>): GeoJSON.Feature => ({
      type: 'Feature', properties, geometry: { type: 'Point', coordinates: coords },
    });
    const features: GeoJSON.Feature[] = [
      ...corridors.filter((c) => c.coordinates.length > 1).map((c) => point(midpointAlong(c.coordinates), {
        kind: 'corridor', text: `${c.name.replace(/\s*\(Acceso CABA\)/, '')}\n${TRAFFIC_COLOR_MAP[c.status]?.label ?? ''}`, textColor: '#334155',
        name: c.name, statusLabel: TRAFFIC_COLOR_MAP[c.status]?.label ?? '', activeIncidentCount: c.activeIncidentCount,
        lastReportAt: c.lastReportAt, sourceLabel: c.sourceLabel,
      })),
      ...(showLive ? liveIncidents : []).map((inc) => {
        const coords = inc.geometry.type === 'Point' ? inc.geometry.coordinates : midpointAlong(inc.geometry.coordinates);
        const color = liveColor(inc);
        return point(coords, {
          kind: 'live', text: LIVE_KIND_LABELS[inc.kind], textColor: color === '#eab308' ? '#a16207' : color,
          title: LIVE_KIND_LABELS[inc.kind], description: inc.description, from: inc.from, to: inc.to, delayMinutes: inc.delayMinutes,
        });
      }),
      ...(showSignals ? signals : []).map((s) => point([s.lng, s.lat], {
        kind: 'signal', known: s.status !== 'SIN_INFORMACION', text: SIGNAL_LABEL[s.status] ?? 'Semáforo', textColor: '#334155',
      })),
      ...incidents.map((i) => point([i.lng, i.lat], { kind: 'incident', text: INCIDENT_LABELS[i.type] ?? 'Reporte', textColor: '#b91c1c' })),
    ];
    labelsDataRef.current = { type: 'FeatureCollection', features };
    (mapRef.current?.getSource('map-labels') as maplibregl.GeoJSONSource | undefined)?.setData(labelsDataRef.current);
  }, [corridors, liveIncidents, showLive, signals, showSignals, incidents]);

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
    signalsByIdRef.current = new Map(signals.map((s) => [s.id, s]));
    signalsDataRef.current = {
      type: 'FeatureCollection',
      features: (showSignals ? signals : []).map((s) => ({
        type: 'Feature',
        properties: { id: s.id, color: SIGNAL_COLOR[s.status] ?? '#94a3b8', known: s.status !== 'SIN_INFORMACION' },
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      })),
    };
    (mapRef.current?.getSource('signals') as maplibregl.GeoJSONSource | undefined)?.setData(signalsDataRef.current);
  }, [signals, showSignals]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
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
  }, [incidents, onSelectIncident]);

  return <div ref={containerRef} className="w-full h-full" />;
}
