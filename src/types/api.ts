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

export type PropertyType = 'boys' | 'girls' | 'coliving';

export interface IProperty {
  _id: string;
  organization: string;
  name: string;
  type: PropertyType;
  address?: string;
  upiVpa: string;
  electricityRatePaisePerUnit: Paise;
  isActive?: boolean;
  stats?: {
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    occupancyRate: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface IRoom {
  _id: string;
  organization?: string;
  property: string;
  floorNumber: number;
  roomNumber: string;
  sharingType: number;
  baseRentPaisePerBed: Paise;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type BedStatus = 'available' | 'occupied' | 'notice_period' | 'maintenance';

export interface IBed {
  _id: string;
  organization?: string;
  property: string;
  room: string | IRoom;
  bedNumber: string;
  status: BedStatus;
  currentTenant?: string | ITenant;
  noticeEndDate?: string;
  maintenanceNote?: string;
  createdAt?: string;
  updatedAt?: string;
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
  createdAt?: string;
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

export interface IUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'manager' | 'staff';
  status?: 'active' | 'inactive';
  createdAt?: string;
}

export interface AuthResponseData {
  token: string;
  user: IUser;
  organization: IOrganization;
  subscription: ISubscription | null;
}

export interface RegisterOwnerPayload {
  ownerName: string;
  orgName: string;
  phone: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

// ==========================================
// STAGE 2: PROPERTY & MATRIX CONTRACTS
// ==========================================

export interface CreatePropertyPayload {
  name: string;
  type: PropertyType;
  address?: string;
  upiVpa: string;
  electricityRatePaisePerUnit: Paise;
}

export interface CreateRoomPayload {
  floorNumber: number;
  roomNumber: string;
  sharingType: number;
  baseRentPaisePerBed: Paise;
  tags?: string[];
}

export interface UpdateBedStatusPayload {
  status: BedStatus;
  maintenanceNote?: string;
  noticeEndDate?: string;
}

export interface IMatrixBedTenant {
  _id: string;
  fullName: string;
  phone: string;
  monthlyRentPaise: Paise;
  status?: string;
  joinedDate?: string;
  rentDuePaise?: Paise;
  overdueDays?: number;
  paymentStatus?: 'PAID' | 'DUE';
}

export interface IMatrixBed {
  _id: string;
  bedNumber: string;
  status: BedStatus;
  currentTenant?: IMatrixBedTenant | null;
  noticeEndDate?: string;
  maintenanceNote?: string;
  baseRentPaise: Paise;
}

export interface IMatrixRoom {
  _id: string;
  roomNumber: string;
  floorNumber: number;
  sharingType: number;
  baseRentPaisePerBed: Paise;
  tags: string[];
  beds: IMatrixBed[];
}

export interface IMatrixFloor {
  floorNumber: number;
  rooms: IMatrixRoom[];
}

export interface IMatrixSummary {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  noticePeriodBeds: number;
  maintenanceBeds: number;
  occupancyRate: number;
}

export interface PropertyMatrixData {
  property: {
    _id: string;
    name: string;
    type: PropertyType;
    address?: string;
    upiVpa: string;
    electricityRatePaisePerUnit: Paise;
  };
  floors: IMatrixFloor[];
  summary: IMatrixSummary;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}
