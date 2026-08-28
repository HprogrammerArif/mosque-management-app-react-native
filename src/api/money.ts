import type { paths } from './contract.gen';
import type { ApiClient } from './client';

// POST routes here default to 201 (server.ts: unset docs.status + method POST -> 201);
// GET/PUT default to 200. Try 200 first, fall back to 201 — mosques.ts's Json<> only
// ever hit GET/PUT so 200 alone worked there; this file's POST-heavy usage needs both.
type Json<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { responses: { 200: { content: { 'application/json': infer T } } } } ? T :
  paths[P][M] extends { responses: { 201: { content: { 'application/json': infer T } } } } ? T :
  never;
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
export type DuesChargeResponse = Json<'/api/v1/mosques/{mosqueId}/dues/charges/{chargeId}', 'get'>;
export type DuesPaymentResponse = Json<'/api/v1/mosques/{mosqueId}/dues/charges/{chargeId}/payments', 'post'>;
export type GenerateDuesRequest = Body<'/api/v1/mosques/{mosqueId}/dues/generate', 'post'>;
export type RecordDuesPaymentRequest = Body<'/api/v1/mosques/{mosqueId}/dues/charges/{chargeId}/payments', 'post'>;
export type WaiveDuesChargeRequest = Body<'/api/v1/mosques/{mosqueId}/dues/charges/{chargeId}/waive', 'post'>;
export type StaffResponse = Json<'/api/v1/mosques/{mosqueId}/staff', 'post'>;
export type CreateStaffRequest = Body<'/api/v1/mosques/{mosqueId}/staff', 'post'>;
export type PayrollRunResponse = Json<'/api/v1/mosques/{mosqueId}/payroll/runs', 'post'>;
export type PayrollLineResponse =
  Json<'/api/v1/mosques/{mosqueId}/payroll/runs/{runId}/lines', 'get'> extends (infer T)[] ? T : never;
export type CreatePayrollRunRequest = Body<'/api/v1/mosques/{mosqueId}/payroll/runs', 'post'>;
export type CommitteeMemberResponse = Json<'/api/v1/mosques/{mosqueId}/committee', 'post'>;
export type CreateCommitteeMemberRequest = Body<'/api/v1/mosques/{mosqueId}/committee', 'post'>;
export type EventResponse = Json<'/api/v1/mosques/{mosqueId}/events', 'post'>;
export type CreateEventRequest = Body<'/api/v1/mosques/{mosqueId}/events', 'post'>;
export type AnnouncementResponse = Json<'/api/v1/mosques/{mosqueId}/announcements', 'post'>;
export type CreateAnnouncementRequest = Body<'/api/v1/mosques/{mosqueId}/announcements', 'post'>;

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

export function generateDues(
  api: ApiClient, mosqueId: string, input: GenerateDuesRequest, idempotencyKey: string,
): Promise<DuesChargeResponse[]> {
  return api.post<DuesChargeResponse[]>(
    `/mosques/${mosqueId}/dues/generate`, input, { tenantId: mosqueId, idempotencyKey },
  );
}

export function listDuesChargesByPeriod(api: ApiClient, mosqueId: string, period: string): Promise<DuesChargeResponse[]> {
  return api.get<DuesChargeResponse[]>(`/mosques/${mosqueId}/dues/charges?period=${encodeURIComponent(period)}`, mosqueId);
}

export function listDuesChargesByHousehold(api: ApiClient, mosqueId: string, householdId: string): Promise<DuesChargeResponse[]> {
  return api.get<DuesChargeResponse[]>(`/mosques/${mosqueId}/households/${householdId}/dues`, mosqueId);
}

export function getDuesCharge(api: ApiClient, mosqueId: string, chargeId: string): Promise<DuesChargeResponse> {
  return api.get<DuesChargeResponse>(`/mosques/${mosqueId}/dues/charges/${chargeId}`, mosqueId);
}

export function listDuesPayments(api: ApiClient, mosqueId: string, chargeId: string): Promise<DuesPaymentResponse[]> {
  return api.get<DuesPaymentResponse[]>(`/mosques/${mosqueId}/dues/charges/${chargeId}/payments`, mosqueId);
}

