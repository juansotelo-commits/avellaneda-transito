'use client';

import { useState } from 'react';
import { INCIDENT_LABELS, type IncidentType } from '@/types/traffic';

interface ReportModalProps {
  open: boolean;
  coords: { lat: number; lng: number } | null;
  presetSignal?: { id: string; intersection: string } | null;
  onRequestMapPick: () => void;
  onClose: () => void;
  onSubmitted: () => void;
}

const REPORT_TYPES: IncidentType[] = [
  'SEMAFORO_APAGADO', 'SEMAFORO_TILDADO', 'SEMAFORO_IRREGULAR',
  'CALLE_CORTADA', 'AVENIDA_CORTADA', 'ACCIDENTE',
  'TRANSITO_DETENIDO', 'TRANSITO_INTENSO', 'OBRA', 'ANIEGO', 'OTRO',
];

export default function ReportModal({
  open, coords, presetSignal, onRequestMapPick, onClose, onSubmitted,
}: ReportModalProps) {
  const [type, setType] = useState<IncidentType>(presetSignal ? 'SEMAFORO_APAGADO' : 'TRANSITO_INTENSO');
  const [description, setDescription] = useState('');
  const [addressLabel, setAddressLabel] = useState(presetSignal?.intersection ?? '');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFile = (file?: File) => {
    if (!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, 800 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhotoBase64(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) { setError('Necesitamos la ubicaci\u00f3n GPS o un punto en el mapa.'); return; }
    setLoading(true);
    setError(null);
    try {
      const deviceHash = localStorage.getItem('avellaneda_device_id') || (() => {
        const id = crypto.randomUUID(); localStorage.setItem('avellaneda_device_id', id); return id;
      })();
      const res = await fetch('/api/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, lat: coords.lat, lng: coords.lng, description, addressLabel, signalId: presetSignal?.id, deviceHash, photoBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el reporte');
      setDescription(''); setPhotoBase64(null); onSubmitted(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <form onSubmit={handleSubmit} className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">Reportar incidente vial</h2>
          <button type="button" onClick={onClose} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">{'\u2715'}</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {REPORT_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`p-3 rounded-xl text-left text-sm font-bold border-2 transition ${type === t ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700'}`}>
              {INCIDENT_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
          <div className="text-xs text-slate-600">
            <p className="font-bold text-slate-800">{'Ubicaci\u00f3n'}</p>
            {coords ? <p>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p> : <p className="text-red-600 font-semibold">Sin coordenadas</p>}
          </div>
          <button type="button" onClick={onRequestMapPick} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold shrink-0">Ajustar en mapa</button>
        </div>
        <input type="text" placeholder="Esquina o referencia (ej: Mitre y Larralde)" value={addressLabel} onChange={(e) => setAddressLabel(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm" />
        <textarea rows={2} placeholder="Descripci\u00f3n breve opcional (ej: mano a CABA reducida)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 text-sm" />
        <label className="block">
          <span className="text-xs font-bold text-slate-600">Foto opcional</span>
          <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} className="mt-1 block w-full text-sm text-slate-600" />
        </label>
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-lg shadow-lg disabled:opacity-50">
          {loading ? 'Enviando...' : 'ENVIAR REPORTE'}
        </button>
      </form>
    </div>
  );
}
