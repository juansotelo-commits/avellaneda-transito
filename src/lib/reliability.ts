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
