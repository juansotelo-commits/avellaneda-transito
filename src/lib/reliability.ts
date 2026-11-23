export interface IncidentLike {
  status?: string;
  reliability?: number;
  confirmations?: number;
  rejections?: number;
  lastActivityAt?: Date | string;
}

export function refreshIncidentReliability(inc: IncidentLike): { reliability: number } {
  if (inc.status === 'VERIFICADO') {
    return { reliability: 1.0 };
  }

  let score = typeof inc.reliability === 'number' ? inc.reliability : 0.6;
  const confirmations = inc.confirmations ?? 0;
  const rejections = inc.rejections ?? 0;

  score += confirmations * 0.1 - rejections * 0.15;

  if (inc.lastActivityAt) {
    const lastTime = new Date(inc.lastActivityAt).getTime();
    if (!Number.isNaN(lastTime)) {
      const hoursElapsed = (Date.now() - lastTime) / (1000 * 60 * 60);
      score -= Math.max(0, hoursElapsed) * 0.05;
    }
  }

  const clamped = Math.max(0, Math.min(1, Number(score.toFixed(2))));
  return { reliability: clamped };
}

export function getIncidentSeverity(type: string) { if (type === "ACCIDENTE" || type === "AVENIDA_CORTADA" || type === "SEMAFORO_APAGADO") return "ALTA"; if (type === "CALLE_CORTADA" || type === "SEMAFORO_TILDADO") return "MEDIA"; return "BAJA"; }
export function calculateReliability(p: any) { const c = p.confirmations ?? 1; const r = p.resolutions ?? 0; let s = (p.sourceType === "OFFICIAL" ? 0.85 : 0.45) + (c - 1) * 0.1 - r * 0.2; const ref = p.lastActivityAt ?? p.reportedAt; let h = 0; if (ref) { const t = new Date(ref).getTime(); if (!Number.isNaN(t)) { h = Math.max(0, (Date.now() - t) / 3600000); s -= h * 0.05; } } const reliability = Math.max(0, Math.min(1, Number(s.toFixed(2)))); return { reliability, isStale: r >= 2 || h > 6 || reliability < 0.2 }; }
