import { WorkflowStatus, WorkflowEvent } from '../types';

export type PermitType = 
  | 'HOT_WORK'         // کار گرم
  | 'HEIGHT_WORK'      // کار در ارتفاع
  | 'CONFINED_SPACE'   // فضای بسته
  | 'EXCAVATION'       // گودبرداری و کانال‌کنی
  | 'ELECTRICAL_LOTO'  // برق و قفل‌گذاری LOTO
  | 'LIFTING'          // باربرداری سنگین
  | 'NIGHT_WORK'       // کار در شب
  | 'CHEMICAL'         // مواد شیمیایی خطرناک
  | 'GENERAL_COLD'     // کار عمومی و سرد
  | (string & {});

export type WorkPermitType = PermitType;

export interface CustomPermitType {
  code: string;
  label: string;
  description?: string;
  badgeColor?: string;
  defaultPpe?: string[];
  requiresGasTest?: boolean;
  requiresFireWatch?: boolean;
  requiresIsolation?: boolean;
  isSystemDefault?: boolean;
}

export interface PermitChecklistTemplateItem {
  id: string;
  question: string;
  category?: string;
}

export const PERMIT_TYPE_LABELS: Record<string, string> = {
  HOT_WORK: 'کار گرم و شعله‌باز (Hot Work)',
  HEIGHT_WORK: 'کار در ارتفاع (Working at Height)',
  CONFINED_SPACE: 'فضای بسته و محبوس (Confined Space)',
  EXCAVATION: 'گودبرداری و کانال‌کنی (Excavation)',
  ELECTRICAL_LOTO: 'برق و قفل‌گذاری (Electrical & LOTO)',
  LIFTING: 'باربرداری سنگین و جرثقیل (Lifting)',
  NIGHT_WORK: 'کار در شب و شیفت شبانه (Night Work)',
  CHEMICAL: 'مواد شیمیایی و خطرناک (Chemical/Hazardous)',
  GENERAL_COLD: 'کار عمومی و سرد (General Cold Work)'
};

export interface PermitChecklistItem {
  id: string;
  question: string;
  isChecked?: boolean;
  na?: boolean;
  note?: string;
  status?: 'YES' | 'NO' | 'N_A';
  comments?: string;
}

export type WorkPermitChecklistItem = PermitChecklistItem;

export interface WorkPermit {
  id: string;
  projectId: string;
  permitNumber: string;
  permitType: PermitType;
  title?: string;
  location: string;
  contractorName?: string;
  contractorSubcontractor?: string;
  supervisorName?: string;
  startDate?: string;
  endDate?: string;
  permitDate?: string;
  startTime: string;
  endTime: string;
  workersCount?: number;
  workerCount?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  toolsAndEquipment?: string[];
  ppeRequired?: string[];
  requiredPpe?: string[];
  gasTest?: {
    performed?: boolean;
    oxygenLevel?: number;
    flammableGas?: number;
    carbonMonoxide?: number;
    hydrogenSulfide?: number;
    testedAt?: string;
    testerName?: string;
    isRequired?: boolean;
    o2?: string;
    lel?: string;
    co?: string;
    h2s?: string;
    testedBy?: string;
    testTime?: string;
    status?: 'SAFE' | 'UNSAFE';
  };
  isolationRequired?: boolean;
  fireWatchRequired?: boolean;
  emergencyEvacuationPlan?: boolean;
  isolationLoto?: {
    isRequired: boolean;
    isApplied: boolean;
    tagNumbers: string;
    isolatedBy: string;
  };
  fireWatch?: {
    isRequired: boolean;
    watcherName: string;
    extinguisherType: string;
    quantity: number;
  };
  emergencyPlan?: string;
  checklists: PermitChecklistItem[];
  // Workflow fields
  createdById: string;
  creatorName?: string;
  ownerOrgId?: string;
  currentOrgId?: string;
  assigneeId?: string;
  assigneeName?: string;
  workflowStatus: WorkflowStatus;
  workflowHistory: WorkflowEvent[];
  createdAt?: number;
  updatedAt?: number;
  module?: 'hse';
}

