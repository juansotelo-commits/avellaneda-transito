'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { INCIDENT_LABELS, type IncidentDTO, type SignalDTO } from '@/types/traffic';
import { AVELLANEDA_CORRIDORS } from '@/lib/avellaneda-network';

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState('admin@avellaneda.local');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<IncidentDTO[]>([]);
  const [signals, setSignals] = useState<SignalDTO[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [cutCorridor, setCutCorridor] = useState('av-mitre');
  const [cutDesc, setCutDesc] = useState('');
  const [cutLat, setCutLat] = useState('-34.6625');
  const [cutLng, setCutLng] = useState('-58.3678');
  const [sigName, setSigName] = useState('');
  const [sigLat, setSigLat] = useState('-34.6650');
  const [sigLng, setSigLng] = useState('-58.3620');

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
    if (!res.ok) { setLoginError('Usuario o contrase\u00f1a incorrectos'); return; }
    loadData();
  };
  const updateReport = async (id: string, status: string) => {
    await fetch(`/api/admin/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); loadData();
  };
  const deleteReport = async (id: string) => { await fetch(`/api/admin/reports/${id}`, { method: 'DELETE' }); loadData(); };
  const createCut = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/cuts', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corridorCode: cutCorridor, description: cutDesc, lat: Number(cutLat), lng: Number(cutLng), isAvenue: cutCorridor.startsWith('av-') }) });
    setCutDesc(''); loadData();
  };
  const updateSignalStatus = async (id: string, status: string) => {
    await fetch('/api/admin/signals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); loadData();
  };
  const createSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/signals', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intersection: sigName, lat: Number(sigLat), lng: Number(sigLng), status: 'FUNCIONANDO' }) });
    setSigName(''); loadData();
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
          <select value={cutCorridor} onChange={(e) => setCutCorridor(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm">
            {AVELLANEDA_CORRIDORS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <input required placeholder="Motivo / altura del corte (ej: Obra al 1400)" value={cutDesc} onChange={(e) => setCutDesc(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={cutLat} onChange={(e) => setCutLat(e.target.value)} placeholder="Latitud" className="border rounded-xl p-2 text-sm" />
            <input value={cutLng} onChange={(e) => setCutLng(e.target.value)} placeholder="Longitud" className="border rounded-xl p-2 text-sm" />
          </div>
          <button className="w-full py-2.5 rounded-xl bg-red-600 text-white font-black text-sm">Publicar corte verificado</button>
        </form>
        <form onSubmit={createSignal} className="bg-white p-4 rounded-2xl border space-y-3">
          <h2 className="font-black text-slate-900">{'Cargar sem\u00e1foro manualmente'}</h2>
          <input required placeholder={'Intersecci\u00f3n (ej: Av. Belgrano y G\u00fcemes)'} value={sigName} onChange={(e) => setSigName(e.target.value)} className="w-full border rounded-xl p-2.5 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={sigLat} onChange={(e) => setSigLat(e.target.value)} placeholder="Latitud" className="border rounded-xl p-2 text-sm" />
            <input value={sigLng} onChange={(e) => setSigLng(e.target.value)} placeholder="Longitud" className="border rounded-xl p-2 text-sm" />
          </div>
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