export function recordDuesPayment(
  api: ApiClient, mosqueId: string, chargeId: string, input: RecordDuesPaymentRequest, idempotencyKey: string,
): Promise<DuesPaymentResponse> {
  return api.post<DuesPaymentResponse>(
    `/mosques/${mosqueId}/dues/charges/${chargeId}/payments`, input, { tenantId: mosqueId, idempotencyKey },
  );
}

export function waiveDuesCharge(
  api: ApiClient, mosqueId: string, chargeId: string, input: WaiveDuesChargeRequest, idempotencyKey: string,
): Promise<DuesChargeResponse> {
  return api.post<DuesChargeResponse>(
    `/mosques/${mosqueId}/dues/charges/${chargeId}/waive`, input, { tenantId: mosqueId, idempotencyKey },
  );
}

export function listStaff(api: ApiClient, mosqueId: string): Promise<StaffResponse[]> {
  return api.get<StaffResponse[]>(`/mosques/${mosqueId}/staff`, mosqueId);
}

export function createStaff(
  api: ApiClient, mosqueId: string, input: CreateStaffRequest, idempotencyKey: string,
): Promise<StaffResponse> {
  return api.post<StaffResponse>(`/mosques/${mosqueId}/staff`, input, { tenantId: mosqueId, idempotencyKey });
}

export function createPayrollRun(
  api: ApiClient, mosqueId: string, input: CreatePayrollRunRequest, idempotencyKey: string,
): Promise<PayrollRunResponse> {
  return api.post<PayrollRunResponse>(`/mosques/${mosqueId}/payroll/runs`, input, { tenantId: mosqueId, idempotencyKey });
}

export function getPayrollRun(api: ApiClient, mosqueId: string, runId: string): Promise<PayrollRunResponse> {
  return api.get<PayrollRunResponse>(`/mosques/${mosqueId}/payroll/runs/${runId}`, mosqueId);
}

export function listPayrollLines(api: ApiClient, mosqueId: string, runId: string): Promise<PayrollLineResponse[]> {
  return api.get<PayrollLineResponse[]>(`/mosques/${mosqueId}/payroll/runs/${runId}/lines`, mosqueId);
}

export function postPayrollRun(
  api: ApiClient, mosqueId: string, runId: string, idempotencyKey: string,
): Promise<PayrollRunResponse> {
  return api.post<PayrollRunResponse>(
    `/mosques/${mosqueId}/payroll/runs/${runId}/post`, undefined, { tenantId: mosqueId, idempotencyKey },
  );
}

export function listCommitteeMembers(api: ApiClient, mosqueId: string): Promise<CommitteeMemberResponse[]> {
  return api.get<CommitteeMemberResponse[]>(`/mosques/${mosqueId}/committee`, mosqueId);
}

export function createCommitteeMember(
  api: ApiClient, mosqueId: string, input: CreateCommitteeMemberRequest, idempotencyKey: string,
): Promise<CommitteeMemberResponse> {
  return api.post<CommitteeMemberResponse>(`/mosques/${mosqueId}/committee`, input, { tenantId: mosqueId, idempotencyKey });
}

export function listUpcomingEvents(api: ApiClient, mosqueId: string): Promise<EventResponse[]> {
  return api.get<EventResponse[]>(`/mosques/${mosqueId}/events`, mosqueId);
}

export function createEvent(
  api: ApiClient, mosqueId: string, input: CreateEventRequest, idempotencyKey: string,
): Promise<EventResponse> {
  return api.post<EventResponse>(`/mosques/${mosqueId}/events`, input, { tenantId: mosqueId, idempotencyKey });
}

export function listAnnouncements(api: ApiClient, mosqueId: string): Promise<AnnouncementResponse[]> {
  return api.get<AnnouncementResponse[]>(`/mosques/${mosqueId}/announcements`, mosqueId);
}

export function createAnnouncement(
  api: ApiClient, mosqueId: string, input: CreateAnnouncementRequest, idempotencyKey: string,
): Promise<AnnouncementResponse> {
  return api.post<AnnouncementResponse>(`/mosques/${mosqueId}/announcements`, input, { tenantId: mosqueId, idempotencyKey });
}
