
import { OrganizationType, SystemUser } from './systemAdminTypes';
export type { SystemUser };

export enum UserRole {
  EMPLOYER = 'EMPLOYER', // کارفرما
  CONSULTANT = 'CONSULTANT', // مشاور
  CONTRACTOR = 'CONTRACTOR' // پیمانکار
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

export interface PriceListItem {
  code: string;
  itemCode?: string;
  description: string;
  unit: string;
  price: number;
  priceListId?: string;
  priceListTitle?: string;
  weightPercent?: number; // درصد وزنی برای آیتم‌های ساختار شکست هزینه (CBS)
  quantity?: number; // مقدار فعالیت
}

export interface PriceList {
  id: string;
  title: string;
  year: string;
  type: string; 
  fileName?: string;
  uploadDate: string;
  items?: PriceListItem[]; 
}

export interface ProjectResource {
  id: string;
  name: string;
  type: 'PRICE_LIST' | 'ESTIMATE' | 'CBS';
  uploadDate: string;
  fileSize?: string;
}

export interface GeneralCoefficient {
  id: string;
  name: string;
  value: number;
}

export interface ChapterCoefficient {
  id: string;
  chapterCode: string; 
  multiplier: number;
}

export interface EstimateCoefficients {
  regional: number;      
  overhead: number;      
  contractor: number;    
  equipment: number;     
  others: number;        
  generalCoefficients?: GeneralCoefficient[]; 
  chapterCoefficients?: ChapterCoefficient[]; 
}

export interface ContractWarranty {
  id: string;
  type: 'PERFORMANCE_BOND' | 'ADVANCE_PAYMENT' | 'BID_BOND' | 'RETAINAGE';
  issuerBank: string;
  referenceNumber: string;
  amount: number;
  issueDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'RELEASED' | 'EXTENDED';
  description: string;
}

export interface ContractRevision {
  id: string;
  version: string;
  type: 'AMENDMENT' | 'TIME_EXTENSION' | 'PRICE_ADJUSTMENT' | 'SCOPE_CHANGE';
  date: string;
  approvedDate: string;
  changesDescription: string;
  amountDifference: number;
  durationDifference: number;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
}

export interface CbsRevision {
  id: string;
  version: string;
  date: string;
  author: string;
  changes: string;
  nodeCount: number;
  totalBudget: number;
  nodesSnapshot: any[]; // Use any[] temporarily to avoid circular dependency or import CbsNode if possible
}

export type ContractStatus = 
  | 'DRAFT' 
  | 'REGISTERED'
  | 'UNDER_REVIEW' 
  | 'APPROVED' 
  | 'ACTIVE' 
  | 'SUSPENDED' 
  | 'COMPLETED' 
  | 'CLOSED' 
  | 'TERMINATED' 
  | 'ARCHIVED';

export type ContractType = 'LUMP_SUM' | 'UNIT_PRICE' | 'EPC' | 'COST_PLUS' | 'CBS';

export interface CbsMappingItem {
  cbsCode: string;
  allocatedAmount: number;
  weightPercent: number;
  description?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  baselineStartDate?: string;
  baselineEndDate?: string;
  durationDays?: number;
}

export interface ContractAttachment {
  id: string;
  name: string;
  type: string;
  size: string;
  date: string;
  url?: string;
}

export interface ContractNote {
  id: string;
  author: string;
  text: string;
  date: string;
}

export interface ContractAuditLog {
  id: string;
  user: string;
  action: string;
  details: string;
  date: string;
}

export interface CbsContract {
  id: string;
  projectId: string;
  number: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  employer: string;
  contractor: string;
  consultant: string;
  issueDate: string;
  startDate: string;
  duration: number; // in days
  initialEndDate: string;
  currentEndDate: string;
  initialAmount: number;
  baseBudgetAmount?: number;
  currency: string;
  exchangeRate: number;
  paymentTerms: string;
  billingPeriod: string;
  adjustmentPeriod: string;
  advancePaymentPercent: number;
  advancePaymentAmount: number;
  advanceRetentionPercent: number;
  goodPerformanceRetentionPercent: number;
  insurancePercent: number;
  taxPercent: number;
  isTaxExempt: boolean;
  otherDeductions: string;
  specialConditions: string;
  cbsMapping: CbsMappingItem[];
  warranties: ContractWarranty[];
  revisions: ContractRevision[];
  attachments: ContractAttachment[];
  notes: ContractNote[];
  auditLogs: ContractAuditLog[];
  createdByUserId?: string;
  createdByUsername?: string;
  createdByOrgId?: string;
  createdByRole?: string;
  createdByJobLevel?: string;
}

export interface Project {
  id: string;
  title: string;
  contractNumber: string;
  employerName: string;
  consultantName: string;
  contractorName: string;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'ARCHIVED' | 'REGISTERED';
  startDate: string;
  endDate: string;
  siteDeliveryDate: string;
  contractType: string;
  priceLists: PriceList[]; 
  initialBudget: number;
  baseBudget?: number;
  resources: ProjectResource[];
  coefficients?: EstimateCoefficients;
  excelSearchResultsEstModal?: PriceListItem[]; 
  isSearchingEstModal?: boolean; 
  allowConsultantEmployerCreation?: boolean;
  createdByUserId?: string;
  createdByUsername?: string;
  createdByOrgId?: string;
  createdByRole?: string;
  createdByJobLevel?: string;

  // Unified Contract additional fields
  paymentTerms?: string;
  billingPeriod?: string;
  adjustmentPeriod?: string;
  advancePaymentPercent?: number;
  advancePaymentAmount?: number;
  advanceRetentionPercent?: number;
  goodPerformanceRetentionPercent?: number;
  insurancePercent?: number;
  taxPercent?: number;
  otherDeductions?: string;
  specialConditions?: string;
  warranties?: ContractWarranty[];
  revisions?: ContractRevision[];