export type IncidentType = 
  | 'NEAR_MISS'           // شبه حادثه
  | 'FIRST_AID'            // کمک‌های اولیه
  | 'MEDICAL_TREATMENT'    // مداوای پزشکی سرپایی (MTC)
  | 'RESTRICTED_WORK'      // محدودیت کاری (RWC)
  | 'LOST_TIME_INJURY'     // حادثه ناتوان‌کننده (LTI)
  | 'FATALITY'             // فوت
  | 'PROPERTY_DAMAGE'      // خسارت به تجهیزات/سازه
  | 'ENVIRONMENTAL_SPILL'  // نشت و آلودگی زیست‌محیطی
  | 'FIRE_EXPLOSION';      // آتش‌سوزی و احتراق

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  NEAR_MISS: 'شبه‌حادثه (Near Miss)',
  FIRST_AID: 'کمک‌های اولیه (First Aid)',
  MEDICAL_TREATMENT: 'مداوای پزشکی (MTC)',
  RESTRICTED_WORK: 'محدودیت کاری (RWC)',
  LOST_TIME_INJURY: 'حادثه ناتوان‌کننده (LTI)',
  FATALITY: 'فوت / خسارت جانی (Fatality)',
  PROPERTY_DAMAGE: 'خسارت به اموال / تجهیزات (Property Damage)',
  ENVIRONMENTAL_SPILL: 'آلودگی و نشت زیست‌محیطی (Spill)',
  FIRE_EXPLOSION: 'آتش‌سوزی و انفجار (Fire/Explosion)'
};

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CorrectiveActionItem {
  id: string;
  action: string;
  responsiblePerson: string;
  targetDate?: string;
  deadline?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'PENDING' | 'COMPLETED';
}

export type IncidentCorrectiveAction = CorrectiveActionItem;

export interface IncidentReport {
  id: string;
  projectId: string;
  incidentNumber: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  title: string;
  date?: string;
  incidentDate?: string;
  time?: string;
  incidentTime?: string;
  exactLocation?: string;
  location?: string;
  injuredPerson?: {
    fullName?: string;
    jobRole?: string;
    contractor?: string;
    injuryType?: string;
    bodyPart?: string;
  };
  involvedPerson?: {
    name: string;
    age?: number;
    jobTitle: string;
    nationalCode?: string;
    contractor: string;
    experienceYears?: number;
  };
  medicalTreatmentRequired?: boolean;
  hospitalName?: string;
  injuryType?: string;
  injuredBodyPart?: string;
  lostWorkDays: number;
  equipmentDamageCost?: number;
  description: string;
  immediateCauses: string | string[];
  rootCauses: string | string[];
  correctiveActions: CorrectiveActionItem[];
  witnesses?: string;
  reportedBy?: string;
  // Workflow
  createdById: string;
  creatorName?: string;
  ownerOrgId?: string;
  currentOrgId?: string;
  assigneeId?: string;
  assigneeName?: string;
  workflowStatus: WorkflowStatus;
  workflowHistory: WorkflowEvent[];
  createdAt?: number;
  updatedAt?: number;
  module?: 'hse';
}

export type EnvironmentalAspect = 
  | 'WASTE_MANAGEMENT'     // مدیریت پسماند و بازیافت
  | 'AIR_DUST'             // کنترل هوا و گرد و غبار
  | 'SPILL_CONTAINMENT'     // مهار نشت سوخت و روغن
  | 'WATER_ENERGY'         // مصرف آب و انرژی
  | 'NOISE_VIBRATION'      // صوت و ارتعاش
  | 'COMPLIANCE';          // انطباق زیست‌محیطی

export const ENVIRONMENTAL_ASPECT_LABELS: Record<EnvironmentalAspect, string> = {
  WASTE_MANAGEMENT: 'مدیریت پسماند و تفکیک (Waste Management)',
  AIR_DUST: 'کنترل گرد و غبار و هوا (Air & Dust)',
  SPILL_CONTAINMENT: 'مهار نشت روغن و سوخت (Spill Containment)',
  WATER_ENERGY: 'مصرف بهینه آب و انرژی (Water & Energy)',
  NOISE_VIBRATION: 'پایش صوت و ارتعاش (Noise & Vibration)',
  COMPLIANCE: 'انطباق الزامات زیست‌محیطی (Legal Compliance)'
};

export interface EnvironmentalReport {
  id: string;
  projectId: string;
  reportNumber: string;
  aspect: EnvironmentalAspect;
  title: string;
  date?: string;
  reportDate?: string;
  location: string;
  inspectorName?: string;
  complianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'OBSERVATION';
  observations?: string;
  recommendedActions?: string;
  wasteMetrics?: {
    hazardousWasteTons?: number;
    generalWasteTons?: number;
    recycledPercentage?: number;
  };
  wasteStats?: {
    regularWasteKg: number;
    constructionWasteTons: number;
    hazardousWasteKg: number;
    recycledKg: number;
    disposalMethod: string;
  };
  airDustStats?: {
    dustControlMethod: string;
    waterSprayingCount: number;
    machineryEmissionTest: 'PASSED' | 'PENDING' | 'FAILED';
    airQualityIndex?: number;
  };
  spillStats?: {
    dripTrayCount: number;
    fuelStorageInspected: boolean;
    spillKitsReady: boolean;
    spillsRecorded: number;
    cleanUpAction?: string;
  };
  noiseStats?: {
    dayNoiseDb: number;
    nightNoiseDb: number;
    standardLimitDb: number;
    complianceStatus: 'COMPLIANT' | 'EXCEEDED';
  };
  findingsAndObservations?: string;
  correctiveActions?: {
    id: string;
    action: string;
    responsible: string;
    dueDate: string;
    isDone: boolean;
  }[];
  // Workflow
  createdById: string;
  creatorName?: string;
  ownerOrgId?: string;
  currentOrgId?: string;
  assigneeId?: string;
  assigneeName?: string;
  workflowStatus: WorkflowStatus;
  workflowHistory: WorkflowEvent[];
  createdAt?: number;
  updatedAt?: number;
  module?: 'hse';
}

