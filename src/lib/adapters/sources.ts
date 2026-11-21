import type { IncidentDTO, SignalStatus, TrafficLevel } from '@/types/traffic';

export interface ExternalTrafficReading {
  corridorCode: string;
  status: TrafficLevel;
  speedKmh?: number;
  timestamp: string;
  providerName: string;
}

export interface ExternalSignalReading {
  externalApiId: string;
  status: SignalStatus;
  timestamp: string;
  providerName: string;
}

export interface TrafficSourceAdapter {
  readonly providerName: string;
  fetchCorridorReadings(municipalitySlug: string): Promise<ExternalTrafficReading[]>;
  fetchExternalIncidents(municipalitySlug: string): Promise<Partial<IncidentDTO>[]>;
}

export interface SignalSourceAdapter {
  readonly providerName: string;
  fetchSignalStates(municipalitySlug: string): Promise<ExternalSignalReading[]>;
}

export class NullOfficialTrafficAdapter implements TrafficSourceAdapter {
  readonly providerName = 'SIN_FEED_OFICIAL';
  async fetchCorridorReadings(): Promise<ExternalTrafficReading[]> { return []; }
  async fetchExternalIncidents(): Promise<Partial<IncidentDTO>[]> { return []; }
}

export class NullOfficialSignalAdapter implements SignalSourceAdapter {
  readonly providerName = 'REPORTE_CIUDADANO_UNICO';
  async fetchSignalStates(): Promise<ExternalSignalReading[]> { return []; }
}