  // CBS Specific project definition fields
  projectType?: string; // e.g. 'EPC', 'Industrial', 'Oil & Gas', 'Steel Plant', 'Infrastructure'
  location?: string;
  calendar?: string;
  currency?: string;
  uom?: string; // Unit of Measure (Base Unit)
  language?: string;
  timezone?: string;
  priceIndexPeriod?: string;
  performanceBondPercent?: number;
  
  // CBS project hierarchy structures
  areas?: string[];
  zones?: string[];
  facilities?: string[];
  disciplines?: string[];
  systems?: string[];
  subsystems?: string[];
  projectCodes?: string[];
  costCenters?: string[];
  cbsMapping?: CbsMappingItem[];
  wbsScheduleMapping?: CbsMappingItem[];
  
  // Custom metadata / notes / audit
  notesList?: { id: string; author: string; text: string; date: string }[];
  attachmentsList?: { id: string; name: string; size: string; date: string }[];
  revisionHistoryList?: { id: string; version: string; author: string; changes: string; date: string }[];
  auditLogsList?: { id: string; user: string; action: string; details: string; date: string }[];
  defaultSettings?: {
    allowOverBudget?: boolean;
    requireWorkflowApproval?: boolean;
    autoLockFrozenItems?: boolean;
    notifyOnStatusChange?: boolean;
  };
}

export type ItemType = 'NORMAL' | 'STARRED' | 'INVOICE';

export interface EstimateItem {
  id: string;
  projectId: string;
  priceListId?: string;
  code: string;
  itemCode?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  itemType?: ItemType; // New field
  independentCoefficient?: number; // New field
  weightPercent?: number; // CBS weight percent

  // Phase 4A: Workflow
  status?: WorkflowStatus;
  assigneeId?: string;
  workflowHistory?: WorkflowEvent[];
  createdById?: string;

  // Phase 4B: Inter-Org
  ownerOrgId?: string;
  currentOrgId?: string;

  // Phase 4D: Freeze
  isFinalFrozen?: boolean;
  total?: number;
}

export interface MetreRow {
  id: string;
  projectId: string;
  minuteId?: string; 
  itemCode: string;
  description: string;
  unit?: string;
  count: number;
  length: number;
  width: number;
  height: number;
  isArchived?: boolean;
  multiplier: number;
  partialTotal: number;
  searchResultItems?: PriceListItem[]; 
  isSearching?: boolean;
  itemType?: ItemType; // New field
  independentCoefficient?: number; // New field
  unitPrice?: number; // New field: Custom price for Starred/Invoice items in Metre
  priceListId?: string;
  isManualPartialTotal?: boolean;

  // Audit Fields (Contractor vs Consultant vs Employer)
  contractorCount?: number;
  contractorLength?: number;
  contractorWidth?: number;
  contractorHeight?: number;
  contractorMultiplier?: number;
  contractorTotal?: number;

  consultantCount?: number;
  consultantLength?: number;
  consultantWidth?: number;
  consultantHeight?: number;
  consultantMultiplier?: number;
  consultantTotal?: number;
  consultantEditedBy?: string;
  consultantEditedAt?: string;

  employerCount?: number;
  employerLength?: number;
  employerWidth?: number;
  employerHeight?: number;
  employerMultiplier?: number;
  employerTotal?: number;
  employerEditedBy?: string;
  employerEditedAt?: string;
}

export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED_INTERNAL = 'APPROVED_INTERNAL',
  REJECTED = 'REJECTED',
  // Phase 4B: Inter-Org Statuses
  SENT_TO_CONSULTANT = 'SENT_TO_CONSULTANT',
  IN_CONSULTANT_REVIEW = 'IN_CONSULTANT_REVIEW',
  APPROVED_BY_CONSULTANT = 'APPROVED_BY_CONSULTANT', // New status
  SENT_TO_EMPLOYER = 'SENT_TO_EMPLOYER',
  IN_EMPLOYER_REVIEW = 'IN_EMPLOYER_REVIEW',
  APPROVED_BY_EMPLOYER = 'APPROVED_BY_EMPLOYER',
  APPROVED_FINAL = 'APPROVED_FINAL'
}

export type WorkflowAction = 
  | 'CREATE'
  | 'SUBMIT' 
  | 'REASSIGN' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'RESUBMIT'
  | 'SIGN'
  | 'REPORT_SIGNATURE'
  // Phase 4B: Inter-Org Actions
  | 'SEND_TO_CONSULTANT'
  | 'SEND_TO_EMPLOYER'
  | 'SEND_TO_CONTRACTOR'
  | 'RETURN_TO_CONTRACTOR'
  | 'RETURN_TO_CONSULTANT'
  // Phase 4D: Freeze & Variation
  | 'FINAL_APPROVE'
  | 'UNFREEZE_BY_VARIATION'
  | 'EDIT';

export interface WorkflowEvent {
  id: string;
  timestamp: number;
  action: WorkflowAction;
  fromStatus?: WorkflowStatus;
  toStatus?: WorkflowStatus;
  actorUserId: string;
  actorName: string;
  actorTitle?: string;
  actorOrgId?: string;
  actorOrgType?: OrganizationType;
  roleKey?: string;
  assigneeUserId?: string;
  assigneeName?: string;
  comment?: string;
  signature?: string; // Electronic signature of the actor at the time of signing
  role?: string;
}

