export type ApiRole = "OWNER" | "ACCOUNTS" | "SUPERVISOR" | "FARMER";
export type ApiUserStatus = "ACTIVE" | "INVITED" | "DISABLED";
export type ApiFarmStatus = "ACTIVE" | "INACTIVE";
export type ApiBatchStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "PLANNED"
  | "SALES_RUNNING"
  | "SETTLEMENT_PENDING"
  | "CLOSED";
export type ApiSaleStatus = "CANCELLED" | "DRAFT" | "CONFIRMED";
export type ApiTreatmentKind = "OTHER" | "VACCINATION" | "MEDICATION";
export type ApiExpenseCategoryCode =
  | "CHICKS"
  | "FEED"
  | "MEDICINE"
  | "VACCINE"
  | "TRANSPORT"
  | "OFFICE_EXPENSE"
  | "SUPERVISOR_EXPENSE"
  | "OTHER_COMPANY"
  | "ELECTRICITY"
  | "COCO_PITH"
  | "LABOUR"
  | "WATER"
  | "DIESEL"
  | "SHED_MAINTENANCE"
  | "REPAIRS"
  | "MISCELLANEOUS"
  | "OTHER_FARMER";

export type ApiCostCategory = ApiExpenseCategoryCode;
export type ApiExpenseLedger = "COMPANY" | "FARMER";
export type ApiExpenseApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ApiTransactionPaymentStatus = "CANCELLED" | "PENDING" | "PARTIAL" | "PAID";
export type ApiInventoryMovementType = "PURCHASE" | "ALLOCATION" | "ADJUSTMENT" | "RETURN";
export type ApiPurchaseType = "CHICKS" | "FEED" | "MEDICINE" | "VACCINE" | "EQUIPMENT" | "OTHER";
export type ApiFinanceEntryType = "INVESTMENT" | "OTHER_INCOME" | "OTHER_EXPENSE";
export type ApiPaymentDirection = "INBOUND" | "OUTBOUND";
export type ApiPaymentEntryType =
  | "OTHER"
  | "PURCHASE"
  | "EXPENSE"
  | "SALE_RECEIPT"
  | "SETTLEMENT"
  | "INVESTMENT";
