/** Shapes the platform console reads from the Salon OS API. */

export interface Envelope<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details?: unknown };
  requestId?: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export type Money = string | number;

export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
}

export type MeterKey = 'WA_UTILITY' | 'WA_MARKETING' | 'WA_AUTHENTICATION' | 'SMS' | 'EMAIL';

export const METER_LABELS: Record<MeterKey, string> = {
  WA_UTILITY: 'WhatsApp utility',
  WA_MARKETING: 'WhatsApp marketing',
  WA_AUTHENTICATION: 'WhatsApp authentication',
  SMS: 'SMS',
  EMAIL: 'Email',
};

/** Anything at or above this is sold as "unlimited" — a fair-use figure. */
export const FAIR_USE_UNLIMITED = 1_000_000;

export interface Plan {
  id: string;
  code: string;
  name: string;
  pricePerMonth: Money;
  pricePerYear: Money | null;
  maxBranches: number;
  maxStaff: number;
  maxCustomers: number;
  waUtilityQuota: number;
  waMarketingQuota: number;
  waAuthQuota: number;
  smsQuota: number;
  emailQuota: number;
  maxCampaignsPerMonth: number;
  extraBranchPrice: Money | null;
  features: Record<string, boolean>;
  isActive: boolean;
}

export interface CreditPack {
  id: string;
  code: string;
  name: string;
  meter: MeterKey;
  quantity: number;
  price: Money;
  planId: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface MeterSummary {
  meter: MeterKey;
  label: string;
  included: number;
  used: number;
  remaining: number;
  blocked: number;
  credits: number;
  available: number;
  percentUsed: number;
}

export interface SendingStatus {
  blocked: boolean;
  blockedAt: string | null;
  reason: string | null;
  owedMessages: number;
}

export interface UsageSummary {
  sending: SendingStatus;
  period: { start: string; end: string; label: string; daysLeft: number };
  plan: { code: string; name: string } | null;
  meters: MeterSummary[];
}

export interface LimitCheck {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
}

export interface LimitsSummary {
  plan: { code: string; name: string; extraBranchPrice: Money | null } | null;
  branches: LimitCheck;
  staff: LimitCheck;
  customers: LimitCheck;
  campaigns?: LimitCheck;
}

export interface CreditEntry {
  id: string;
  meter: MeterKey;
  delta: number;
  balanceAfter: number;
  reason: 'PURCHASE' | 'CONSUMPTION' | 'ADJUSTMENT' | 'EXPIRY';
  amountPaid: Money | null;
  paymentMode: string | null;
  reference: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
  pack?: { code: string; name: string } | null;
}

/** Keys must match src/core/features.ts on the backend. */
export const FEATURE_LABELS: Record<string, string> = {
  prebuiltCampaigns: 'Pre-built campaigns',
  customCampaigns: 'Custom campaigns',
  automation: 'Automation',
  campaignAnalytics: 'Campaign analytics',
  segmentsAdvanced: 'Advanced segmentation',
  automationAdvanced: 'Advanced automation',
  campaignAnalyticsAdvanced: 'Advanced campaign analytics',
  crmAdvanced: 'Advanced CRM',
  staffAnalyticsAdvanced: 'Advanced staff analytics',
  leads: 'Lead management',
  campaigns: 'Marketing campaigns',
  journeys: 'Automated journeys',
  segments: 'Customer segmentation',
  loyalty: 'Loyalty points',
  packages: 'Service packages',
  memberships: 'Memberships',
  customerPortal: 'Customer portal',
  advancedReports: 'Advanced reports',
  multiBranch: 'Multiple branches',
  inventory: 'Inventory',
  suppliers: 'Supplier management',
  expenses: 'Expenses',
  commissions: 'Staff commissions',
  unitEconomics: 'Unit economics',
  marketingRoi: 'Marketing ROI',
  customRoles: 'Role-based permissions',
  prioritySupport: 'Priority support',
};

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  gstin: string | null;
  phone: string;
  email: string;
  city: string | null;
  state: string | null;
  currency: string;
  timezone: string;
  status: TenantStatus;
  trialEndsAt: string | null;
  createdAt: string;
  plan: { name: string; code: string } | null;
  _count?: { branches: number; users: number; customers: number; appointments?: number; invoices?: number };
  subscriptions?: {
    id: string;
    planCode: string;
    startedAt: string;
    currentPeriodEnd: string;
    amount: Money;
    isActive: boolean;
  }[];
}

export interface PlatformStats {
  tenants: number;
  tenantsByStatus: Record<string, number>;
  branches: number;
  customers: number;
  grossTransactionValue: Money;
}

export interface ProvisionResult {
  tenant: Tenant;
  branch: { id: string; name: string; code: string };
  owner: { id: string; email: string; name: string };
}