// Phase 4C: Notification System
export interface Notification {
  id: string;
  type: 'WORKFLOW' | 'SYSTEM';
  action: WorkflowAction;
  module: 'MINUTES' | 'STATEMENTS' | 'ESTIMATES' | 'PERMITS' | 'MATERIALS' | 'VARIATIONS' | 'ADJUSTMENT' | 'EXECUTION' | 'COMMUNICATIONS' | 'DCC' | 'QC' | string;
  recordId: string;
  projectId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  orgId: string;
  status: 'UNREAD' | 'READ';
  createdAt: number;
  deepLink: string;
  message: string;
  documentTitle?: string;
  documentCode?: string;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface ProjectMinute {
  id: string;
  projectId: string;
  number: string;
  date: string;
  description: string;
  location: string;
  
  // Phase 4A: Workflow
  status?: WorkflowStatus;
  assigneeId?: string;
  assigneeName?: string;
  workflowHistory?: WorkflowEvent[];
  createdById?: string;

  // Phase 4B: Inter-Org
  ownerOrgId?: string;
  currentOrgId?: string;

  // Phase 4D: Freeze
  isFinalFrozen?: boolean;
}

export interface ApprovalDetail {
  isApproved: boolean;
  comment: string;
  date?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  signature?: string; // Electronic signature base64 data URL
}

export interface WorkPermit {
  id: string;
  projectId: string;
  number: string;
  date: string;
  location: string;
  description: string;
  
  // Contractor Disciplines
  contractorDcc: ApprovalDetail;
  contractorSurveyor: ApprovalDetail;
  contractorHse: ApprovalDetail;
  contractorCivil: ApprovalDetail;
  contractorElectrical: ApprovalDetail;
  contractorMechanical: ApprovalDetail;

  // Consultant Disciplines
  consultantDcc: ApprovalDetail;
  consultantSurveyor: ApprovalDetail;
  consultantHse: ApprovalDetail;
  consultantCivil: ApprovalDetail;
  consultantElectrical: ApprovalDetail;
  consultantMechanical: ApprovalDetail;

  // Employer Disciplines
  employerDcc?: ApprovalDetail;
  employerSurveyor?: ApprovalDetail;
  employerHse?: ApprovalDetail;
  employerCivil?: ApprovalDetail;
  employerElectrical?: ApprovalDetail;
  employerMechanical?: ApprovalDetail;

  // New Organizational Approvals (3 Organizations x 3 Roles)
  contractorExpertApproval?: ApprovalDetail;     // کارشناس پیمانکار
  contractorUnitHeadApproval?: ApprovalDetail;    // سرپرست واحد پیمانکار
  contractorSiteManagerApproval?: ApprovalDetail;  // سرپرست کارگاه پیمانکار

  consultantExpertApproval?: ApprovalDetail;     // کارشناس مشاور/نظارت
  consultantUnitHeadApproval?: ApprovalDetail;    // سرپرست واحد مشاور/نظارت
  consultantSiteManagerApproval?: ApprovalDetail;  // سرپرست کارگاه مشاور/نظارت

  employerExpertApproval?: ApprovalDetail;       // کارشناس کارفرما
  employerUnitHeadApproval?: ApprovalDetail;      // سرپرست واحد کارفرما
  employerSiteManagerApproval?: ApprovalDetail;    // سرپرست کارگاه کارفرما

  // Final Approvals
  contractorManagerApproved: boolean;
  supervisorManagerApproved: boolean;
  status: WorkflowStatus; // Unified status

  // Phase 4A: Workflow
  assigneeId?: string;
  workflowHistory?: WorkflowEvent[];
  createdById?: string;

  // Phase 4B: Inter-Org
  ownerOrgId?: string;
  currentOrgId?: string;

  // Phase 4D: Freeze
  isFinalFrozen?: boolean;
}

export interface Statement {
  id: string;
  projectId: string;
  number: string;
  date: string;
  startDate: string;
  endDate: string;
  description: string;
  selectedMinuteIds: string[]; // IDs of minutes included in this statement
  status: WorkflowStatus | 'DRAFT' | 'PENDING' | 'APPROVED'; // Backward compatibility
  
  // Phase 4A: Workflow
  assigneeId?: string;
  workflowHistory?: WorkflowEvent[];
  createdById?: string;

  // Phase 4B: Inter-Org
  ownerOrgId?: string;
  currentOrgId?: string;

  // Phase 4D: Freeze
  isFinalFrozen?: boolean;
  values?: any[];
}

// --- MRS: Material Receipt Slip (Inbound) ---
export interface MrsMaterialItem {
  id: string; 
  materialType: string; // e.g., Cement, Steel, Sand
  materialName: string; // Detail description
  quantity: number;
  unit: string;
  supplier: string;
}

export interface MrsRecord {
  id: string;
  projectId: string;
  serialNumber: string; // شماره سریال قبض
  entryDate: string;
  entryTime: string;
  
  items: MrsMaterialItem[]; 
  
  // Transport Info
  driverName: string;
  plateNumber: string;
  vehicleType: string;
  
  // Approvals
  techOfficeApproval?: ApprovalDetail; // دفتر فنی پیمانکار
  siteManagerApproval?: ApprovalDetail; // سرپرست کارگاه پیمانکار
  supervisorApproval?: ApprovalDetail; // دستگاه نظارت

  // New Organizational Approvals (3 Organizations x 3 Roles)
  contractorExpertApproval?: ApprovalDetail;     // کارشناس پیمانکار
  contractorUnitHeadApproval?: ApprovalDetail;    // سرپرست واحد پیمانکار
  contractorSiteManagerApproval?: ApprovalDetail;  // سرپرست کارگاه پیمانکار

  consultantExpertApproval?: ApprovalDetail;     // کارشناس مشاور/نظارت
  consultantUnitHeadApproval?: ApprovalDetail;    // سرپرست واحد مشاور/نظارت
  consultantSiteManagerApproval?: ApprovalDetail;  // سرپرست کارگاه مشاور/نظارت

  employerExpertApproval?: ApprovalDetail;       // کارشناس کارفرما
  employerUnitHeadApproval?: ApprovalDetail;      // سرپرست واحد کارفرما
  employerSiteManagerApproval?: ApprovalDetail;    // سرپرست کارگاه کارفرما
  
  status: WorkflowStatus;
  storageLocation: string; // محل دپو

  // Phase 4A: Workflow
  assigneeId?: string;
  workflowHistory?: WorkflowEvent[];
  createdById?: string;

  // Phase 4B: Inter-Org
  ownerOrgId?: string;
  currentOrgId?: string;

