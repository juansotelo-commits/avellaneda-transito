'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { INCIDENT_LABELS, type IncidentDTO, type SignalDTO } from '@/types/traffic';
import { AVELLANEDA_CORRIDORS } from '@/lib/avellaneda-network';
import { findIntersection, nearestCorridorCode, type GeorefMatch } from '@/lib/georef';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<IncidentDTO[]>([]);
  const [signals, setSignals] = useState<SignalDTO[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  // Corte: se busca la dirección y la ubicación se completa sola (antes había un valor fijo,
  // y un código de avenida inexistente como valor inicial).
  const [cutCorridor, setCutCorridor] = useState<string>('');
  const [cutDesc, setCutDesc] = useState('');
  const [cutAddress, setCutAddress] = useState('');
  const [cutLat, setCutLat] = useState('');
  const [cutLng, setCutLng] = useState('');
  const [cutMatches, setCutMatches] = useState<GeorefMatch[]>([]);
  const [cutChosen, setCutChosen] = useState<string | null>(null);
  const [cutGeoStatus, setCutGeoStatus] = useState<'idle' | 'buscando' | 'sin-resultado' | 'error'>('idle');
  const [cutError, setCutError] = useState<string | null>(null);
  const [cutSearchedFor, setCutSearchedFor] = useState('');
  const [cutSaved, setCutSaved] = useState(false);
  const [sigName, setSigName] = useState('');
  // La ubicación arranca vacía: se completa buscando la esquina (antes había un valor fijo
  // y todos los semáforos que no se corregían a mano quedaban apilados en el mismo punto).
  const [sigLat, setSigLat] = useState('');
  const [sigLng, setSigLng] = useState('');
  const [sigMatches, setSigMatches] = useState<GeorefMatch[]>([]);
  const [sigChosen, setSigChosen] = useState<string | null>(null);
  const [sigGeoStatus, setSigGeoStatus] = useState<'idle' | 'buscando' | 'sin-resultado' | 'error'>('idle');
  const [sigError, setSigError] = useState<string | null>(null);
  const [sigSearchedFor, setSigSearchedFor] = useState('');

  const loadData = useCallback(async () => {
    const [ovRes, stRes] = await Promise.all([fetch('/api/overview'), fetch('/api/admin/cuts')]);
    if (stRes.status === 401) { setAuthed(false); return; }
    setAuthed(true);
    if (ovRes.ok) { const ov = await ovRes.json(); setIncidents(ov.incidents); setSignals(ov.signals); }
    if (stRes.ok) { const st = await stRes.json(); setStats(st.stats); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(null);
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setLoginError(res.status === 503 && err.error ? err.error : 'Usuario o contrase\u00f1a incorrectos');
      return;
    }
    loadData();
  };
  const updateReport = async (id: string, status: string) => {
    await fetch(`/api/admin/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); loadData();
  };
  const deleteReport = async (id: string) => { await fetch(`/api/admin/reports/${id}`, { method: 'DELETE' }); loadData(); };
  const chooseCutMatch = (m: GeorefMatch) => {
    setCutLat(String(m.lat)); setCutLng(String(m.lng)); setCutChosen(m.label); setCutError(null);
    // La avenida del mapa más cercana (si está sobre una); si no, "Otra calle".
    setCutCorridor(nearestCorridorCode(m.lat, m.lng, 60) ?? '');
  };
  const searchCutAddress = async (force = false) => {
    const text = cutAddress.trim();
    if (text.length < 4 || (!force && text === cutSearchedFor)) return;
    setCutSearchedFor(text); setCutGeoStatus('buscando'); setCutMatches([]); setCutChosen(null);
    try {
      const found = await findIntersection(text);
      setCutMatches(found);
      setCutGeoStatus(found.length ? 'idle' : 'sin-resultado');
      if (found.length) chooseCutMatch(found[0]);
    } catch {
      setCutGeoStatus('error');
    }
  };
  const createCut = async (e: React.FormEvent) => {
    e.preventDefault();
    setCutError(null); setCutSaved(false);
    const lat = Number(cutLat), lng = Number(cutLng);
    if (!cutLat || !cutLng || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setCutError('Falta la ubicación: tocá "Buscar" o cargá latitud y longitud.');
      return;
    }
    const res = await fetch('/api/admin/cuts', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corridorCode: cutCorridor || null, description: cutDesc.trim(), addressLabel: cutChosen ?? (cutAddress.trim() || null), lat, lng }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setCutError(err.error || 'No se pudo publicar el corte.');
      return;
    }
    setCutDesc(''); setCutAddress(''); setCutLat(''); setCutLng(''); setCutMatches([]); setCutChosen(null);
    setCutSearchedFor(''); setCutGeoStatus('idle'); setCutCorridor(''); setCutSaved(true);
    loadData();
  };
  const updateSignalStatus = async (id: string, status: string) => {
    await fetch('/api/admin/signals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); loadData();
  };
  const chooseSignalMatch = (m: GeorefMatch) => {
    setSigLat(String(m.lat)); setSigLng(String(m.lng)); setSigChosen(m.label); setSigError(null);
  };
  const searchSignalCorner = async (force = false) => {
    const name = sigName.trim();
    if (name.length < 5 || (!force && name === sigSearchedFor)) return;
    setSigSearchedFor(name); setSigGeoStatus('buscando'); setSigMatches([]); setSigChosen(null);
    try {
      const found = await findIntersection(name);
      setSigMatches(found);
      setSigGeoStatus(found.length ? 'idle' : 'sin-resultado');
      if (found.length) chooseSignalMatch(found[0]);
    } catch {
      setSigGeoStatus('error');
    }
  };
  const createSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigError(null);
    const lat = Number(sigLat), lng = Number(sigLng);
    if (!sigLat || !sigLng || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setSigError('Falta la ubicación: tocá "Buscar esquina" o cargá latitud y longitud.');
      return;
    }
    const res = await fetch('/api/admin/signals', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intersection: sigName.trim(), lat, lng, corridorCode: nearestCorridorCode(lat, lng), status: 'FUNCIONANDO' }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setSigError(err.error || 'No se pudo guardar el semáforo.');
      return;
    }
    setSigName(''); setSigLat(''); setSigLng(''); setSigMatches([]); setSigChosen(null); setSigSearchedFor(''); setSigGeoStatus('idle');
    loadData();
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-4">
          <h1 className="text-xl font-black text-slate-900">{'Panel Operativo \u00b7 Avellaneda Tr\u00e1nsito'}</h1>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email administrativo" className="w-full border rounded-xl p-3 text-sm" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={'Contrase\u00f1a'} className="w-full border rounded-xl p-3 text-sm" />
          {loginError && <p className="text-xs font-bold text-red-600">{loginError}</p>}
          <button className="w-full py-3 rounded-xl bg-slate-900 text-white font-black">Ingresar</button>
          <Link href="/" className="block text-center text-xs text-blue-600 font-bold">{'\u2190 Volver al mapa'}</Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900">{'Centro de Control \u00b7 Avellaneda Tr\u00e1nsito'}</h1>
        <Link href="/" className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold">Ver mapa en vivo</Link>
      </div>
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {Object.entries({
            'Total reportes': stats.totalReports, Activos: stats.activeReports, Verificados: stats.verifiedReports,
            Resueltos: stats.resolvedReports, 'Sem\u00e1foros': stats.totalSignals, 'Sem\u00e1f. con falla': stats.brokenSignals,
          }).map(([label, val]) => (
            <div key={label} className="bg-white rounded-xl p-3 border border-slate-200">
              <p className="text-xs text-slate-500 font-bold">{label}</p>
              <p className="text-2xl font-black text-slate-900">{val}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form onSubmit={createCut} className="bg-white p-4 rounded-2xl border space-y-3">
          <h2 className="font-black text-slate-900">Cargar corte manual</h2>
          <div className="flex gap-2">
            <input required placeholder={'Dirección o esquina (ej: Mitre 1400 o Mitre y Alsina)'} value={cutAddress}
              onChange={(e) => { setCutAddress(e.target.value); setCutChosen(null); setCutMatches([]); setCutLat(''); setCutLng(''); setCutGeoStatus('idle'); setCutSearchedFor(''); setCutSaved(false); }}
              onBlur={() => void searchCutAddress()} className="flex-1 min-w-0 border rounded-xl p-2.5 text-sm" />
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => void searchCutAddress(true)}
              className="shrink-0 px-3 rounded-xl bg-slate-100 text-slate-800 font-black text-xs">{'\u{1F4CD} Buscar'}</button>
          </div>
          {cutGeoStatus === 'buscando' && <p className="text-xs text-slate-500">{'Buscando la dirección…'}</p>}
          {cutGeoStatus === 'sin-resultado' && <p className="text-xs text-amber-700">{'No encontré esa dirección en Avellaneda. Revisá el texto o cargá latitud y longitud a mano.'}</p>}
          {cutGeoStatus === 'error' && <p className="text-xs text-amber-700">{'No se pudo consultar el buscador de direcciones. Probá de nuevo o cargá la ubicación a mano.'}</p>}
          {cutMatches.length > 1 && (
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-500">{'Encontré varias opciones, elegí la correcta:'}</p>
              {cutMatches.map((m) => (
                <button type="button" key={`${m.lat},${m.lng}`} onClick={() => chooseCutMatch(m)}
                  className={`w-full text-left text-xs p-2 rounded-lg border ${cutChosen === m.label && cutLat === String(m.lat) ? 'border-red-600 bg-red-50 font-bold' : 'border-slate-200'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
          {cutChosen && <p className="text-xs text-emerald-700 font-semibold">{`✓ Ubicación: ${cutChosen}`}</p>}
          <label className="block text-[11px] font-bold text-slate-500">
            {'Avenida (se elige sola según la dirección)'}
            <select value={cutCorridor} onChange={(e) => setCutCorridor(e.target.value)} className="mt-1 w-full border rounded-xl p-2.5 text-sm font-normal text-slate-900">
              <option value="">{'Otra calle (no es una avenida principal)'}</option>
              {AVELLANEDA_CORRIDORS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </label>
          <input required placeholder="Motivo (ej: Obra de AySA, acto, choque)" value={cutDesc} onChange={(e) => setCutDesc(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={cutLat} onChange={(e) => { setCutLat(e.target.value); setCutChosen(null); }} placeholder="Latitud" inputMode="decimal" className="border rounded-xl p-2 text-sm" />
            <input value={cutLng} onChange={(e) => { setCutLng(e.target.value); setCutChosen(null); }} placeholder="Longitud" inputMode="decimal" className="border rounded-xl p-2 text-sm" />
          </div>
          {cutError && <p className="text-xs font-bold text-red-600">{cutError}</p>}
          {cutSaved && <p className="text-xs font-bold text-emerald-700">{'✓ Corte publicado.'}</p>}
          <button className="w-full py-2.5 rounded-xl bg-red-600 text-white font-black text-sm">Publicar corte verificado</button>
        </form>
        <form onSubmit={createSignal} className="bg-white p-4 rounded-2xl border space-y-3">
          <h2 className="font-black text-slate-900">{'Cargar sem\u00e1foro manualmente'}</h2>
          <div className="flex gap-2">
            <input required placeholder={'Intersecci\u00f3n (ej: Av. Belgrano y G\u00fcemes)'} value={sigName}
              onChange={(e) => { setSigName(e.target.value); setSigChosen(null); setSigMatches([]); setSigLat(''); setSigLng(''); setSigGeoStatus('idle'); setSigSearchedFor(''); }}
              onBlur={() => void searchSignalCorner()} className="flex-1 min-w-0 border rounded-xl p-2.5 text-sm" />
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => void searchSignalCorner(true)}
              className="shrink-0 px-3 rounded-xl bg-slate-100 text-slate-800 font-black text-xs">{'\u{1F4CD} Buscar esquina'}</button>
          </div>
          {sigGeoStatus === 'buscando' && <p className="text-xs text-slate-500">Buscando la esquina…</p>}
          {sigGeoStatus === 'sin-resultado' && <p className="text-xs text-amber-700">{'No encontr\u00e9 esa esquina en Avellaneda. Revis\u00e1 el nombre o carg\u00e1 latitud y longitud a mano.'}</p>}
          {sigGeoStatus === 'error' && <p className="text-xs text-amber-700">{'No se pudo consultar el buscador de direcciones. Prob\u00e1 de nuevo o carg\u00e1 la ubicaci\u00f3n a mano.'}</p>}
          {sigMatches.length > 1 && (
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-500">{'Encontr\u00e9 varias opciones, eleg\u00ed la correcta:'}</p>
              {sigMatches.map((m) => (
                <button type="button" key={`${m.lat},${m.lng}`} onClick={() => chooseSignalMatch(m)}
                  className={`w-full text-left text-xs p-2 rounded-lg border ${sigChosen === m.label && sigLat === String(m.lat) ? 'border-blue-600 bg-blue-50 font-bold' : 'border-slate-200'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
          {sigChosen && <p className="text-xs text-emerald-700 font-semibold">{`\u2713 Ubicaci\u00f3n: ${sigChosen}`}</p>}
          <div className="grid grid-cols-2 gap-2">
            <input value={sigLat} onChange={(e) => { setSigLat(e.target.value); setSigChosen(null); }} placeholder="Latitud" inputMode="decimal" className="border rounded-xl p-2 text-sm" />
            <input value={sigLng} onChange={(e) => { setSigLng(e.target.value); setSigChosen(null); }} placeholder="Longitud" inputMode="decimal" className="border rounded-xl p-2 text-sm" />
          </div>
          {sigError && <p className="text-xs font-bold text-red-600">{sigError}</p>}
          <button className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-black text-sm">{'Agregar intersecci\u00f3n semaforizada'}</button>
        </form>
      </div>
      <section className="bg-white p-4 rounded-2xl border space-y-3">
        <h2 className="font-black text-slate-900">Reportes activos ({incidents.length})</h2>
        <div className="space-y-2">
          {incidents.map((inc) => (
            <div key={inc.id} className="p-3 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-bold text-sm text-slate-900">{INCIDENT_LABELS[inc.type]} <span className="text-xs px-2 py-0.5 rounded bg-slate-100">{inc.status}</span></p>
                <p className="text-xs text-slate-600">{inc.description || inc.addressLabel || `${inc.lat}, ${inc.lng}`} - Confianza {Math.round(inc.reliability * 100)}%</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => updateReport(inc.id, 'VERIFICADO')} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold">Verificar</button>
                <button onClick={() => updateReport(inc.id, 'RESUELTO')} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">Cerrar incidente</button>
                <button onClick={() => deleteReport(inc.id)} className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold">Eliminar falso</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-white p-4 rounded-2xl border space-y-3">
        <h2 className="font-black text-slate-900">{'Sem\u00e1foros'} ({signals.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {signals.map((sig) => (
            <div key={sig.id} className="p-3 border rounded-xl flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{sig.intersection}</p>
                <p className="text-xs text-slate-500">Reportes: {sig.reportCount}</p>
              </div>
              <select value={sig.status} onChange={(e) => updateSignalStatus(sig.id, e.target.value)} className="border rounded-lg p-1.5 text-xs font-bold">
                <option value="SIN_INFORMACION">{'Sin informaci\u00f3n reciente'}</option>
                <option value="FUNCIONANDO">Funcionando</option>
                <option value="APAGADO">Apagado</option>
                <option value="TILDADO">Tildado</option>
                <option value="IRREGULAR">Funcionamiento irregular</option>
              </select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
