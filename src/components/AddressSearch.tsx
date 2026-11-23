'use client';

import { useEffect, useRef, useState } from 'react';

export interface SearchPlace {
  lat: number;
  lng: number;
  label: string;
  detail: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string; street?: string; housenumber?: string;
    district?: string; locality?: string; city?: string; county?: string; state?: string;
  };
}

// Avellaneda y alrededores (sur de CABA, Lanús, Quilmes): oeste, sur, este, norte.
const SEARCH_BBOX = '-58.55,-34.80,-58.20,-34.55';
const BIAS = { lat: -34.6627, lng: -58.3656 };

function toPlace(f: PhotonFeature): SearchPlace {
  const p = f.properties;
  const address = [p.street, p.housenumber].filter(Boolean).join(' ');
  const label = p.name || address || 'Ubicación';
  const area = [p.district || p.locality, p.city].filter(Boolean);
  const detail = [p.name && address ? address : null, ...area]
    .filter((v, i, arr) => v && arr.indexOf(v) === i).join(' · ');
  return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], label, detail };
}

async function searchPlaces(query: string, signal: AbortSignal): Promise<SearchPlace[]> {
  const params = new URLSearchParams({
    q: query, bbox: SEARCH_BBOX, lat: String(BIAS.lat), lon: String(BIAS.lng), limit: '6',
  });
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
  if (!res.ok) throw new Error('search failed');
  const data: { features: PhotonFeature[] } = await res.json();
  const seen = new Set<string>();
  return data.features.map(toPlace).filter((p) => {
    const key = `${p.label}|${p.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface AddressSearchProps {
  onSelect: (place: SearchPlace) => void;
  onClear: () => void;
}

export default function AddressSearch({ onSelect, onClear }: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchPlace[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) { skipNextSearch.current = false; return; }
    const q = query.trim();
    if (q.length < 3) return; // la lista se oculta sola con menos de 3 letras
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        const found = await searchPlaces(q, controller.signal);
        setResults(found);
        setActive(0);
        setStatus(found.length ? 'idle' : 'empty');
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') { setResults([]); setStatus('error'); setOpen(true); }
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const choose = (place: SearchPlace) => {
    skipNextSearch.current = true;
    setQuery(place.label);
    setOpen(false);
    setResults([]);
    inputRef.current?.blur();
    onSelect(place);
  };

  const clear = () => {
    setQuery(''); setResults([]); setStatus('idle'); setOpen(false);
    onClear();
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); choose(results[active]); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  const showList = open && query.trim().length >= 3 && (results.length > 0 || status === 'empty' || status === 'error');

  return (
    <div className="relative pointer-events-auto">
      <div className="flex items-center gap-2 bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-slate-200 px-3 py-2.5">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef} type="search" value={query} enterKeyHint="search" autoComplete="off"
          onChange={(e) => setQuery(e.target.value)} onFocus={() => results.length && setOpen(true)} onKeyDown={onKeyDown}
          placeholder={'Buscar dirección o lugar'} aria-label={'Buscar dirección o lugar'}
          role="combobox" aria-expanded={showList} aria-controls="address-search-results" aria-autocomplete="list"
          className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {status === 'loading' && query.trim().length >= 3 && <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin shrink-0" aria-label="Buscando" />}
        {query && (
          <button type="button" onClick={clear} aria-label={'Borrar búsqueda'} className="text-slate-400 hover:text-slate-700 font-bold text-sm shrink-0">{'✕'}</button>
        )}
      </div>
      {showList && (
        <ul id="address-search-results" role="listbox"
          className="absolute left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto z-40">
          {status === 'error' && <li className="px-4 py-3 text-xs text-slate-500">{'No pudimos buscar ahora. Probá de nuevo en un momento.'}</li>}
          {status === 'empty' && <li className="px-4 py-3 text-xs text-slate-500">Sin resultados en Avellaneda y alrededores.</li>}
          {results.map((place, i) => (
            <li key={`${place.lat},${place.lng},${i}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(place)} onMouseEnter={() => setActive(i)}
                className={`w-full text-left px-4 py-2.5 border-b border-slate-100 last:border-0 ${i === active ? 'bg-slate-50' : ''}`}>
                <p className="text-sm font-bold text-slate-900 truncate">{place.label}</p>
                {place.detail && <p className="text-[11px] text-slate-500 truncate">{place.detail}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
