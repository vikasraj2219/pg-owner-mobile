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
  scheduledPlan?: 'starter' | 'growth' | 'pro' | null;
  scheduledPlanEffectiveAt?: string | null;
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

export interface ITenantListItem {
  _id: string;
  organization: string;
  property: {
    _id: string;
    name: string;
    type?: string;
    address?: string;
    upiVpa?: string;
  };
  currentBed?: {
    _id: string;
    bedNumber: string;
    status: string;
    room?: {
      _id?: string;
      roomNumber: string;
      floorNumber: number;
      sharingType: number;
      baseRentPaisePerBed?: number;
    };
  };
  fullName: string;
  phone: string;
  emergencyPhone?: string;
  email?: string;
  monthlyRentPaise: Paise;
  depositPaise: Paise;
  depositPaidPaise: Paise;
  balanceDuePaise?: Paise;
  hasOverdue?: boolean;
  kycDocType?: 'aadhaar' | 'pan' | 'passport' | 'voter_id';
  kycMaskedNumber?: string;
  kycDocUrl?: string;
  kycConsent: boolean;
  status: 'active' | 'notice_period' | 'checked_out';
  joinedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IPayment {
  _id: string;
  organization: string;
  property: string;
  tenant: string;
  invoice: string;
  receiptNumber: string;
  amountPaidPaise: Paise;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer';
  transactionReference?: string;
  notes?: string;
  paymentDate: string;
  createdAt?: string;
}

export interface IDepositLedger {
  _id: string;
  organization: string;
  property: string;
  tenant: string;
  amountPaise: Paise;
  type: 'received' | 'refunded' | 'deducted';
  paymentMethod: string;
  notes?: string;
  date: string;
  createdAt?: string;
}

export interface IBedAssignment {
  _id: string;
  organization: string;
  property: string;
  bed: {
    _id: string;
    bedNumber: string;
  };
  room?: {
    _id: string;
    roomNumber: string;
    floorNumber: number;
  };
  tenant: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'transferred' | 'vacated';
  notes?: string;
}

export interface ITenantDetailData {
  tenant: ITenantListItem;
  invoices: IInvoice[];
  deposits: IDepositLedger[];
  bedHistory: IBedAssignment[];
  payments: IPayment[];
  balanceDuePaise: Paise;
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

export interface UpdatePropertyPayload {
  name?: string;
  type?: PropertyType;
  address?: string;
  upiVpa?: string;
  electricityRatePaisePerUnit?: Paise;
}

export interface CreateRoomPayload {
  floorNumber: number;
  roomNumber: string;
  sharingType: number;
  baseRentPaisePerBed: Paise;
  tags?: string[];
}

export interface UpdateRoomPayload {
  roomNumber?: string;
  floorNumber?: number;
  sharingType?: number;
  baseRentPaisePerBed?: Paise;
  tags?: string[];
}

export interface AddBedPayload {
  bedNumber?: string;
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
  kycDocUrl?: string;
  kycDocType?: string;
  kycMaskedNumber?: string;
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

// ==========================================
// STAGE 3: QUICK CHECKIN & TENANT CONTRACTS
// ==========================================

export interface QuickCheckinPayload {
  propertyId: string;
  bedId: string;
  fullName: string;
  phone: string;
  emergencyPhone?: string;
  joinDate?: string;
  monthlyRentPaise: Paise;
  depositPaise: Paise;
  depositPaidPaise: Paise;
  depositPaymentMethod: 'cash' | 'upi' | 'bank_transfer';
  depositTransactionRef?: string;
  kycDocType?: 'aadhaar' | 'pan' | 'passport' | 'voter_id';
  kycMaskedNumber?: string;
  kycDocUrl?: string;
  kycConsent: boolean;
}

export interface QuickCheckinResponseData {
  tenant: ITenant;
  bed: {
    _id: string;
    bedNumber: string;
    status: BedStatus;
  };
  invoice: IInvoice;
  deposit?: {
    _id: string;
    amountPaise: Paise;
    type: string;
    paymentMethod: string;
    date: string;
  } | null;
  proration: {
    monthlyRentPaise: Paise;
    payablePaise: Paise;
    totalDays: number;
    billableDays: number;
    joinDay: number;
    month: number;
    year: number;
    isProrated: boolean;
  };
}

export interface ActivityFeedItem {
  id: string;
  type: 'payment' | 'checkin';
  title: string;
  subtitle: string;
  amountPaise?: Paise;
  timestamp: string;
}

export interface DashboardStats {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds?: number;
  noticeBeds?: number;
  occupancyRate: number;
  collectedThisMonthPaise: Paise;
  expectedThisMonthPaise: Paise;
  pendingAmountPaise: Paise;
  collectionRate: number;
  overdueCount: number;
  overdueAmountPaise: Paise;
  netProfitPaise: Paise;
  totalTenants: number;
  recentActivity?: ActivityFeedItem[];
}

export interface DueInvoiceItem {
  _id: string;
  invoiceNumber: string;
  month: number;
  year: number;
  dueDate: string;
  totalAmountPaise: Paise;
  amountPaidPaise: Paise;
  balanceDuePaise: Paise;
  status: 'unpaid' | 'partially_paid' | 'paid' | 'canceled';
  overdueDays?: number;
  tenant: {
    _id: string;
    fullName: string;
    phone: string;
    currentBed?:
      | {
          _id: string;
          bedNumber: string;
        }
      | string;
    status?: string;
  };
  property: {
    _id: string;
    name: string;
    type?: string;
    upiVpa?: string;
  };
}

export interface PaymentRecord {
  _id: string;
  receiptNumber: string;
  amountPaidPaise: Paise;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer';
  transactionReference?: string;
  notes?: string;
  paymentDate: string;
}

export interface MarkPaidResponseData {
  invoice: DueInvoiceItem;
  payment: PaymentRecord;
}

// ==========================================
// STAGE 6: OPERATIONS, CHECKOUT, METERS & P&L
// ==========================================

export interface ISettlementStatement {
  _id: string;
  settlementNumber: string;
  checkinDate?: string;
  checkoutDate: string;
  depositPaidPaise: Paise;
  unpaidDuesPaise: Paise;
  damageDeductionsPaise: Paise;
  electricityDeductionsPaise: Paise;
  otherDeductionsPaise: Paise;
  totalDeductionsPaise: Paise;
  netRefundPaise: Paise;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer';
  transactionReference?: string;
  notes?: string;
  tenant?: {
    _id: string;
    fullName: string;
    phone: string;
  };
  property?: {
    _id: string;
    name: string;
    code: string;
  };
  bed?: {
    _id: string;
    bedNumber: string;
  };
}

export interface CheckoutPreviewData {
  tenant: {
    _id: string;
    fullName: string;
    phone: string;
    status: string;
    joinedDate?: string;
    currentBed?: {
      _id: string;
      bedNumber: string;
      status: string;
    };
    room?: {
      _id: string;
      roomNumber: string;
      floorNumber: number;
    };
  };
  depositPaidPaise: Paise;
  unpaidInvoices: Array<{
    _id: string;
    invoiceNumber: string;
    month: number;
    year: number;
    totalAmountPaise: Paise;
    amountPaidPaise: Paise;
    balanceDuePaise: Paise;
    dueDate: string;
    status: string;
  }>;
  unpaidDuesPaise: Paise;
  estimatedRefundPaise: Paise;
}

export interface CheckoutConfirmPayload {
  tenantId: string;
  damageDeductionsPaise?: Paise;
  electricityDeductionsPaise?: Paise;
  otherDeductionsPaise?: Paise;
  refundPaise?: Paise;
  paymentMethod?: 'cash' | 'upi' | 'bank_transfer';
  transactionReference?: string;
  notes?: string;
}

export interface IMeterReading {
  _id: string;
  meterIdentifier?: string;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  ratePaisePerUnit: Paise;
  totalAmountPaise: Paise;
  readingDate: string;
  photoUrl?: string;
  splitMethod: 'equal' | 'by_days_occupied';
  tenantSplits: Array<{
    tenant: {
      _id: string;
      fullName: string;
      phone: string;
    };
    daysOccupied: number;
    sharePaise: Paise;
  }>;
}

export interface IExpense {
  _id: string;
  category:
    | 'maintenance'
    | 'electricity'
    | 'water'
    | 'wifi'
    | 'groceries_food'
    | 'staff_salary'
    | 'rent_lease'
    | 'cleaning'
    | 'other';
  amountPaise: Paise;
  description: string;
  date: string;
  receiptUrl?: string;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer';
  paidTo?: string;
  property?: {
    _id: string;
    name: string;
    code: string;
  };
}

export interface IPnLSummary {
  period: {
    month: number;
    year: number;
    start: string;
    end: string;
  };
  collectionsPaise: Paise;
  expensesPaise: Paise;
  netCashflowPaise: Paise;
  profitMarginRate: number;
  categoryBreakdown: Array<{
    category: string;
    amountPaise: Paise;
    percentage: number;
  }>;
  totalExpensesCount: number;
  totalPaymentsCount: number;
}

// ==========================================
// STAGE 7: TEAM ROLES & SUBSCRIPTION PAYWALL
// ==========================================

export interface ITeamMember {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'manager' | 'staff';
  status: 'active' | 'inactive';
  assignedProperties?: Array<{
    _id: string;
    name: string;
    code: string;
  }>;
  createdAt: string;
}

export interface ISubscriptionCurrent {
  plan: 'starter' | 'growth' | 'pro';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  isReadOnly: boolean;
  daysLeft: number;
  trialEndsAt: string;
  currentPeriodEnd: string;
  maxProperties: number;
  maxBeds: number;
  scheduledPlan?: 'starter' | 'growth' | 'pro' | null;
  scheduledPlanEffectiveAt?: string | null;
  propertiesUsed: number;
  bedsUsed: number;
  upgradeUrl: string;
}
