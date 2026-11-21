export type TrafficLevel = 'NORMAL' | 'MODERADO' | 'INTENSO' | 'CRITICO' | 'CORTADO' | 'SIN_DATOS';
export type SignalStatus = 'FUNCIONANDO' | 'APAGADO' | 'TILDADO' | 'IRREGULAR' | 'SIN_INFORMACION';
export type IncidentType =
  | 'SEMAFORO_APAGADO' | 'SEMAFORO_TILDADO' | 'SEMAFORO_IRREGULAR'
  | 'CALLE_CORTADA' | 'AVENIDA_CORTADA' | 'ACCIDENTE'
  | 'TRANSITO_DETENIDO' | 'TRANSITO_INTENSO' | 'OBRA' | 'ANIEGO' | 'OTRO';
export type OverallStatus = 'NORMAL' | 'MODERADO' | 'COMPLICADO' | 'CRITICO' | 'SIN_DATOS';

export interface CorridorDTO {
  id: string; code: string; name: string; category: string; isCabaAccess: boolean;
  coordinates: [number, number][]; centerLat: number; centerLng: number;
  status: TrafficLevel; activeIncidentCount: number; lastReportAt: string | null; sourceLabel: string;
}
export interface SignalDTO {
  id: string; intersection: string; corridorCode: string | null; lat: number; lng: number;
  status: SignalStatus; sourceType: string; reportCount: number; lastReportedAt: string | null;
}
export interface IncidentDTO {
  id: string; corridorCode: string | null; signalId: string | null; type: IncidentType;
  severity: number; description: string | null; photoUrl: string | null; lat: number; lng: number;
  addressLabel: string | null; status: string; sourceType: string; confirmations: number;
  resolutions: number; reliability: number; reportedAt: string; lastActivityAt: string;
}

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  SEMAFORO_APAGADO: 'Sem\u00e1foro apagado', SEMAFORO_TILDADO: 'Sem\u00e1foro tildado',
  SEMAFORO_IRREGULAR: 'Sem\u00e1foro funcionando mal', CALLE_CORTADA: 'Calle cortada',
  AVENIDA_CORTADA: 'Avenida cortada', ACCIDENTE: 'Accidente',
  TRANSITO_DETENIDO: 'Tr\u00e1nsito detenido', TRANSITO_INTENSO: 'Tr\u00e1nsito intenso',
  OBRA: 'Obra en calzada', ANIEGO: 'Aniego / inundaci\u00f3n', OTRO: 'Otro problema vial',
};

export const TRAFFIC_COLOR_MAP: Record<TrafficLevel, { hex: string; label: string; emoji: string }> = {
  NORMAL: { hex: '#16a34a', label: 'Circulaci\u00f3n normal', emoji: '\u{1F7E2}' },
  MODERADO: { hex: '#eab308', label: 'Circulaci\u00f3n moderada', emoji: '\u{1F7E1}' },
  INTENSO: { hex: '#f97316', label: 'Tr\u00e1nsito intenso', emoji: '\u{1F7E0}' },
  CRITICO: { hex: '#dc2626', label: 'Tr\u00e1nsito cr\u00edtico', emoji: '\u{1F534}' },
  CORTADO: { hex: '#18181b', label: 'Calle / Avenida cortada', emoji: '\u26AB' },
  SIN_DATOS: { hex: '#64748b', label: 'Sin informaci\u00f3n reciente', emoji: '\u26AA' },
};
