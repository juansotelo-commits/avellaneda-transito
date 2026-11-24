'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import TrafficMap from '@/components/TrafficMap';
import ReportModal from '@/components/ReportModal';
import CabaRouteModal from '@/components/CabaRouteModal';
import AddressSearch, { type SearchPlace } from '@/components/AddressSearch';
import { INCIDENT_LABELS, TRAFFIC_COLOR_MAP, type CorridorDTO, type IncidentDTO, type LiveTrafficResponse, type OverallStatus, type SignalDTO } from '@/types/traffic';



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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchPlace, setSearchPlace] = useState<SearchPlace | null>(null);
  const [live, setLive] = useState<LiveTrafficResponse | null>(null);
  const [showLive, setShowLive] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator) || watchIdRef.current !== null) return;
    let centered = false;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setLocationError(null);
        if (!centered) { centered = true; setFocusCoords(coords); }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
          setUserLocation(null);
          setLocationError('No pudimos acceder a tu ubicación. Podés habilitarla desde la configuración del navegador.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }, []);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    let cancelled = false;
    const decide = async () => {
      let state: PermissionState | 'unknown' = 'unknown';
      try { state = (await navigator.permissions.query({ name: 'geolocation' })).state; } catch { /* Safari antiguo */ }
      if (cancelled) return;
      if (state === 'granted') startTracking();
      else if (state !== 'denied') {
        let dismissed = false;
        try { dismissed = sessionStorage.getItem('avellaneda_location_dismissed') === '1'; } catch { /* sin storage */ }
        if (!dismissed) setShowLocationPrompt(true);
      }
    };
    decide();
    return () => {
      cancelled = true;
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [startTracking]);

  const acceptLocation = () => { setShowLocationPrompt(false); startTracking(); };
  const dismissLocation = () => {
    setShowLocationPrompt(false);
    try { sessionStorage.setItem('avellaneda_location_dismissed', '1'); } catch { /* sin storage */ }
  };

  const loadOverview = useCallback(async () => {
    const res = await fetch('/api/overview', { cache: 'no-store' });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    loadOverview();
    const timer = setInterval(loadOverview, 30000);
    return () => clearInterval(timer);
  }, [loadOverview]);

  // Tránsito en vivo (TomTom): se actualiza cada 3 minutos.
  useEffect(() => {
    let stopped = false;
    const loadLive = async () => {
      try {
        const res = await fetch('/api/live-traffic');
        if (res.ok && !stopped) setLive(await res.json());
      } catch { /* sin conexión: se reintenta en el próximo ciclo */ }
    };
    loadLive();
    const timer = setInterval(loadLive, 180000);
    return () => { stopped = true; clearInterval(timer); };
  }, []);

  const liveIncidents = live?.enabled ? live.incidents : [];
  const liveJams = liveIncidents.filter((i) => i.kind === 'EMBOTELLAMIENTO').length;
  const liveCuts = liveIncidents.filter((i) => i.kind === 'CORTE').length;

  const openReportWithGPS = (signal?: SignalDTO) => {
    setPresetSignalForReport(signal ? { id: signal.id, intersection: signal.intersection } : null);
    if (signal) { setPickedCoords({ lat: signal.lat, lng: signal.lng }); setShowReportModal(true); return; }
    if (userLocation) { setPickedCoords(userLocation); setShowReportModal(true); return; }
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
        userLocation={userLocation} searchPlace={searchPlace}
        liveIncidents={liveIncidents} showLive={showLive}
      />
      {userLocation && !selectedSignal && !selectedIncident && (
        <button onClick={() => setFocusCoords({ ...userLocation })} aria-label={'Centrar el mapa en mi ubicación'}
          className="absolute bottom-24 right-3 z-20 w-12 h-12 rounded-full bg-white shadow-xl border border-slate-200 flex items-center justify-center text-xl">
          {'\u{1F4CD}'}
        </button>
      )}
      {showLocationPrompt && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-3">
          <div role="dialog" aria-modal="true" aria-labelledby="location-prompt-title"
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-3">
            <p className="text-3xl">{'\u{1F4CD}'}</p>
            <h2 id="location-prompt-title" className="font-black text-lg text-slate-900">{'¿Querés compartir tu ubicación?'}</h2>
            <p className="text-sm text-slate-600 leading-snug">
              {'Te mostramos en el mapa dónde estás y el punto se va moviendo con vos. Tu ubicación no se guarda ni se envía a nadie.'}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={dismissLocation} className="py-3 rounded-xl bg-slate-100 text-slate-700 font-black text-sm">Ahora no</button>
              <button onClick={acceptLocation} className="py-3 rounded-xl bg-blue-600 text-white font-black text-sm">Compartir</button>
            </div>
          </div>
        </div>
      )}
      {locationError && (
        <div className="absolute top-48 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-96 z-40 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl shadow-lg p-3 flex items-start gap-2">
          <p className="text-xs font-semibold flex-1">{locationError}</p>
          <button onClick={() => setLocationError(null)} className="font-bold text-amber-700">{'✕'}</button>
        </div>
      )}
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
          {live?.enabled && live.updatedAt && (
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              {`\u{1F4E1} En vivo: ${liveJams} ${liveJams === 1 ? 'zona' : 'zonas'} con tránsito lento · ${liveCuts} ${liveCuts === 1 ? 'corte' : 'cortes'} · ${new Date(live.updatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}`}
            </p>
          )}
        </div>
        <div className="pointer-events-auto flex gap-2 flex-wrap">
          <button onClick={() => setShowSignals((v) => !v)} className={`px-3 py-2 rounded-xl text-xs font-black shadow-md border ${showSignals ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-200'}`}>
            {`\u{1F6A6} Sem\u00e1foros ${showSignals ? 'ON' : 'OFF'}`}
          </button>
          <button onClick={() => setShowAccessDrawer((v) => !v)} className="px-3 py-2 rounded-xl text-xs font-black shadow-md bg-white text-slate-800 border border-slate-200">
            {`\u{1F309} Accesos a CABA (${data?.cabaAccesses.length ?? 0})`}
          </button>
          {live?.enabled && (
            <button onClick={() => setShowLive((v) => !v)} aria-pressed={showLive}
              className={`px-3 py-2 rounded-xl text-xs font-black shadow-md border ${showLive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-200'}`}>
              {`\u{1F4E1} En vivo ${showLive ? 'ON' : 'OFF'}`}
            </button>
          )}
        </div>
        <AddressSearch
          onSelect={(place) => { setShowAccessDrawer(false); setSearchPlace(place); }}
          onClear={() => setSearchPlace(null)}
        />
      </header>
      {pickLocationMode && (
        <div className="absolute top-48 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3">
          <span className="text-xs font-bold">{'Toc\u00e1 el mapa para mover el pin'}</span>
          <button onClick={() => { setPickLocationMode(false); setShowReportModal(true); }} className="bg-white text-blue-700 px-3 py-1 rounded-xl text-xs font-black">Confirmar punto</button>
        </div>
      )}
      {showAccessDrawer && data && (
        <aside className="absolute top-48 left-3 right-3 sm:right-auto sm:w-96 max-h-[55vh] overflow-y-auto z-30 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-2">
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
                    {acc.lastReportAt ? `\u00daltimo reporte: ${new Date(acc.lastReportAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}` : 'Sin reportes recientes'}
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
            <p className="text-xs text-slate-600">{'\u00daltimo reporte: '}{selectedSignal.lastReportedAt ? new Date(selectedSignal.lastReportedAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : 'Sin informaci\u00f3n reciente'}</p>
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
              <p className="text-xs text-slate-500">{selectedIncident.addressLabel || 'Avellaneda'} - {new Date(selectedIncident.lastActivityAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p>
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