export interface HseKpiStats {
  safeManHours?: number;
  totalManHours?: number;
  lostTimeIncidents?: number;
  ltifr?: number;
  ltisr?: number;
  nearMissCount?: number;
  firstAidCount?: number;
  permitsIssued?: number;
  toolboxTalksCount?: number;
  toolboxTalksAttendees?: number;
  unsafeActsReported?: number;
  unsafeConditionsReported?: number;
  ppeComplianceRate?: number;
}

export interface WeeklyMonthlyHseReport {
  id: string;
  projectId: string;
  reportType: 'WEEKLY' | 'MONTHLY';
  reportNumber: string;
  periodName?: string;
  startDate?: string;
  endDate?: string;
  reportDate?: string;
  periodStart?: string;
  periodEnd?: string;
  kpiStats?: HseKpiStats;
  summary?: string;
  highlights?: string;
  challenges?: string;
  plannedTrainings?: string;
  safeManHoursPeriod?: number;
  cumulativeSafeManHours?: number;
  averageDailyWorkers?: number;
  tbmCount?: number;
  tbmAttendeesTotal?: number;
  inspectionsCount?: number;
  unsafeActsIdentified?: number;
  unsafeConditionsIdentified?: number;
  nearMissesCount?: number;
  firstAidCount?: number;
  ltiCount?: number;
  lostWorkDays?: number;
  ltifr?: number;
  ltisr?: number;
  environmentalIncidentsCount?: number;
  permitsIssuedCount?: number;
  ppeCompliancePercentage?: number;
  keyHighlights?: string;
  challengesAndRisks?: string;
  plannedTrainingsNextPeriod?: string;
  // Workflow
  createdById: string;
  creatorName?: string;
  ownerOrgId?: string;
  currentOrgId?: string;
  assigneeId?: string;
  assigneeName?: string;
  workflowStatus: WorkflowStatus;
  workflowHistory: WorkflowEvent[];
  createdAt?: number;
  updatedAt?: number;
  module?: 'hse';
}

export interface HsePlanKpi {
  kpi: string;
  target: string;
  currentStatus: string;
  measurementFrequency: string;
}

export interface HsePlanRiskItem {
  id: string;
  activity: string;
  hazard: string;
  initialRisk?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  initialProbability?: number;
  initialSeverity?: number;
  controlMeasure: string;
  residualRisk?: string;
  residualLevel?: 'LOW' | 'MEDIUM';
}

export interface HseEmergencyScenario {
  id: string;
  scenarioName?: string;
  scenario?: string;
  responseProcedure?: string;
  immediateAction?: string;
  assemblyPoint: string;
  commander?: string;
  externalContact?: string;
}

export type HsePlanEmergencyScenario = HseEmergencyScenario;

export interface HsePlan {
  id: string;
  projectId: string;
  planNumber: string;
  revision: string;
  approvalDate?: string;
  revisionDate?: string;
  title: string;
  scope?: string;
  scopeOfWork?: string;
  policyStatement: string;
  emergencyAssemblyPoint?: string;
  emergencyPhone?: string;
  hospitalSupport?: string;
  objectivesAndKpis?: HsePlanKpi[];
  orgStructure?: {
    role: string;
    name: string;
    contact: string;
    responsibilities: string;
  }[];
  riskMatrix: HsePlanRiskItem[];
  emergencyScenarios: HsePlanEmergencyScenario[];
  medicalFacilities?: {
    firstAidPost: string;
    doctorName: string;
    ambulanceStatus: string;
    nearestHospital: string;
    phone: string;
  };
  environmentalPlanSummary?: string;
  // Workflow
  createdById: string;
  creatorName?: string;
  ownerOrgId?: string;
  currentOrgId?: string;
  assigneeId?: string;
  assigneeName?: string;
  workflowStatus: WorkflowStatus;
  workflowHistory: WorkflowEvent[];
  createdAt?: number;
  updatedAt?: number;
  module?: 'hse';
}
