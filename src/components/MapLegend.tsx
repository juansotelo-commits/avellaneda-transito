'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { TRAFFIC_COLOR_MAP } from '@/types/traffic';

interface LegendItem { color: string; label: string; shape: 'line' | 'dot' }

const AVENUES: LegendItem[] = (['NORMAL', 'MODERADO', 'INTENSO', 'CRITICO', 'CORTADO'] as const).map((k) => ({
  color: TRAFFIC_COLOR_MAP[k].hex, label: TRAFFIC_COLOR_MAP[k].label, shape: 'line',
}));

const LIVE: LegendItem[] = [
  { color: '#f97316', label: 'Tránsito lento', shape: 'line' },
  { color: '#dc2626', label: 'Tránsito parado o accidente', shape: 'line' },
  { color: '#18181b', label: 'Calle cortada', shape: 'line' },
  { color: '#7c3aed', label: 'Obra o carril cerrado', shape: 'line' },
];

// Mismos colores que los marcadores de semáforos del mapa.
const SIGNALS: LegendItem[] = [
  { color: '#16a34a', label: 'Funcionando', shape: 'dot' },
  { color: '#18181b', label: 'Apagado', shape: 'dot' },
  { color: '#dc2626', label: 'Tildado', shape: 'dot' },
  { color: '#f97316', label: 'Funcionando mal', shape: 'dot' },
  { color: '#94a3b8', label: 'Sin reportes (se ven de cerca)', shape: 'dot' },
];

function Section({ title, items }: { title: string; items: LegendItem[] }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 text-xs text-slate-800">
            {item.shape === 'line'
              ? <span className="w-6 h-1.5 rounded-full shrink-0 ring-1 ring-white" style={{ backgroundColor: item.color }} />
              : <span className="w-3.5 h-3.5 rounded-full shrink-0 border-2 border-white shadow" style={{ backgroundColor: item.color }} />}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface MapLegendProps { open: boolean; onToggle: () => void; showLive: boolean }

export default function MapLegend({ open, onToggle, showLive }: MapLegendProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  // El panel crece hacia arriba: se mide dónde termina el encabezado (con el buscador)
  // para que nunca lo tape, sea cual sea el tamaño de la pantalla.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const panel = panelRef.current;
      const header = document.querySelector('header');
      if (!panel || !header) return;
      const panelBottom = panel.getBoundingClientRect().bottom;
      setMaxHeight(Math.max(160, panelBottom - header.getBoundingClientRect().bottom - 12));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open]);

  return (
    <>
      <button onClick={onToggle} aria-label={open ? 'Cerrar referencias' : 'Ver referencias de colores'} aria-expanded={open}
        className="absolute bottom-24 left-3 z-20 h-12 px-4 rounded-full bg-white shadow-xl border border-slate-200 flex items-center gap-1.5 text-sm font-black text-slate-800">
        <span aria-hidden="true" className="w-5 h-5 rounded-full border-2 border-slate-700 text-[11px] leading-none flex items-center justify-center">i</span>
        Referencias
      </button>
      {open && (
        <div ref={panelRef} role="dialog" aria-label="Referencias de colores"
          className="absolute bottom-40 left-3 z-30 w-72 max-w-[calc(100vw-1.5rem)] max-h-[55vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3"
          style={maxHeight ? { maxHeight } : undefined}>
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900">Referencias</h3>
            <button onClick={onToggle} aria-label="Cerrar" className="text-slate-500 font-bold">{'✕'}</button>
          </div>
          <Section title="Avenidas (reportes de vecinos)" items={AVENUES} />
          {showLive && <Section title="En vivo (TomTom)" items={LIVE} />}
          <Section title={'Semáforos'} items={SIGNALS} />
        </div>
      )}
    </>
  );
}