export type ApiPayoutUnit = "PER_BIRD_PLACED" | "PER_BIRD_SOLD" | "PER_KG_SOLD";
export type ApiSettlementStatus = "DRAFT" | "FINALIZED";
export type ApiCatalogItemType = ApiPurchaseType;
export type ApiCommentTargetType =
  | "PURCHASE"
  | "SETTLEMENT"
  | "FARM"
  | "BATCH"
  | "DAILY_LOG"
  | "TREATMENT"
  | "COST"
  | "SALE"
  | "PAYMENT";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ListResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type ApiUser = {
  id: string;
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: ApiRole;
  status: ApiUserStatus;
  mustChangePassword?: boolean;
  biometricEnabled?: boolean;
  permissions?: ApiPermissionMatrix;
  assignedFarmIds?: string[];
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiPermissionMatrix = {
  dailyEntry?: boolean;
  salesEntry?: boolean;
  expenseEntry?: boolean;
  inventoryView?: boolean;
  costVisibility?: boolean;
  reportAccess?: boolean;
  companyExpenseEntry?: boolean;
  farmerExpenseApproval?: boolean;
  purchaseEntry?: boolean;
  settlementEntry?: boolean;
  financialDashboard?: boolean;
};

export type ApiFarmAssignment = {
  userId: string;
  name: string;
  role: ApiRole;
};

export type ApiFarm = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  location?: string | null;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  capacity?: number | null;
  status: ApiFarmStatus;
  notes?: string | null;
  primaryFarmerId?: string | null;
  supervisorId?: string | null;
  primaryFarmerName?: string | null;
  supervisorName?: string | null;
  assignments: ApiFarmAssignment[];
  activeBatchCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiBatchSummary = {
  currentAgeDays?: number | null;
  liveBirds?: number | null;
  mortalityCount?: number | null;
  cullCount?: number | null;
  mortalityPercent?: number | null;
  soldBirds?: number | null;
  totalFeedConsumedKg?: number | null;
  totalWeightSoldKg?: number | null;
  averageWeightGrams?: number | null;
  fcr?: number | null;
};

export type ApiBatch = {
  id: string;
  organizationId: string;
  farmId: string;
  farmName?: string | null;
  code: string;
  placementDate: string;
  placementCount: number;
  totalChicksPurchased?: number | null;
  freeChicks?: number | null;
  chargeableChicks?: number | null;
  placementMortality?: number | null;
  chickCostTotal?: number | null;
  chickRatePerBird?: number | null;
  ratePerChick?: number | null;
  chickTransportCharge?: number | null;
  sourceHatchery?: string | null;
  vendorName?: string | null;
  targetCloseDate?: string | null;
  actualCloseDate?: string | null;
  status: ApiBatchStatus;
  lockedAt?: string | null;
  notes?: string | null;
  summary?: ApiBatchSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiTrader = {
  id: string;
  organizationId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiDailyLog = {
  id: string;
  organizationId: string;
  batchId: string;
  logDate: string;
  openingBirdCount?: number | null;
  mortalityCount?: number | null;
  cullCount?: number | null;
  feedConsumedKg?: number | null;
  waterConsumedLtr?: number | null;
  avgWeightGrams?: number | null;
  notes?: string | null;
  clientReferenceId?: string | null;
  recordedById?: string | null;
  correctedById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiSale = {
  id: string;
  organizationId: string;
  batchId: string;
  traderId: string;
  traderName?: string | null;
  saleDate: string;
  vehicleNumber?: string | null;
  birdCount?: number | null;
  totalWeightKg?: number | null;
  averageWeightKg?: number | null;
  loadingMortalityCount?: number | null;
  ratePerKg?: number | null;
  grossAmount?: number | null;
  transportCharge?: number | null;
  commissionCharge?: number | null;
  otherDeduction?: number | null;
  netAmount?: number | null;
  paymentReceivedAmount?: number | null;
  paymentStatus?: ApiTransactionPaymentStatus | null;
  status: ApiSaleStatus;
  notes?: string | null;
  clientReferenceId?: string | null;
  createdById?: string | null;
  finalizedById?: string | null;
  finalizedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiTreatment = {
  id: string;
  organizationId: string;
  batchId: string;
  dailyLogId?: string | null;
  kind: ApiTreatmentKind;
  catalogItemId?: string | null;
  treatmentDate: string;
  treatmentName: string;
  dosage?: string | null;
  birdCount?: number | null;
  notes?: string | null;
  clientReferenceId?: string | null;
  administeredById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiCatalogItem = {
  id: string;
  organizationId: string;
  name: string;
  type: ApiCatalogItemType;
  sku?: string | null;
  unit: string;
  defaultRate?: number | null;
  manufacturer?: string | null;
  reorderLevel?: number | null;
  currentStock?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiBatchExpense = {
  id: string;
  organizationId: string;
  batchId: string;
  catalogItemId?: string | null;
  ledger: ApiExpenseLedger;
  category: ApiExpenseCategoryCode;
  expenseDate: string;
  description: string;
  quantity?: number | null;
  unit?: string | null;
  rate?: number | null;
  totalAmount: number;
  vendorName?: string | null;
  invoiceNumber?: string | null;
  billPhotoUrl?: string | null;
  paymentStatus?: ApiTransactionPaymentStatus | null;
  paidAmount?: number | null;
  approvalStatus?: ApiExpenseApprovalStatus | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  notes?: string | null;
  clientReferenceId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiCost = ApiBatchExpense;

export type ApiInventoryLedgerEntry = {
  id: string;
  organizationId: string;
  catalogItemId: string;
  catalogItemName?: string | null;
  batchId?: string | null;
  movementType: ApiInventoryMovementType;
  movementDate: string;
  quantityIn?: number | null;
  quantityOut?: number | null;
  balanceAfter?: number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
};

export type ApiFinancePurchase = {
  id: string;
  organizationId: string;
  batchId?: string | null;
  purchaseType: ApiPurchaseType;
  vendorName?: string | null;
  catalogItemId?: string | null;
  itemName: string;
  quantity?: number | null;
  unit?: string | null;
  unitCost?: number | null;
  totalAmount: number;
  invoiceNumber?: string | null;
  paymentStatus: ApiTransactionPaymentStatus;
  paidAmount?: number | null;
  purchaseDate: string;
  attachmentUrl?: string | null;
  remarks?: string | null;
  clientReferenceId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiFinanceEntry = {
  id: string;
  organizationId: string;
  type: ApiFinanceEntryType;
  amount: number;
  paymentStatus: ApiTransactionPaymentStatus;
  entryDate: string;
  description: string;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiFinancePayment = {
  id: string;
  organizationId: string;
  batchId?: string | null;
  partyName?: string | null;
  paymentType: ApiPaymentEntryType;
  direction: ApiPaymentDirection;
  amount: number;
  paymentDate: string;
  referenceType?: ApiPaymentEntryType | string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiBatchSettlement = {
  id: string;
  organizationId: string;
  batchId: string;
  farmerId?: string | null;
  farmerName?: string | null;
  payoutRate: number;
  payoutUnit: ApiPayoutUnit;
  baseQuantity?: number | null;
  growingCharges?: number | null;
  performanceBonus?: number | null;
  incentiveAmount?: number | null;
  otherDeductions?: number | null;
  farmerExpenseTotal?: number | null;
  netPayable?: number | null;
  paymentStatus?: ApiTransactionPaymentStatus | null;
  status: ApiSettlementStatus;
  remarks?: string | null;
  finalizedById?: string | null;
  finalizedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiBatchPnl = {
  batchId: string;
  batchCode?: string | null;
  company: {
    netProfitOrLoss?: number | null;
    expenses?: number | null;
    salesRevenue?: number | null;
  };
  farmer: {
    netEarnings?: number | null;
    expenses?: number | null;
    incentives?: number | null;
    growingIncome?: number | null;
  };
};

export type ApiComment = {
  id: string;
  organizationId: string;
  batchId?: string | null;
  targetType: ApiCommentTargetType;
  targetId: string;
  comment: string;
  correctionNote?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserRequest = {
  name: string;
  password: string;
  role: ApiRole;
  email?: string;
  phone?: string;
  permissions?: ApiPermissionMatrix;
  assignedFarmIds?: string[];
  mustChangePassword?: boolean;
};

export type UpdateUserRequest = {
  name?: string;
  password?: string;
  role?: ApiRole;
  email?: string;
  phone?: string;
  permissions?: ApiPermissionMatrix;
  assignedFarmIds?: string[];
  biometricEnabled?: boolean;
  mustChangePassword?: boolean;
};

export type UpdateUserStatusRequest = {
  status: ApiUserStatus;
};

export type ResetUserPasswordRequest = {
  newPassword: string;
  mustChangePassword?: boolean;
};

export type CreateFarmRequest = {
  name: string;
  code: string;
  location?: string;
  village?: string;
  district?: string;
  state?: string;
  capacity?: number;
  notes?: string;
  primaryFarmerId?: string;
  supervisorId?: string;
  assignmentUserIds?: string[];
};

export type UpdateFarmRequest = CreateFarmRequest & {
  status?: ApiFarmStatus;
};

export type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CreateBatchRequest = {
  farmId: string;
  code: string;
  placementDate: string;
  placementCount: number;
  totalChicksPurchased?: number;
  freeChicks?: number;
  chargeableChicks?: number;
  placementMortality?: number;
  chickCostTotal?: number;
  chickRatePerBird?: number;
  chickTransportCharge?: number;
  sourceHatchery?: string;
  vendorName?: string;
  targetCloseDate?: string;
  notes?: string;
};

export type UpdateBatchRequest = Partial<
  Omit<CreateBatchRequest, "farmId"> & {
    ratePerChick?: number;
    actualCloseDate?: string | null;
  }
>;

export type UpdateBatchStatusRequest = {
  status: ApiBatchStatus;
  actualCloseDate?: string | null;
};

export type CreateDailyLogRequest = {
  logDate: string;
  openingBirdCount?: number;
  mortalityCount?: number;
  cullCount?: number;
  feedConsumedKg?: number;
  waterConsumedLtr?: number;
  avgWeightGrams?: number;
  notes?: string;
  clientReferenceId?: string;
};

export type UpdateDailyLogRequest = Partial<
  Omit<CreateDailyLogRequest, "clientReferenceId">
>;

export type CreateSaleRequest = {
  traderId: string;
  saleDate: string;
  vehicleNumber?: string;
  birdCount?: number;
  totalWeightKg?: number;
  averageWeightKg?: number;
  loadingMortalityCount?: number;
  ratePerKg?: number;
  grossAmount?: number;
  transportCharge?: number;
  commissionCharge?: number;
  otherDeduction?: number;
  netAmount?: number;
  paymentReceivedAmount?: number;
  paymentStatus?: ApiTransactionPaymentStatus;
  status?: ApiSaleStatus;
  notes?: string;
  clientReferenceId?: string;
};

export type FinalizeSaleRequest = {
  ratePerKg?: number;
  grossAmount?: number;
  transportCharge?: number;
  commissionCharge?: number;
  otherDeduction?: number;
  netAmount?: number;
  paymentReceivedAmount?: number;
  paymentStatus?: ApiTransactionPaymentStatus;
  notes?: string;
};

export type CreateTraderRequest = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export type UpdateTraderRequest = Partial<CreateTraderRequest>;

export type CreateCatalogItemRequest = {
  name: string;
  type: ApiCatalogItemType;
  sku?: string;
  unit: string;
  defaultRate?: number;
  manufacturer?: string;
  reorderLevel?: number;
  currentStock?: number;
};

export type UpdateCatalogItemRequest = Partial<CreateCatalogItemRequest> & {
  isActive?: boolean;
};

export type CreateBatchExpenseRequest = {
  ledger: ApiExpenseLedger;
  category: ApiExpenseCategoryCode;
  catalogItemId?: string;
  expenseDate: string;
  description: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  totalAmount?: number;
  vendorName?: string;
  invoiceNumber?: string;
  billPhotoUrl?: string;
  notes?: string;
  clientReferenceId?: string;
};

export type UpdateBatchExpenseRequest = Partial<
  Omit<CreateBatchExpenseRequest, "clientReferenceId">
> & {
  paymentStatus?: ApiTransactionPaymentStatus;
  paidAmount?: number;
};

export type UpdateBatchExpenseApprovalRequest = {
  approvalStatus: ApiExpenseApprovalStatus;
  rejectedReason?: string;
};

export type CreateBatchCostRequest = CreateBatchExpenseRequest;

export type CreateFinancePurchaseRequest = {
  batchId?: string;
  purchaseType: ApiPurchaseType;
  vendorName?: string;
  catalogItemId?: string;
  itemName: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  totalAmount: number;
  invoiceNumber?: string;
  paymentStatus?: ApiTransactionPaymentStatus;
  purchaseDate: string;
  attachmentUrl?: string;
  remarks?: string;
  clientReferenceId?: string;
};

export type UpdateFinancePurchaseRequest = Partial<
  Omit<CreateFinancePurchaseRequest, "clientReferenceId">
>;

export type CreateFinanceEntryRequest = {
  type: ApiFinanceEntryType;
  amount: number;
  paymentStatus?: ApiTransactionPaymentStatus;
  entryDate: string;
  description: string;
  notes?: string;
};

export type CreateFinancePaymentRequest = {
  batchId?: string;
  partyName?: string;
  paymentType: ApiPaymentEntryType;
  direction: ApiPaymentDirection;
  amount: number;
  paymentDate: string;
  referenceType?: ApiPaymentEntryType | string;
  referenceId?: string;
  notes?: string;
};

export type AllocateInventoryRequest = {
  batchId: string;
  catalogItemId: string;
  quantity: number;
  remarks?: string;
};

export type CreateBatchSettlementRequest = {
  payoutRate: number;
  payoutUnit: ApiPayoutUnit;
  performanceBonus?: number;
  incentiveAmount?: number;
  otherDeductions?: number;
  paymentStatus?: ApiTransactionPaymentStatus;
  remarks?: string;
};

export type CreateTreatmentRequest = {
  dailyLogId?: string;
  kind: ApiTreatmentKind;
  catalogItemId?: string;
  treatmentDate: string;
  treatmentName: string;
  dosage?: string;
  birdCount?: number;
  notes?: string;
  clientReferenceId?: string;
};

export type CreateCommentRequest = {
  targetType: ApiCommentTargetType;
  targetId: string;
  comment: string;
  correctionNote?: string;
};