  // Phase 4D: Freeze
  isFinalFrozen?: boolean;
}

// --- MIV: Material Issue Voucher (Outbound) ---
export interface MivMaterialItem {
  id: string;
  materialType?: string; // Added field
  materialName: string; // Must match incoming material
  quantity: number;
  unit: string;
  remarks?: string;
}

export interface MivRecord {
  id: string;
  projectId: string;
  serialNumber: string;
  date: string;
  requestedBy: string; // پیمانکار جزء / سرپرست اجرا
  location: string; // محل مصرف
  description: string; // شرح کار
  
  items: MivMaterialItem[];

  // Approvals
  warehouseManagerApproval: ApprovalDetail; // انباردار
  siteManagerApproval: ApprovalDetail; // سرپرست کارگاه
  
  // New Organizational Approvals (3 Organizations x 3 Roles)
  contractorExpertApproval?: ApprovalDetail;     // کارشناس پیمانکار
  contractorUnitHeadApproval?: ApprovalDetail;    // سرپرست واحد پیمانکار
  contractorSiteManagerApproval?: ApprovalDetail;  // سرپرست کارگاه پیمانکار

  consultantExpertApproval?: ApprovalDetail;     // کارشناس مشاور/نظارت
  consultantUnitHeadApproval?: ApprovalDetail;    // سرپرست واحد مشاور/نظارت
  consultantSiteManagerApproval?: ApprovalDetail;  // سرپرست کارگاه مشاور/نظارت

  employerExpertApproval?: ApprovalDetail;       // کارشناس کارفرما
  employerUnitHeadApproval?: ApprovalDetail;      // سرپرست واحد کارفرما
  employerSiteManagerApproval?: ApprovalDetail;    // سرپرست کارگاه کارفرما

  status: WorkflowStatus;

  // Phase 4A: Workflow
  assigneeId?: string;
  workflowHistory?: WorkflowEvent[];
  createdById?: string;

  // Phase 4B: Inter-Org
  ownerOrgId?: string;
  currentOrgId?: string;

  // Phase 4D: Freeze
  isFinalFrozen?: boolean;
}

// --- Variation Order Types ---
export interface VariationItem {
  code: string;
  itemCode?: string;
  description: string;
  unit: string;
  unitPrice: number;
  itemType: ItemType;
  independentCoefficient: number;
  
  originalQty: number; // مقدار اولیه پیمان
  contractorQty?: number; // مقدار ادعایی پیمانکار
  consultantQty?: number; // مقدار تایید شده مشاور
  employerQty?: number; // مقدار تایید نهایی کارفرما (مبنای جدید)
  originalWeightFactor?: number; // درصد وزنی اولیه
  weightFactor?: number; // درصد وزنی جدید/ادعایی
  contractorWeightFactor?: number;
  consultantWeightFactor?: number;
  employerWeightFactor?: number;
  priceListId?: string;
}

export interface VariationOrder {
  id: string;
  projectId: string;
  number: string;
  date: string;
  description: string;
  status: WorkflowStatus; // Unified status
  items: VariationItem[];

  // Phase 4A: Workflow
  assigneeId?: string;
  workflowHistory?: WorkflowEvent[];
  createdById?: string;

  // Phase 4B: Inter-Org
  ownerOrgId?: string;
  currentOrgId?: string;

  // Phase 4D: Freeze
  isFinalFrozen?: boolean;
}

// Phase 4D: Freeze Variation
export interface FreezeVariationRequest {
  id: string;
  parentRecordId: string; // ID of the frozen Minute or Statement
  reason: string;
  createdById: string;
  createdAt: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
}

// --- Adjustment Module Types ---
export interface ChapterPeriodIndex {
  chapterCode: string;
  baseIndex: number;
  performanceIndex: number;
}

export interface AdjustmentPeriod {
  id: string;
  title: string;
  days: number;
  indices: ChapterPeriodIndex[];
}

export interface AdjustmentRecord {
  id: string;
  projectId: string;
  statementId: string;
  number: string;
  date: string;
  description: string;
  coefficient: number; // e.g., 0.95
  status: WorkflowStatus;
  isMultiPeriod: boolean;
  totalDays: number;
  periods: AdjustmentPeriod[];
  selectedRootCodes?: string[];
  
  // Workflow fields
  assigneeId?: string;
  workflowHistory: WorkflowEvent[];
  createdById: string;
  ownerOrgId: string;
  currentOrgId: string;
  isFinalFrozen?: boolean;
}

// --- Execution Module Types (Daily Reports) ---
export interface DailyReportLabor {
  id: string;
  role: string; // e.g., Master Mason, Worker, Welder, Surveyor, Supervisor
  count: number;
  workHours: number;
  organization: string; // Contractor, Consultant, Subcontractor name
}

export interface DailyReportMachine {
  id: string;
  machineType: string; // e.g., Excavator, Loader, Tower Crane, Concrete Mixer
  count: number;
  activeHours: number;
  standbyHours: number;
  status: 'ACTIVE' | 'STANDBY' | 'BREAKDOWN';
}

export interface DailyReportMaterial {
  id: string;
  materialName: string; // e.g., Cement, Steel, Sand, Gravel
  receivedQty: number; // Received today
  consumedQty: number; // Consumed today
  unit: string;
}

export interface DailyReportWorkItem {
  id: string;
  itemCode: string; // Can map to PriceList item or CBS Code
  description: string;
  unit: string;
  quantity: number; // Done today
  location: string; // Specific station or floor or zone
  cbsNodeId?: string; // Mapped approved CBS structure node ID
  weightPercent?: number; // Weight percentage executed today
  priceListId?: string;
}

export interface DailyReportProblem {
  id: string;
  description: string;
  category: 'TECHNICAL' | 'MATERIAL' | 'MACHINERY' | 'WEATHER' | 'ADMINISTRATIVE';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  resolved: boolean;
}

export interface DailyReport {
  id: string;
  projectId: string;
  reportNumber: string; // e.g., "1405-04-01" or unique running counter
  date: string; // Persian date string e.g., "1405/04/01"
  weather: string; // Clear, Rainy, Snowy, Dust, etc.
  minTemp?: number;
  maxTemp?: number;
  dayShift: 'DAY' | 'NIGHT' | 'BOTH';
  
