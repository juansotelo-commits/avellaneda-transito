'use client';

import { useEffect, useState } from 'react';
import type { CabaAnalysisResult } from '@/lib/caba-router';

export default function CabaRouteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [origin, setOrigin] = useState('avellaneda-centro');
  const [destination, setDestination] = useState('centro');
  const [result, setResult] = useState<CabaAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/routes/caba?origin=${origin}&destination=${destination}`)
      .then((r) => r.json()).then(setResult).finally(() => setLoading(false));
  }, [open, origin, destination]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">{'\u{1F697} Ir a CABA'}</h2>
          <button onClick={onClose} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">{'\u2715'}</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500">Salgo desde</label>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="w-full mt-1 border border-slate-300 rounded-xl p-3 font-semibold text-sm">
              <option value="avellaneda-centro">Avellaneda Centro / Crucecita</option>
              <option value="pineyro">{'Pi\u00f1eyro / Gerli'}</option>
              <option value="dock-sud">Dock Sud / Isla Maciel</option>
              <option value="sarandi">{'Sarand\u00ed'}</option>
              <option value="villa-dominico">{'Villa Dom\u00ednico'}</option>
              <option value="wilde">Wilde</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">Voy hacia (CABA)</label>
            <select value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full mt-1 border border-slate-300 rounded-xl p-3 font-semibold text-sm">
              <option value="centro">Microcentro / Obelisco</option>
              <option value="puerto-madero">Puerto Madero / Retiro</option>
              <option value="la-boca">La Boca</option>
              <option value="barracas">Barracas</option>
              <option value="constitucion">{'Constituci\u00f3n'}</option>
              <option value="oeste">Au. 25 de Mayo / Oeste</option>
            </select>
          </div>
        </div>
        {loading && <p className="text-sm text-slate-500">Analizando cortes e incidentes...</p>}
        {result && (
          <div className="space-y-3">
            {result.alertBanner && <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 text-sm font-bold">{result.alertBanner}</div>}
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
              <p className="text-xs font-black uppercase text-blue-700">1. Ruta recomendada</p>
              <p className="text-base font-black text-slate-900">{result.recommendedRoute}</p>
              <p className="text-xs font-black uppercase text-blue-700 pt-1">2. Motivo</p>
              <p className="text-sm text-slate-800">{result.reason}</p>
              <p className="text-xs font-black uppercase text-blue-700 pt-1">{'3. Estado de circulaci\u00f3n'}</p>
              <p className="text-sm font-bold text-slate-900">{result.trafficStatusLabel}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-xs font-black uppercase text-slate-500">4. Ruta alternativa</p>
              <p className="text-sm font-bold text-slate-900">{result.alternativeRoute}</p>
              <p className="text-xs text-slate-600">{result.alternativeStatusLabel}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
