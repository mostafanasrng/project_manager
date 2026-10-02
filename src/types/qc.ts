import { WorkflowStatus, WorkflowEvent } from '../../types';

export type QCInspectionStatus = 'APPROVED' | 'CONDITIONAL' | 'REJECTED' | 'PENDING' | 'PASSED' | 'FAILED' | 'IN_PROGRESS' | WorkflowStatus;
export type QCDiscipline = string;
export type NCRSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NCRStatus = 'OPEN' | 'CORRECTIVE_ACTION' | 'VERIFICATION' | 'CLOSED' | WorkflowStatus;
export type LabTestType = 'CONCRETE_CUBE' | 'SOIL_PROCTOR' | 'STEEL_TENSILE' | 'WELD_NDT' | 'AGGREGATE' | 'CONCRETE_COMPRESSIVE' | string;

export interface QCChecklistItem {
  id: string;
  title: string;
  isMandatory: boolean;
  status: 'PASSED' | 'FAILED' | 'NOT_APPLICABLE' | 'PENDING' | 'CONDITIONAL' | 'APPROVED' | 'REJECTED';
  remarks?: string;
}

export interface QCInspection {
  id: string;
  rfiNumber: string;
  projectId: string;
  title: string;
  discipline: QCDiscipline;
  location: string;
  contractor: string;
  inspector: string;
  requestDate: string;
  inspectionDate: string;
  status: QCInspectionStatus;
  workflowStatus?: WorkflowStatus;
  assigneeId?: string;
  assigneeName?: string;
  createdById?: string;
  currentOrgId?: string;
  ownerOrgId?: string;
  isFinalFrozen?: boolean;
  workflowHistory?: WorkflowEvent[];
  checklists: QCChecklistItem[];
  description?: string;
  correctiveNotes?: string;
  inspectorComments?: string;
  createdAt: string;
}

export interface NonConformanceReport {
  id: string;
  ncrNumber: string;
  projectId: string;
  title: string;
  location: string;
  discipline: QCDiscipline;
  severity: NCRSeverity;
  issueDate: string;
  deadlineDate: string;
  issuedBy: string;
  responsibleParty: string;
  description: string;
  rootCause?: string;
  correctiveAction?: string;
  correctiveActionContractor?: string;
  correctiveActionConsultant?: string;
  correctiveActionEmployer?: string;
  preventiveAction?: string;
  status: NCRStatus;
  workflowStatus?: WorkflowStatus;
  assigneeId?: string;
  assigneeName?: string;
  createdById?: string;
  currentOrgId?: string;
  ownerOrgId?: string;
  isFinalFrozen?: boolean;
  workflowHistory?: WorkflowEvent[];
  closedDate?: string;
}

export interface QCLabTest {
  id: string;
  testNumber: string;
  projectId: string;
  testType: LabTestType;
  sampleLocation: string;
  samplingDate: string;
  testDate: string;
  designSpecification: string;
  resultValue: string;
  isCompliant: boolean;
  complianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL' | 'PENDING';
  consultantComplianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL' | 'PENDING';
  employerComplianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL' | 'PENDING';
  labName: string;
  approvedBy: string;
  notes?: string;
  workflowStatus?: WorkflowStatus;
  assigneeId?: string;
  assigneeName?: string;
  createdById?: string;
  currentOrgId?: string;
  ownerOrgId?: string;
  isFinalFrozen?: boolean;
  workflowHistory?: WorkflowEvent[];
}

export interface StandardQCChecklist {
  id: string;
  discipline: QCDiscipline;
  title: string;
  category: string;
  items: string[];
}
