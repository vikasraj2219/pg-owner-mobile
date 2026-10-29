// All monetary values are represented strictly in integer paise (₹1,000 = 100000 paise)

export type Paise = number;

export interface IOrganization {
  _id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  settings: {
    rentDueDay: number;
    gracePeriodDays: number;
    defaultLateFeePaise: Paise;
  };
}

export interface ISubscription {
  _id: string;
  organization: string;
  plan: 'starter' | 'growth' | 'pro';
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  trialEndsAt: string;
  currentPeriodEnd: string;
  maxProperties: number;
  maxBeds: number;
}

export interface IProperty {
  _id: string;
  organization: string;
  name: string;
  type: 'boys' | 'girls' | 'coliving';
  upiVpa: string;
  electricityRatePaisePerUnit: Paise;
}

export interface IRoom {
  _id: string;
  property: string;
  floorNumber: number;
  roomNumber: string;
  sharingType: number;
  baseRentPaisePerBed: Paise;
}

export interface IBed {
  _id: string;
  property: string;
  room: string;
  bedNumber: string;
  status: 'available' | 'occupied' | 'notice_period' | 'maintenance';
  currentTenant?: string;
}

export interface ITenant {
  _id: string;
  organization: string;
  property: string;
  currentBed: string;
  fullName: string;
  phone: string;
  emergencyPhone: string;
  monthlyRentPaise: Paise;
  depositPaise: Paise;
  depositPaidPaise: Paise;
  kycDocType?: 'aadhaar' | 'pan' | 'passport' | 'voter_id';
  kycMaskedNumber?: string;
  kycDocUrl?: string;
  kycConsent: boolean;
  status: 'active' | 'notice_period' | 'checked_out';
}

export interface IInvoice {
  _id: string;
  organization: string;
  property: string;
  tenant: string;
  invoiceNumber: string;
  month: number;
  year: number;
  dueDate: string;
  items: Array<{
    description: string;
    amountPaise: Paise;
    category: 'rent' | 'electricity' | 'mess' | 'late_fee' | 'damage';
  }>;
  totalAmountPaise: Paise;
  amountPaidPaise: Paise;
  balanceDuePaise: Paise;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'canceled';
}
