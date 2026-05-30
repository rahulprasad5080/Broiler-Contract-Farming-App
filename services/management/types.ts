import {
  API_BATCH_STATUS_VALUES,
  API_CATALOG_ITEM_TYPE_VALUES,
  API_COMPANY_EXPENSE_CATEGORY_CODE_VALUES,
  API_COMMENT_TARGET_TYPE_VALUES,
  API_EXPENSE_APPROVAL_STATUS_VALUES,
  API_EXPENSE_CATEGORY_CODE_VALUES,
  API_EXPENSE_LEDGER_VALUES,
  API_FARMER_EXPENSE_CATEGORY_CODE_VALUES,
  API_FARM_STATUS_VALUES,
  API_FINANCE_ENTRY_TYPE_VALUES,
  API_INVENTORY_MOVEMENT_TYPE_VALUES,
  API_PAYMENT_DIRECTION_VALUES,
  API_PAYMENT_ENTRY_TYPE_VALUES,
  API_OPEN_TRANSACTION_PAYMENT_STATUS_VALUES,
  API_PAYOUT_UNIT_VALUES,
  API_PURCHASE_TYPE_VALUES,
  API_ROLE_VALUES,
  API_SALE_STATUS_VALUES,
  API_SETTLEMENT_STATUS_VALUES,
  API_TRANSACTION_PAYMENT_STATUS_VALUES,
  API_TREATMENT_KIND_VALUES,
  API_USER_STATUS_VALUES,
} from "../apiEnums";

export {
  API_BATCH_STATUS_VALUES,
  API_CATALOG_ITEM_TYPE_VALUES,
  API_COMPANY_EXPENSE_CATEGORY_CODE_VALUES,
  API_COMMENT_TARGET_TYPE_VALUES,
  API_EXPENSE_APPROVAL_STATUS_VALUES,
  API_EXPENSE_CATEGORY_CODE_VALUES,
  API_EXPENSE_LEDGER_VALUES,
  API_FARMER_EXPENSE_CATEGORY_CODE_VALUES,
  API_FARM_STATUS_VALUES,
  API_FINANCE_ENTRY_TYPE_VALUES,
  API_INVENTORY_MOVEMENT_TYPE_VALUES,
  API_PAYMENT_DIRECTION_VALUES,
  API_PAYMENT_ENTRY_TYPE_VALUES,
  API_OPEN_TRANSACTION_PAYMENT_STATUS_VALUES,
  API_PAYOUT_UNIT_VALUES,
  API_PURCHASE_TYPE_VALUES,
  API_ROLE_VALUES,
  API_SALE_STATUS_VALUES,
  API_SETTLEMENT_STATUS_VALUES,
  API_TRANSACTION_PAYMENT_STATUS_VALUES,
  API_TREATMENT_KIND_VALUES,
  API_USER_STATUS_VALUES,
} from "../apiEnums";

export type ApiRole = (typeof API_ROLE_VALUES)[number];
export type ApiUserStatus = (typeof API_USER_STATUS_VALUES)[number];
export type ApiFarmStatus = (typeof API_FARM_STATUS_VALUES)[number];
export type ApiBatchStatus = (typeof API_BATCH_STATUS_VALUES)[number];
export type ApiSaleStatus = (typeof API_SALE_STATUS_VALUES)[number];
export type MasterDataTypeCategory =
  | "CATALOG_ITEM_TYPE"
  | "PURCHASE_TYPE"
  | "EXPENSE_CATEGORY"
  | "TREATMENT_KIND";

export type ApiTreatmentKind = string;
export type ApiExpenseCategoryCode = string;

export type ApiCostCategory = ApiExpenseCategoryCode;
export type ApiExpenseLedger = (typeof API_EXPENSE_LEDGER_VALUES)[number];
export type ApiExpenseApprovalStatus = (typeof API_EXPENSE_APPROVAL_STATUS_VALUES)[number];
export type ApiTransactionPaymentStatus = (typeof API_TRANSACTION_PAYMENT_STATUS_VALUES)[number];
export type ApiInventoryMovementType = (typeof API_INVENTORY_MOVEMENT_TYPE_VALUES)[number];
export type ApiPurchaseType = string;
export type ApiCatalogItemType = string;
export type ApiFinanceEntryType = (typeof API_FINANCE_ENTRY_TYPE_VALUES)[number];
export type ApiPaymentDirection = (typeof API_PAYMENT_DIRECTION_VALUES)[number];
export type ApiPaymentEntryType = (typeof API_PAYMENT_ENTRY_TYPE_VALUES)[number];
export type ApiPayoutUnit = (typeof API_PAYOUT_UNIT_VALUES)[number];
export type ApiSettlementStatus = (typeof API_SETTLEMENT_STATUS_VALUES)[number];
export type ApiCommentTargetType = (typeof API_COMMENT_TARGET_TYPE_VALUES)[number];

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

