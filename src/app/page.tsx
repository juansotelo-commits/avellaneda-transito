'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import TrafficMap from '@/components/TrafficMap';
import ReportModal from '@/components/ReportModal';
import CabaRouteModal from '@/components/CabaRouteModal';
import { INCIDENT_LABELS, TRAFFIC_COLOR_MAP, type CorridorDTO, type IncidentDTO, type OverallStatus, type SignalDTO } from '@/types/traffic';



const AVELLANEDA_CENTER = { lat: -34.6627, lng: -58.3656 };

interface OverviewResponse {
  avellanedaAhora: { status: OverallStatus; label: string; emoji: string; activeCount: number; cutsCount: number; summary: string };
  corridors: CorridorDTO[]; cabaAccesses: CorridorDTO[]; signals: SignalDTO[]; incidents: IncidentDTO[];
}

export default function HomePage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [showSignals, setShowSignals] = useState(true);
  const [showAccessDrawer, setShowAccessDrawer] = useState(false);
  const [showCabaModal, setShowCabaModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [pickLocationMode, setPickLocationMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [focusCoords, setFocusCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<SignalDTO | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDTO | null>(null);
  const [presetSignalForReport, setPresetSignalForReport] = useState<{ id: string; intersection: string } | null>(null);

  const loadOverview = useCallback(async () => {
    const res = await fetch('/api/overview', { cache: 'no-store' });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    loadOverview();
    const timer = setInterval(loadOverview, 30000);
    return () => clearInterval(timer);
  }, [loadOverview]);

  const openReportWithGPS = (signal?: SignalDTO) => {
    setPresetSignalForReport(signal ? { id: signal.id, intersection: signal.intersection } : null);
    if (signal) { setPickedCoords({ lat: signal.lat, lng: signal.lng }); setShowReportModal(true); return; }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setPickedCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setShowReportModal(true); },
        () => { setPickedCoords({ lat: AVELLANEDA_CENTER.lat, lng: AVELLANEDA_CENTER.lng }); setShowReportModal(true); },
        { enableHighAccuracy: true, timeout: 4000 }
      );
    } else {
      setPickedCoords({ lat: AVELLANEDA_CENTER.lat, lng: AVELLANEDA_CENTER.lng }); setShowReportModal(true);
    }
  };

  const voteIncident = async (id: string, voteType: 'CONFIRM' | 'RESOLVED') => {
    const voterKey = localStorage.getItem('avellaneda_device_id') || (() => {
      const uid = crypto.randomUUID(); localStorage.setItem('avellaneda_device_id', uid); return uid;
    })();
    const res = await fetch(`/api/reports/${id}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voteType, voterKey }),
    });
    if (res.ok) { setSelectedIncident(null); loadOverview(); }
    else { const err = await res.json(); alert(err.error || 'No se pudo registrar tu validaci\u00f3n'); }
  };

  return (
    <main className="relative w-screen h-dvh overflow-hidden bg-slate-100 select-none">
      <TrafficMap
        corridors={data?.corridors ?? []} signals={data?.signals ?? []} incidents={data?.incidents ?? []}
        showSignals={showSignals} pickLocationMode={pickLocationMode} pickedCoords={pickedCoords}
        onSelectSignal={(s) => { setSelectedIncident(null); setSelectedSignal(s); }}
        onSelectIncident={(i) => { setSelectedSignal(null); setSelectedIncident(i); }}
        onPickLocation={(coords) => setPickedCoords(coords)} focusCoords={focusCoords}
      />
      <header className="absolute top-3 left-3 right-14 z-20 flex flex-col gap-2 max-w-md pointer-events-none">
        <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-2xl shadow-lg p-3 border border-slate-200">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black tracking-wider uppercase text-slate-500">AVELLANEDA AHORA</p>
              <p className="text-lg font-black text-slate-900">{data ? `${data.avellanedaAhora.emoji} ${data.avellanedaAhora.label}` : 'Cargando...'}</p>
            </div>
            <Link href="/admin" className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">Admin</Link>
          </div>
          {data && <p className="text-xs text-slate-600 mt-1 leading-snug">{data.avellanedaAhora.summary}</p>}
        </div>
        <div className="pointer-events-auto flex gap-2 flex-wrap">
          <button onClick={() => setShowSignals((v) => !v)} className={`px-3 py-2 rounded-xl text-xs font-black shadow-md border ${showSignals ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-200'}`}>
            {`\u{1F6A6} Sem\u00e1foros ${showSignals ? 'ON' : 'OFF'}`}
          </button>
          <button onClick={() => setShowAccessDrawer((v) => !v)} className="px-3 py-2 rounded-xl text-xs font-black shadow-md bg-white text-slate-800 border border-slate-200">
            {`\u{1F309} Accesos a CABA (${data?.cabaAccesses.length ?? 0})`}
          </button>
        </div>
      </header>
      {pickLocationMode && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3">
          <span className="text-xs font-bold">{'Toc\u00e1 el mapa para mover el pin'}</span>
          <button onClick={() => { setPickLocationMode(false); setShowReportModal(true); }} className="bg-white text-blue-700 px-3 py-1 rounded-xl text-xs font-black">Confirmar punto</button>
        </div>
      )}
      {showAccessDrawer && data && (
        <aside className="absolute top-32 left-3 right-3 sm:right-auto sm:w-96 max-h-[55vh] overflow-y-auto z-30 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900">ACCESOS A CABA</h3>
            <button onClick={() => setShowAccessDrawer(false)} className="text-slate-500 font-bold">{'\u2715'}</button>
          </div>
          {data.cabaAccesses.map((acc) => {
            const meta = TRAFFIC_COLOR_MAP[acc.status];
            return (
              <button key={acc.id} onClick={() => { setFocusCoords({ lat: acc.centerLat, lng: acc.centerLng }); setShowAccessDrawer(false); }}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{acc.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {acc.lastReportAt ? `\u00daltimo reporte: ${new Date(acc.lastReportAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : 'Sin reportes recientes'}
                  </p>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-100 shrink-0">{meta.emoji} {meta.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </aside>
      )}
      {selectedSignal && (
        <div className="absolute bottom-24 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-30 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-slate-500">{'Sem\u00e1foro'}</p>
              <h3 className="font-black text-slate-900">{selectedSignal.intersection}</h3>
            </div>
            <button onClick={() => setSelectedSignal(null)} className="font-bold text-slate-500">{'\u2715'}</button>
          </div>
          <div className="text-sm space-y-1">
            <p>Estado: <span className="font-black">{selectedSignal.status.replace('_', ' ')}</span></p>
            <p className="text-xs text-slate-600">{'\u00daltimo reporte: '}{selectedSignal.lastReportedAt ? new Date(selectedSignal.lastReportedAt).toLocaleString('es-AR') : 'Sin informaci\u00f3n reciente'}</p>
            <p className="text-xs text-slate-600">Cantidad de reportes: {selectedSignal.reportCount}</p>
          </div>
          <button onClick={() => openReportWithGPS(selectedSignal)} className="w-full py-3 rounded-xl bg-amber-500 text-white font-black text-sm">Reportar problema en este sem\u00e1foro</button>
        </div>
      )}
      {selectedIncident && (
        <div className="absolute bottom-24 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-30 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-red-600">Confiabilidad {Math.round(selectedIncident.reliability * 100)}%</p>
              <h3 className="font-black text-slate-900">{INCIDENT_LABELS[selectedIncident.type]}</h3>
              <p className="text-xs text-slate-500">{selectedIncident.addressLabel || 'Avellaneda'} - {new Date(selectedIncident.lastActivityAt).toLocaleString('es-AR')}</p>
            </div>
            <button onClick={() => setSelectedIncident(null)} className="font-bold text-slate-500">{'\u2715'}</button>
          </div>
          {selectedIncident.description && <p className="text-sm text-slate-700">{selectedIncident.description}</p>}
          {selectedIncident.photoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={selectedIncident.photoUrl} alt="Foto del incidente" className="w-full h-36 object-cover rounded-xl border" />
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => voteIncident(selectedIncident.id, 'CONFIRM')} className="py-3 rounded-xl bg-blue-600 text-white font-black text-xs">
              {`\u{1F44D} Confirmar problema (${selectedIncident.confirmations})`}
            </button>
            <button onClick={() => voteIncident(selectedIncident.id, 'RESOLVED')} className="py-3 rounded-xl bg-emerald-600 text-white font-black text-xs">
              {`\u2705 Ya est\u00e1 solucionado (${selectedIncident.resolutions})`}
            </button>
          </div>
        </div>
      )}
      <footer className="absolute bottom-4 left-3 right-3 z-20 flex items-center justify-center gap-3 max-w-xl mx-auto">
        <button onClick={() => setShowCabaModal(true)} className="flex-1 py-4 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-xl flex items-center justify-center gap-2">
          {'\u{1F697} IR A CABA'}
        </button>
        <button onClick={() => openReportWithGPS()} className="flex-1 py-4 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-base shadow-xl flex items-center justify-center gap-2">
          {'\u26A0\uFE0F REPORTAR'}
        </button>
      </footer>
      <ReportModal key={presetSignalForReport?.id ?? 'free'} open={showReportModal} coords={pickedCoords} presetSignal={presetSignalForReport}
        onRequestMapPick={() => { setShowReportModal(false); setPickLocationMode(true); }} onClose={() => setShowReportModal(false)} onSubmitted={loadOverview} />
      <CabaRouteModal open={showCabaModal} onClose={() => setShowCabaModal(false)} />
    </main>
  );
}
