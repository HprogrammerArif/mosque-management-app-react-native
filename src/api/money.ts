import type { paths } from './contract.gen';
import type { ApiClient } from './client';

type Json<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { responses: { 200: { content: { 'application/json': infer T } } } } ? T : never;
type Body<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { requestBody: { content: { 'application/json': infer T } } } ? T : never;

export type FundResponse = Json<'/api/v1/mosques/{mosqueId}/funds', 'get'> extends (infer T)[] ? T : never;
export type HouseholdResponse = Json<'/api/v1/mosques/{mosqueId}/households', 'post'>;
export type CreateHouseholdRequest = Body<'/api/v1/mosques/{mosqueId}/households', 'post'>;
export type ExpenseCategoryResponse =
  Json<'/api/v1/mosques/{mosqueId}/expense-categories', 'get'> extends (infer T)[] ? T : never;
export type DonationResponse = Json<'/api/v1/mosques/{mosqueId}/donations', 'post'>;
export type CreateDonationRequest = Body<'/api/v1/mosques/{mosqueId}/donations', 'post'>;
export type ExpenseResponse = Json<'/api/v1/mosques/{mosqueId}/expenses', 'post'>;
export type CreateExpenseRequest = Body<'/api/v1/mosques/{mosqueId}/expenses', 'post'>;

export function listFunds(api: ApiClient, mosqueId: string): Promise<FundResponse[]> {
  return api.get<FundResponse[]>(`/mosques/${mosqueId}/funds`, mosqueId);
}

export function listExpenseCategories(api: ApiClient, mosqueId: string): Promise<ExpenseCategoryResponse[]> {
  return api.get<ExpenseCategoryResponse[]>(`/mosques/${mosqueId}/expense-categories`, mosqueId);
}

export function listHouseholds(api: ApiClient, mosqueId: string): Promise<HouseholdResponse[]> {
  return api.get<HouseholdResponse[]>(`/mosques/${mosqueId}/households`, mosqueId);
}

export function createHousehold(
  api: ApiClient, mosqueId: string, input: CreateHouseholdRequest, idempotencyKey: string,
): Promise<HouseholdResponse> {
  return api.post<HouseholdResponse>(
    `/mosques/${mosqueId}/households`, input, { tenantId: mosqueId, idempotencyKey },
  );
}

export function listDonations(api: ApiClient, mosqueId: string): Promise<DonationResponse[]> {
  return api.get<DonationResponse[]>(`/mosques/${mosqueId}/donations`, mosqueId);
}

export function recordDonation(
  api: ApiClient, mosqueId: string, input: CreateDonationRequest, idempotencyKey: string,
): Promise<DonationResponse> {
  return api.post<DonationResponse>(
    `/mosques/${mosqueId}/donations`, input, { tenantId: mosqueId, idempotencyKey },
  );
}

export function listExpenses(api: ApiClient, mosqueId: string): Promise<ExpenseResponse[]> {
  return api.get<ExpenseResponse[]>(`/mosques/${mosqueId}/expenses`, mosqueId);
}

export function recordExpense(
  api: ApiClient, mosqueId: string, input: CreateExpenseRequest, idempotencyKey: string,
): Promise<ExpenseResponse> {
  return api.post<ExpenseResponse>(
    `/mosques/${mosqueId}/expenses`, input, { tenantId: mosqueId, idempotencyKey },
  );
}