  // Sections
  labor: DailyReportLabor[];
  machinery: DailyReportMachine[];
  materials: DailyReportMaterial[];
  workItems: DailyReportWorkItem[];
  problems: DailyReportProblem[];
  
  // General details
  preparedBy: string; // User Name who created this
  description?: string; // Comments

  // Workflow / Signatures
  status: WorkflowStatus;
  assigneeId?: string;
  isFinalFrozen?: boolean;
  workflowHistory?: WorkflowEvent[];
  createdById?: string;
  ownerOrgId?: string;
  currentOrgId?: string;
}

// --- Planning & Control Module Types ---
export interface PlanningActivity {
  id: string;
  projectId: string;
  code: string;
  title: string;
  cbsNodeId?: string;
  weightPercent: number; // درصد وزنی فیزیکی
  baselineStartDate: string;
  baselineEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  durationDays: number;
  plannedProgress: number; // 0-100
  actualProgress: number; // 0-100
  isCriticalPath?: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  predecessorCodes?: string;
  unit?: string;
  totalQuantity?: number;
  unitPrice?: number;
  allocatedAmount?: number;
  // Replan history fields
  originalBaselineStartDate?: string;
  originalBaselineEndDate?: string;
  originalDurationDays?: number;
  revisedStartDate?: string;
  revisedEndDate?: string;
  replanRevisionCount?: number;
}

export interface ReplanActivityEntry {
  activityId: string;
  code: string;
  title: string;
  originalStartDate: string;
  originalEndDate: string;
  originalDuration: number;
  actualProgressAtReplan: number;
  remainingProgress: number;
  revisedStartDate: string;
  revisedEndDate: string;
  revisedDuration: number;
  extensionDays: number;
  weightPercent: number;
}

export interface ReplanRecord {
  id: string;
  projectId: string;
  revisionNumber: number;
  replanDate: string; // تاریخ روز ثبت بازبرنامه‌ریزی
  contractEndDateOriginal: string; // تاریخ پایان قرارداد اولیه
  newProjectedEndDate: string; // تاریخ جدید اتمام پروژه
  totalExtensionDays: number; // کل روزهای تمدید زمان نسبت به پایان قبلی
  approvedNoticeNumber?: string; // شماره ابلاغیه تمدید یا مصوبه
  reason: string; // علت بازبرنامه‌ریزی
  recordedBy: string;
  recordedByRole?: string;
  affectedActivitiesCount: number;
  activityEntries: ReplanActivityEntry[];
  createdAt: string;
}

// --- Project Control & EVM Schema Models ---
export interface BaselineActivity {
  id: string;
  code: string;
  title: string;
  cbsNodeId?: string;
  weightPercent: number; // درصد وزنی بر اساس هزینه یا حجم کار
  plannedStartDate: string;
  plannedEndDate: string;
  durationDays: number;
  bac: number; // Budget at Completion for this activity
  unit?: string;
  totalQuantity?: number;
  unitPrice?: number;
  isCriticalPath?: boolean;
}

export interface ProjectBaseline {
  id: string;
  projectId: string;
  version: string; // e.g. "BL-01", "BL-02"
  title: string;
  approvalDate: string;
  approvedBy?: string;
  description?: string;
  totalBAC: number; // مجموع بودجه مصوب کل پروژه
  status: 'ACTIVE' | 'SUPERSEDED' | 'DRAFT';
  isLocked: boolean;
  activities: BaselineActivity[];
  createdAt: string;
  createdById?: string;
}

export interface ActivityProgressEntry {
  activityId: string;
  activityCode: string;
  activityTitle: string;
  weightPercent: number;
  previousProgress: number; // 0-100%
  currentProgress: number; // 0-100%
  progressDelta: number; // current - previous
  executedQuantity?: number;
  notes?: string;
}

export interface ProgressTrackingRecord {
  id: string;
  projectId: string;
  recordNumber: string;
  date: string; // تاریخ ثبت پیشرفت (مثلا 1405/04/31)
  recordedBy: string;
  recordedByRole: string;
  reportingPeriod: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  totalWeightedPlannedProgress: number; // درصد پیشرفت برنامه‌ای تجمیعی
  totalWeightedActualProgress: number; // درصد پیشرفت واقعی تجمیعی
  activityEntries: ActivityProgressEntry[];
  siteObservations?: string;
  status: 'SUBMITTED' | 'APPROVED' | 'DRAFT';
  createdAt: string;
}

export interface ActivityPlanEntry {
  activityId: string;
  activityCode: string;
  activityTitle: string;
  weightPercent: number;
  previousPlannedProgress: number; // 0-100%
  currentPlannedProgress: number; // 0-100%
  plannedDelta: number;
  actualProgressAtPeriod?: number; // 0-100%
  variancePercent?: number; // actual - planned
  notes?: string;
}

export interface PeriodicPlanRecord {
  id: string;
  projectId: string;
  planNumber: string;
  title: string;
  date: string; // تاریخ مبنای برنامه
  periodType: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  recordedBy: string;
  recordedByRole: string;
  totalWeightedPlannedProgress: number; // درصد برنامه‌ای کل وزن‌دار
  totalWeightedActualProgress?: number; // درصد واقعی ثبت شده در همین دوره
  overallVariance?: number; // انحراف کل (واقعی - برنامه‌ای)
  activityEntries: ActivityPlanEntry[];
  revisionReason?: string;
  status: 'APPROVED' | 'SUBMITTED' | 'DRAFT';
  createdAt: string;
}

export interface PeriodicComparisonItem {
  id: string;
  date: string;
  periodType: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  periodLabel: string;
  planTitle: string;
  plannedPercent: number;
  actualPercent: number;
  variance: number; // actual - planned
  spi: number; // actual / planned
  status: 'AHEAD' | 'ON_TRACK' | 'SLIGHT_DELAY' | 'CRITICAL_DELAY';
  planRecord?: PeriodicPlanRecord;
  trackingRecord?: ProgressTrackingRecord;
}

export interface EvmPeriodCalculation {
  id: string;
  projectId: string;
  periodDate: string; // e.g. "1405/04/30"
  periodName: string; // e.g. "تیر ۱۴۰۵"
  bac: number; // Budget at Completion (بودجه کل)
  pv: number; // Planned Value (ارزش برنامه‌ریزی شده در این دوره)
  ev: number; // Earned Value (ارزش حاصله/کسب شده در این دوره)
  ac: number; // Actual Cost (هزینه واقعی از صورت وضعیت‌های تایید شده در این دوره)
  cumulativePv: number; // ارزش برنامه‌ای انباشته تا این دوره
  cumulativeEv: number; // ارزش حاصله انباشته تا این دوره
  cumulativeAc: number; // هزینه واقعی انباشته تا این دوره
  plannedProgressPercent: number; // درصد برنامه‌ای تجمیعی (0-100)
  actualProgressPercent: number; // درصد واقعی تجمیعی (0-100)
  financialProgressPercent: number; // درصد مالی واقعی تجمیعی (AC / BAC)
  spi: number; // Schedule Performance Index (EV / PV)
  cpi: number; // Cost Performance Index (EV / AC)
  sv: number; // Schedule Variance (EV - PV)
  cv: number; // Cost Variance (EV - AC)
  eac: number; // Estimate at Completion (BAC / CPI)
  vac: number; // Variance at Completion (BAC - EAC)
  tcpi: number; // To-Complete Performance Index ((BAC - EV) / (BAC - AC))
  approvedStatementIds?: string[]; // IDs of approved statements contributing to AC
  calculatedAt: string;
}

export interface SCurveDataPoint {
  date: string;
  periodLabel: string;
  plannedPercent: number; // PV (%)
  actualPercent: number; // EV (%)
  actualCostPercent?: number; // AC (%)
  pvAmount: number; // PV (Toman)
  evAmount: number; // EV (Toman)
  acAmount?: number; // AC (Toman)
  spi?: number;
  cpi?: number;
  sv?: number;
  cv?: number;
  isMilestone?: boolean;
  milestoneTitle?: string;
}

export interface PlanningProgressReport {
  id: string;
  projectId: string;
  reportNumber: string;
  reportTitle: string;
  reportType?: 'PERIODIC_PROGRESS' | 'REBASELINE';
  periodStartDate: string;
  periodEndDate: string;
  plannedPhysicalProgress: number;
  actualPhysicalProgress: number;
  plannedFinancialProgress: number;
  actualFinancialProgress: number;
  ev: number; // Earned Value
  pv: number; // Planned Value
  ac: number; // Actual Cost
  cpi: number; // Cost Performance Index
  spi: number; // Schedule Performance Index
  description?: string;
  delaysSummary?: string;
  correctiveActions?: string;
  proposedActivities?: PlanningActivity[]; // For re-baselining proposals
  versionTag?: string;