export type ApiMasterDataTypeOption = {
  id: string;
  organizationId?: string | null;
  category: MasterDataTypeCategory | string;
  value: string;
  label?: string | null;
  description?: string | null;
  /** "SYSTEM" for built-in options, "CUSTOM" for user-created ones */
  source?: "SYSTEM" | "CUSTOM" | null;
  /** @deprecated Use `source === "SYSTEM"` instead */
  isSystem?: boolean | null;
  isActive?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  dailyEntry: boolean;
  salesEntry: boolean;
  expenseEntry: boolean;
  inventoryView: boolean;
  costVisibility: boolean;
  reportAccess: boolean;
  companyExpenseEntry: boolean;
  farmerExpenseApproval: boolean;
  purchaseEntry: boolean;
  settlementEntry: boolean;
  financialDashboard: boolean;
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
  batchId: string;
  batchCode?: string | null;
  farmId: string;
  farmName?: string | null;
  status?: string | null;
  placementCount?: number | null;
  currentAgeDays?: number | null;
  liveBirds?: number | null;
  todayMortality?: number | null;
  mortalityCount?: number | null;
  cullCount?: number | null;
  loadingMortalityCount?: number | null;
  soldBirds?: number | null;
  soldBirdCount?: number | null;
  mortalityPercent?: number | null;
  mortalityRate?: number | null;
  totalFeedConsumedKg?: number | null;
  totalWeightSoldKg?: number | null;
  averageWeightGrams?: number | null;
  fcr?: number | null;
  totalCompanyExpenses?: number | null;
  totalFarmerExpenses?: number | null;
  totalSales?: number | null;
  companyProfitOrLoss?: number | null;
  farmerGrowingIncome?: number | null;
  farmerNetEarnings?: number | null;
  settlementStatus?: string | null;
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
  vendorId?: string | null;
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

export type ApiVendor = {
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
  vendorId?: string | null;
  vendorName?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
};

export type ApiFinancePurchase = {
  id: string;
  organizationId: string;
  batchId?: string | null;
  purchaseType: ApiPurchaseType;
  vendorId?: string | null;
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
  vendorId?: string | null;
  vendorName?: string | null;
  traderId?: string | null;
  traderName?: string | null;
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
  paidAmount?: number | null;
  pendingAmount?: number | null;
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
  farmId?: string | null;
  batchId?: string | null;
  targetType: ApiCommentTargetType;
  targetId: string;
  comment: string;
  correctionNote?: string | null;
  createdById?: string | null;
  createdAt: string;
};

export type CreateUserRequest = {
  name: string;
  email?: string;
  phone: string;
  password: string;
  role: ApiRole;
  assignedFarmIds?: string[];
  permissions?: Partial<ApiPermissionMatrix>;
  mustChangePassword?: boolean;
};

export type UpdateUserRequest = {
  name?: string;
  password?: string;
  role?: ApiRole;
  email?: string;
  phone?: string;
  permissions?: Partial<ApiPermissionMatrix>;
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
  ratePerChick?: number;
  chickTransportCharge?: number;
  sourceHatchery?: string;
  vendorId?: string;
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
  lockedAt?: string | null;
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
  Omit<CreateDailyLogRequest, "clientReferenceId" | "logDate">
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

export type CreateVendorRequest = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export type UpdateVendorRequest = Partial<CreateVendorRequest>;

export type CreateMasterDataTypeOptionRequest = {
  category: MasterDataTypeCategory;
  value: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateMasterDataTypeOptionRequest = {
  value?: string;
  description?: string;
  isActive?: boolean;
};

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
  vendorId?: string;
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
  vendorId?: string;
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
  vendorId?: string;
  traderId?: string;
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
