import type { paths } from './contract.gen';
import type { ApiClient } from './client';

type Json<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { responses: { 200: { content: { 'application/json': infer T } } } } ? T : never;

export type MosqueResponse = Json<'/api/v1/mosques/{mosqueId}', 'get'>;
export type PrayerConfigResponse = Json<'/api/v1/mosques/{mosqueId}/prayer-config', 'get'>;
export type UpdatePrayerConfigRequest =
  paths['/api/v1/mosques/{mosqueId}/prayer-config']['put'] extends
    { requestBody: { content: { 'application/json': infer T } } } ? T : never;

export function fetchMosque(api: ApiClient, mosqueId: string): Promise<MosqueResponse> {
  return api.get<MosqueResponse>(`/mosques/${mosqueId}`, mosqueId);
}

export function fetchPrayerConfig(api: ApiClient, mosqueId: string): Promise<PrayerConfigResponse> {
  return api.get<PrayerConfigResponse>(`/mosques/${mosqueId}/prayer-config`, mosqueId);
}

export function updatePrayerConfig(
  api: ApiClient, mosqueId: string, input: UpdatePrayerConfigRequest,
): Promise<PrayerConfigResponse> {
  return api.put<PrayerConfigResponse>(`/mosques/${mosqueId}/prayer-config`, input, mosqueId);
}