  // Workflow / Organizational approvals
  status: WorkflowStatus;
  assigneeId?: string;
  assigneeName?: string;
  workflowHistory?: WorkflowEvent[];
  createdById?: string;
  ownerOrgId?: string;
  currentOrgId?: string;
  isFinalFrozen?: boolean;
}

export type DelayClaimCategory = 
  | 'TECHNICAL'            // فنی، اجرایی و کارگاهی
  | 'CONTRACTUAL'          // قراردادی، حقوقی و ابلاغی
  | 'FINANCIAL'            // مالی، تاخیر در پرداخت مطالبات و پیش‌پرداخت (بخشنامه ۵۰۹۰)
  | 'ENGINEERING_DESIGN'   // طراحی، مهندسی و تاخیر در ابلاغ نقشه‌ها/دتایل‌ها
  | 'EMPLOYER_OBSTACLES'   // معارضین، موانع اجرایی و تاخیرات کارفرما/مشاور
  | 'WEATHER_FORCE_MAJEURE'// شرایط نامساعد جوی و حوادث قهریه
  | 'PERMITS_LAND';        // مجوزها، واگذاری زمین و انشعابات

export interface DelayClaimItem {
  id: string;
  claimId?: string;
  title: string;
  category: DelayClaimCategory;
  startDate: string; // YYYY/MM/DD
  endDate: string;   // YYYY/MM/DD
  grossDays: number; // روزهای ناخالص
  overlapDaysWithPrior?: number;
  claimedDays: number; // روزهای ادعا شده
  approvedDays?: number; // روزهای تایید شده توسط مشاور/کارفرما
  unjustifiedDays?: number;
  status?: 'JUSTIFIED' | 'UNJUSTIFIED' | 'PARTIALLY_JUSTIFIED';
  isJustified?: boolean; // آیا مجاز است (Excusable)
  isCompensable?: boolean; // آیا مشمول خسارت مالی/تسریع است
  impactType: 'CRITICAL_PATH' | 'NON_CRITICAL' | 'PARTIAL';
  sourceType?: 'MANUAL' | 'DAILY_REPORT' | 'CORRESPONDENCE' | 'FINANCIAL_5090' | 'METEOROLOGY';
  sourceRefId?: string; // Daily report ID, Letter ID, etc.
  sourceDailyReportDate?: string;
  activityCode?: string;
  activityTitle?: string;
  contractClauseRef: string; // استناد به ماده ۳۰ شرایط عمومی پیمان / بخشنامه ۵۰۹۰ / ماده ۴۳ و ...
  rootCause: string; // شرح علت و منشأ تاخیر
  impactDescription?: string; // تحلیل اثرات بر مسیر بحرانی و سایر فعالیت‌ها
  contractorActions?: string; // مکاتبات و اقدامات پیشگیرانه پیمانکار
  description?: string;
  attachedDocumentRefs?: string[];
  attachments?: { id: string; name: string; type?: string; size?: string; date?: string }[];
}

export interface DelayClaim {
  id: string;
  projectId: string;
  claimNumber: string; // e.g. EOT-1404-01
  title: string;
  periodTitle: string; // e.g. لایحه تاخیرات دوره اول (شروع پروژه تا پایان نیمسال اول ۱۴۰۴)
  claimDate: string;
  preparedBy?: string;
  contractorName?: string;
  employerName?: string;
  consultantName?: string;
  targetPeriodStart: string;
  targetPeriodEnd: string;
  contractSummary?: {
    contractNumber?: string;
    contractTitle?: string;
    contractDate?: string;
    siteHandoverDate?: string;
    initialDurationDays?: number;
    initialEndDate?: string;
    currentEndDate?: string;
    approvedEndDate?: string;
    previousExtensionDays?: number;
    initialContractAmount?: number;
    contractAmount?: number;
    latestContractAmount?: number;
  };
  items: DelayClaimItem[];
  totalGrossDays: number; // مجموع ناخالص روزهای تاخیر
  totalOverlapDays: number; // مجموع روزهای همپوشانی بازه‌ها
  totalNetJustifiedDays: number; // خالص روزهای مجاز قابل تمدید
  totalUnjustifiedDays: number; // روزهای غیرمجاز (در صورت وجود)
  requestedNewEndDate: string; // تاریخ پایان تمدید شده پیشنهادی
  introduction: string; // مقدمه و مشخصات عمومی لایحه
  technicalSummary?: string; // خلاصه ادعاهای فنی و اجرایی
  contractualSummary?: string; // خلاصه ادعاهای قراردادی و مهندسی
  financial5090Summary?: string; // خلاصه تاخیرات پرداخت و بخشنامه ۵۰۹۰
  methodology?: string;
  conclusion: string; // جمع‌بندی و درخواست صدور الحاقیه تمدید مدت پیمان
  status: WorkflowStatus;
  assigneeId?: string;
  assigneeName?: string;
  workflowHistory?: WorkflowEvent[];
  createdById?: string;
  ownerOrgId?: string;
  currentOrgId?: string;
  isFinalFrozen?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanningDelayLog {
  id: string;
  projectId: string;
  activityCode: string;
  activityTitle: string;
  delayDays: number;
  category: 'WEATHER' | 'MATERIALS' | 'FINANCIAL' | 'TECHNICAL' | 'EMPLOYER_DELAY' | 'CONTRACTOR_DELAY';
  rootCause: string;
  impactAnalysis: string;
  correctiveAction: string;
  date: string;
}

export type LossClaimCategory =
  | 'SITE_OVERHEAD'          // هزینه‌های بالاسری عمومی و اختصاصی کارگاه در ایام تاخیر مجاز
  | 'IDLE_EQUIPMENT_LABOR'   // خسارت بخواب ماشین‌آلات و نیروی انسانی معطل (بخشنامه ۵۴/۸۴۲)
  | 'FINANCIAL_INTEREST_5090' // تاخیر در پرداخت صورت‌وضعیت‌ها و پیش‌پرداخت‌ها (بخشنامه ۵۰۹۰)
  | 'INFLATION_PRICE_DIFF'   // مابه‌التفاوت نرخ تورم، مصالح و عدم پوشش کامل تعدیل
  | 'SUSPENSION_TERMINATION' // خسارات تعلیق پیمان (ماده ۴۹) یا خاتمه پیمان
  | 'OTHER_DAMAGES';         // سایر خسارات مستند مالی

export interface LossClaimItem {
  id: string;
  claimId?: string;
  title: string;
  category: LossClaimCategory;
  startDate?: string;
  endDate?: string;
  daysCount?: number;
  unit: string;
  quantity: number;
  unitRate: number;
  totalClaimedAmount: number;
  consultantApprovedAmount?: number;
  employerApprovedAmount?: number;
  contractClauseRef: string;
  rootCause: string;
  calculationBasis: string;
  sourceType?: 'MANUAL' | 'DAILY_REPORT' | 'STATEMENT' | 'ADJUSTMENT' | 'DELAY_CLAIM';
  sourceRefId?: string;
  description?: string;
  attachedDocumentRefs?: string[];
}

export interface LossClaim {
  id: string;
  projectId: string;
  claimNumber: string;
  title: string;
  periodTitle: string;
  claimDate: string;
  preparedBy?: string;
  contractorName?: string;
  employerName?: string;
  consultantName?: string;
  targetPeriodStart: string;
  targetPeriodEnd: string;
  contractSummary?: {
    contractNumber?: string;
    contractTitle?: string;
    initialContractAmount?: number;
    latestContractAmount?: number;
    approvedDelayDays?: number;
    dailyOverheadRate?: number;
  };
  items: LossClaimItem[];
  totalClaimedAmount: number;
  totalConsultantApprovedAmount?: number;
  totalEmployerApprovedAmount?: number;
  introduction: string;
  legalBasisSummary?: string;
  calculationMethodology?: string;
  conclusion: string;
  status: WorkflowStatus;
  assigneeId?: string;
  assigneeName?: string;
  workflowHistory?: WorkflowEvent[];
  createdById?: string;
  ownerOrgId?: string;
  currentOrgId?: string;
  isFinalFrozen?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetNode {
  id: string;
  code: string;
  itemCode?: string;
  title: string;
  level: number;
  parentId?: string;
  baselineAmount: number;
  currentAmount: number;
  forecastAmount: number;
  approvedAmount: number;
  contractedAmount?: number;
  actualAmount?: number;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

export interface BudgetRevision {
  id: string;
  projectId: string;
  version: string;
  title: string;
  description: string;
  date: string;
  author: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  totalIncrease: number;
  totalDecrease: number;
  netChange: number;
  items: any[];
  workflowHistory: any[];
}

export interface WorkExperience {
  id: string;
  jobTitle: string; // عنوان شغل / سمت
  companyName: string; // نام شرکت / سازمان / کارفرما / پروژه
  startDate?: string; // تاریخ شروع
  endDate?: string; // تاریخ پایان یا «در حال اشتغال»
  description?: string; // شرح وظایف، تجارب و دستاوردها
}

export interface PersonnelSkill {
  id: string;
  title: string; // عنوان مهارت / تخصص / نرم‌افزار
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'; // سطح تسلط: مقدماتی، متوسط، پیشرفته، متخصص
  description?: string; // سابقه کار یا توضیحات تکمیلی
}

export interface Personnel {
  id: string;
  personnelCode: string;
  nationalCode?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  fatherName?: string; // نام پدر
  birthCertificateNumber?: string; // شماره شناسنامه
  maritalStatus?: 'SINGLE' | 'MARRIED'; // وضعیت تاهل: مجرد / متاهل
  militaryStatus?: 'COMPLETED' | 'PERMANENT_EXEMPTION' | 'EDUCATIONAL_EXEMPTION' | 'MEDICAL_EXEMPTION' | 'SUBJECT' | 'EXEMPT_FEMALE'; // وضعیت نظام وظیفه
  educationDegree?: 'BELOW_DIPLOMA' | 'DIPLOMA' | 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'DOCTORATE'; // مدرک تحصیلی
  fieldOfStudy?: string; // رشته تحصیلی
  university?: string; // دانشگاه / موسسه آموزشی
  graduationDate?: string; // تاریخ فارغ‌التحصیلی
  workExperiences?: WorkExperience[]; // سوابق کاری
  skills?: PersonnelSkill[]; // مهارت‌ها و تخصص‌ها
  signature?: string; // تصویر / وکتور امضای الکترونیکی (Base64 data URL)
  signatureDate?: string; // تاریخ ثبت یا ویرایش امضای الکترونیکی
  orgId: string;
  projectId?: string;
  projectIds?: string[];
  jobLevel: string;
  jobTitle?: string;
  department?: string;
  mobile?: string;
  email?: string;
  gender?: 'male' | 'female';
  employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  hireDate?: string;
  notes?: string;
  userId?: string;
  createdAt?: string;
}

// --- Official Correspondence & Technical/Administrative Letters ---
export type LetterScope = 'INTERNAL' | 'EXTERNAL';
export type LetterType = 'TECHNICAL' | 'ADMINISTRATIVE' | 'FINANCIAL' | 'WORK_PERMIT_REQUEST' | 'CONTRACTUAL' | 'SAFETY' | 'OTHER';
export type LetterPriority = 'NORMAL' | 'URGENT' | 'VERY_URGENT' | 'INSTANT';
export type LetterConfidentiality = 'NORMAL' | 'CONFIDENTIAL' | 'HIGHLY_CONFIDENTIAL';

export interface LetterAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  dataUrl?: string;
  uploadDate: string;
}

export interface LetterTranscript {
  id: string;
  recipientName: string; // نام یا سمت گیرنده رونوشت
  orgName?: string; // نام سازمان / شرکت
  roleOrJobTitle?: string; // سمت یا واحد
  note?: string; // یادداشت رونوشت (جهت استحضار، جهت اقدام، ...)
}

export interface LetterMarginalia {
  id: string;
  userId: string;
  userName: string;
  userJobTitle?: string;
  orgName?: string;
  targetUserId?: string; // شناسه کاربر گیرنده / مخاطب هامش
  targetUserName?: string; // نام کاربر گیرنده / مخاطب هامش
  targetUserJobTitle?: string; // سمت کاربر گیرنده
  targetOrgName?: string; // سازمان کاربر گیرنده
  note: string; // متن هامش
  date: string; // تاریخ شمسی هامش
}

export interface OfficialLetter {
  id: string;
  projectId: string;
  letterNumber: string; // شماره نامه
  indicatorNumber?: string; // شماره ثبت اندیکاتور
  date: string; // تاریخ شمسی نامه
  subject: string; // موضوع نامه
  scope: LetterScope; // 'INTERNAL' | 'EXTERNAL' (درون‌سازمانی / برون‌سازمانی)
  letterType: LetterType; // نوع نامه (فنی، اداری، مالی و ...)
  priority: LetterPriority; // اولویت
  confidentiality: LetterConfidentiality; // محرمانگی
  
  // Recipient info
  receiverTitle: string; // مخاطب / گیرنده اصلی نامه (ترکیب سمت و نام)
  receiverNameTitle?: string; // عنوان / نام مخاطب (مانند: جناب آقای مهندس احمدی)
  receiverJobTitle?: string; // سمت گیرنده (مانند: سرپرست محترم کارگاه)
  receiverOrgId?: string;
  receiverOrgName?: string;
  receiverUserId?: string;
  receiverUserName?: string;
  attentionTo?: string; // عطف به / پیرو شماره نامه قبلی
  
  // Content & Typography
  content: string; // محتوای نامه (شامل متن، جدول و پاراگراف‌ها)
  fontFamily: string; // فونت قلم نامه
  fontSize: string; // اندازه فونت
  
  // Sender info
  senderOrgId: string;
  senderOrgName: string;
  senderUserFullName: string;
  senderUserJobTitle?: string;
  
  // Attachments and Transcripts
  hasAttachment: boolean;
  attachments?: LetterAttachment[];
  transcripts?: LetterTranscript[];
  
  // Standard Workflow fields
  status: WorkflowStatus;
  assigneeId?: string;
  assigneeName?: string;
  workflowHistory: WorkflowEvent[];
  createdById: string;
  ownerOrgId: string;
  currentOrgId: string;
  isFinalFrozen?: boolean;
  marginalia?: LetterMarginalia[];
}


