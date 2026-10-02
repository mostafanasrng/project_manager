import {
  ProjectBaseline,
  BaselineActivity,
  ProgressTrackingRecord,
  ActivityProgressEntry,
  PeriodicPlanRecord,
  ActivityPlanEntry,
  PeriodicComparisonItem,
  EvmPeriodCalculation,
  SCurveDataPoint,
  PlanningActivity,
  WorkflowStatus,
  Project
} from '../types';

const BASELINES_STORAGE_KEY = 'hamyar_project_baselines';
const PROGRESS_TRACKING_STORAGE_KEY = 'hamyar_progress_trackings';
const PERIODIC_PLANS_STORAGE_KEY = 'hamyar_periodic_plans';
const EVM_PERIODS_STORAGE_KEY = 'hamyar_evm_periods';
const STATEMENTS_STORAGE_KEY = 'hamyar_statements';
const CBS_STATEMENTS_STORAGE_KEY = 'hamyar_cbs_statements';
const MINUTES_STORAGE_KEY = 'hamyar_minutes';
const METRES_STORAGE_KEY = 'hamyar_metres';
const ESTIMATES_STORAGE_KEY = 'hamyar_estimates';
const CBS_NODES_STORAGE_KEY = 'hamyar_cbs_nodes';
const PROJECTS_STORAGE_KEY = 'hamyar_projects';

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data && data !== 'undefined' ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
};

export class EvmEngineService {
  /**
   * Calculate Planned Value (PV)
   * PV = BAC * (Planned Progress / 100)
   */
  public static calculatePV(bac: number, plannedProgressPercent: number): number {
    const progress = Math.max(0, Math.min(100, plannedProgressPercent));
    return Math.round(bac * (progress / 100));
  }

  /**
   * Calculate Earned Value (EV)
   * EV = BAC * (Actual Progress / 100)
   */
  public static calculateEV(bac: number, actualProgressPercent: number): number {
    const progress = Math.max(0, Math.min(100, actualProgressPercent));
    return Math.round(bac * (progress / 100));
  }

  /**
   * Calculate monetary total of a traditional / price-list statement from minutes, metres, estimates, values and project coefficients
   */
  public static calculateTraditionalStatementAmount(
    statement: any,
    allMinutes: any[],
    allMetres: any[],
    allEstimates: any[],
    project?: Project | null
  ): number {
    if (!statement) return 0;

    // 1. Direct explicit amount stored on statement
    const directFields = [
      statement.totalAmount,
      statement.approvedAmount,
      statement.finalPayableAmount,
      statement.netAmount,
      statement.totalCoeff,
      statement.payableAmount,
      statement.amount,
      statement.finalAmount,
      statement.cumulativeAmount,
      statement.employerTotalAmount,
      statement.employerTotal,
      statement.consultantTotalAmount,
      statement.consultantTotal,
      statement.contractorTotalAmount,
      statement.contractorTotal,
      statement.total
    ];

    for (const val of directFields) {
      if (val !== undefined && val !== null && Number(val) > 0) {
        return Math.round(Number(val));
      }
    }

    // 2. Direct sum from values/items/rows array
    const rawItems = statement.values || statement.items || statement.rows || statement.workItems || [];
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      let sumItems = 0;
      rawItems.forEach((v: any) => {
        const itemAmt = Number(
          v.amount ||
          v.total ||
          v.totalPrice ||
          v.approvedAmount ||
          v.employerAmount ||
          v.netAmount ||
          v.cumulativeFinancialValue ||
          v.currentPeriodValue ||
          0
        );

        if (itemAmt > 0) {
          sumItems += itemAmt;
        } else {
          const qty = Number(v.quantity || v.approvedQuantity || v.cumulativeQuantity || v.currentQuantity || 0);
          const uPrice = Number(v.unitPrice || v.price || v.basePrice || 0);
          if (qty > 0 && uPrice > 0) {
            sumItems += qty * uPrice;
          }
        }
      });

      if (sumItems > 0) {
        return Math.round(sumItems);
      }
    }

    // 3. Dynamic sum from linked minutes -> metres -> estimates
    const minIds: string[] = statement.selectedMinuteIds || [];
    let totalWithCoeff = 0;

    const getMultipliers = (itemCode: string, itemType: string = 'NORMAL', independentCoef: number = 1) => {
      if (itemType === 'STARRED' || itemType === 'INVOICE') {
        return independentCoef || 1;
      }
      if (!project || !project.coefficients) return 1;
      const c = project.coefficients;
      let base =
        (c.regional || 1) *
        (c.overhead || 1) *
        (c.contractor || 1) *
        (c.equipment || 1) *
        (c.others || 1);
      c.generalCoefficients?.forEach((gc) => {
        base *= gc.value || 1;
      });
      const chapterPart = (itemCode || '').substring(0, 2);
      const chapterMatch = c.chapterCoefficients?.find((cc) => cc.chapterCode === chapterPart);
      const chapterCoeff = chapterMatch ? chapterMatch.multiplier : 1;
      return base * chapterCoeff;
    };

    const getUnitPrice = (code: string) => {
      const est = allEstimates.find(
        (e) => e.code === code && (!e.projectId || String(e.projectId).trim() === String(statement.projectId).trim())
      );
      if (est && est.unitPrice) return est.unitPrice;
      if (project?.priceLists) {
        for (const pl of project.priceLists) {
          const item = pl.items?.find((i) => i.code === code);
          if (item && item.price) return item.price;
        }
      }
      return 0;
    };

    const getRowEffectivePrice = (m: any) => {
      if (
        (m.itemType === 'STARRED' || m.itemType === 'INVOICE') &&
        m.unitPrice !== undefined &&
        m.unitPrice !== 0
      ) {
        return m.unitPrice;
      }
      return getUnitPrice(m.itemCode || '');
    };

    minIds.forEach((mid) => {
      const associatedMetres = allMetres.filter((m) => m.minuteId === mid);
      associatedMetres.forEach((m) => {
        const up = getRowEffectivePrice(m);
        const mult = getMultipliers(m.itemCode, m.itemType, m.independentCoefficient);
        const cQty = m.contractorTotal !== undefined ? m.contractorTotal : m.partialTotal;
        const consQty = m.consultantTotal !== undefined ? m.consultantTotal : cQty;
        const empQty = m.employerTotal !== undefined ? m.employerTotal : consQty;
        const finalQty = empQty !== undefined ? empQty : (m.partialTotal || 0);

        const lineTotal = finalQty * up * mult;
        totalWithCoeff += lineTotal;
      });
    });

    if (totalWithCoeff > 0) {
      return Math.round(totalWithCoeff);
    }

    return 0;
  }

  /**
   * Calculate monetary total of a CBS statement from CBS nodes, values and project data
   */
  public static calculateCbsStatementAmount(statement: any, allCbsNodes: any[], project?: Project | null): number {
    if (!statement) return 0;

    // 1. Direct explicit amount stored on statement
    const directFields = [
      statement.totalAmount,
      statement.approvedAmount,
      statement.finalPayableAmount,
      statement.netAmount,
      statement.payableAmount,
      statement.currentTotal,
      statement.cumulativeFinancialValue,
      statement.employerTotal,
      statement.consultantTotal,
      statement.contractorTotal,
      statement.amount,
      statement.total
    ];

    for (const val of directFields) {
      if (val !== undefined && val !== null && Number(val) > 0) {
        return Math.round(Number(val));
      }
    }

    // 2. Calculate from values array
    const rawValues = statement.values || statement.items || statement.rows || [];
    if (Array.isArray(rawValues) && rawValues.length > 0) {
      let total = 0;
      const projNodes = allCbsNodes.filter((n) => 
        !n.projectId || !statement.projectId || String(n.projectId).trim() === String(statement.projectId).trim()
      );

      const projectWbs = project?.wbsScheduleMapping || project?.cbsMapping || [];

      rawValues.forEach((v: any) => {
        // Direct value amount
        const directItemAmt = Number(
          v.cumulativeFinancialValue ||
          v.currentPeriodValue ||
          v.employerValue ||
          v.approvedAmount ||
          v.amount ||
          v.total ||
          v.netAmount ||
          0
        );

        if (directItemAmt > 0) {
          total += directItemAmt;
          return;
        }

        // Find matching node from CBS nodes or project WBS mapping
        const node = projNodes.find((n) => 
          n.id === v.cbsId || 
          n.code === v.cbsId || 
          n.id === v.itemCode || 
          n.code === v.itemCode || 
          n.id === v.code || 
          n.code === v.code
        );

        const wbsItem = projectWbs.find((w) => 
          w.cbsCode === v.cbsId || 
          w.cbsCode === v.itemCode || 
          w.cbsCode === v.code
        );

        const nodeBudget = node?.budget || wbsItem?.allocatedAmount || ((node?.quantity || wbsItem?.quantity || 1) * (node?.unitPrice || wbsItem?.unitPrice || 0));

        const progPercent = Number(
          v.employerProgressPercent ?? 
          v.currentProgressPercent ?? 
          v.contractorProgressPercent ?? 
          v.cumulativeProgressPercent ?? 
          v.progressPercent ?? 
          0
        );

        if (progPercent > 0 && nodeBudget > 0) {
          total += (progPercent / 100) * nodeBudget;
        } else {
          const qty = Number(v.employerQuantity ?? v.currentQuantity ?? v.approvedQuantity ?? v.quantity ?? 0);
          const uPrice = Number(node?.unitPrice || wbsItem?.unitPrice || (nodeBudget && (node?.quantity || 1) ? nodeBudget / (node?.quantity || 1) : 0));
          if (qty > 0 && uPrice > 0) {
            total += qty * uPrice;
          }
        }
      });

      if (total > 0) return Math.round(total);
    }

    return 0;
  }

  /**
   * Automatically fetch Actual Cost (AC) directly from approved/frozen statements in all storage keys
   * (NO MANUAL INPUT - Directly aggregated from Technical Office & CBS approved statements)
   */
  public static fetchACFromApprovedStatements(projectId: string): {
    totalAC: number;
    statementCount: number;
    approvedStatementIds: string[];
    statementsSummary: Array<{ id: string; number: string; date: string; amount: number; type: 'TRADITIONAL' | 'CBS' }>;
  } {
    // Load from all potential statement storage locations
    const statements = loadFromStorage<any[]>(STATEMENTS_STORAGE_KEY, []);
    const cbsStatements = loadFromStorage<any[]>(CBS_STATEMENTS_STORAGE_KEY, []);
    const contractorStatements = loadFromStorage<any[]>('hamyar_contractor_statements', []);
    const priceListStatements = loadFromStorage<any[]>('hamyar_price_list_statements', []);
    const progressStatements = loadFromStorage<any[]>('hamyar_progress_statements', []);

    const allMinutes = loadFromStorage<any[]>(MINUTES_STORAGE_KEY, []);
    const allMetres = loadFromStorage<any[]>(METRES_STORAGE_KEY, []);
    const allEstimates = loadFromStorage<any[]>(ESTIMATES_STORAGE_KEY, []);
    const allCbsNodes = loadFromStorage<any[]>(CBS_NODES_STORAGE_KEY, []);
    const allProjects = loadFromStorage<Project[]>(PROJECTS_STORAGE_KEY, []);

    const currentProject = allProjects.find(
      (p) => String(p.id).trim() === String(projectId).trim()
    );

    // Merge and deduplicate all statements by ID
    const seenIds = new Set<string>();
    const allCombinedStatements: Array<{ statement: any; defaultType: 'TRADITIONAL' | 'CBS' }> = [];

    const addStatements = (list: any[], type: 'TRADITIONAL' | 'CBS') => {
      if (Array.isArray(list)) {
        list.forEach((s) => {
          if (s && s.id && !seenIds.has(String(s.id))) {
            seenIds.add(String(s.id));
            allCombinedStatements.push({ statement: s, defaultType: type });
          } else if (s && !s.id) {
            const tempId = `stmt_${Math.random()}`;
            allCombinedStatements.push({ statement: { ...s, id: tempId }, defaultType: type });
          }
        });
      }
    };

    addStatements(cbsStatements, 'CBS');
    addStatements(statements, 'TRADITIONAL');
    addStatements(contractorStatements, 'TRADITIONAL');
    addStatements(priceListStatements, 'TRADITIONAL');
    addStatements(progressStatements, 'CBS');

    let totalAC = 0;
    const approvedStatementIds: string[] = [];
    const statementsSummary: Array<{ id: string; number: string; date: string; amount: number; type: 'TRADITIONAL' | 'CBS' }> = [];

    const isProjectMatch = (s: any) => {
      if (!s) return false;
      if (!projectId) return true;
      const sProj = String(s.projectId || s.project_id || s.projId || s.project || '').trim();
      const targetProj = String(projectId).trim();
      if (!sProj) return true; // If statement doesn't specify projectId, it matches current project
      
      const cleanS = sProj.toLowerCase().replace(/^p(roj)?[-_]?/i, '');
      const cleanTarget = targetProj.toLowerCase().replace(/^p(roj)?[-_]?/i, '');
      return sProj === targetProj || sProj.toLowerCase() === targetProj.toLowerCase() || cleanS === cleanTarget;
    };

    const isStatementApproved = (s: any) => {
      if (!s) return false;
      
      // 1. Check if statement is finalized/frozen
      const isFrozen = Boolean(s.isFinalFrozen || s.frozen || s.isFrozen || s.finalFrozen);
      
      const statusRaw = s.status || s.workflowStatus || (s.workflowHistory?.length ? s.workflowHistory[s.workflowHistory.length - 1]?.toStatus : '');
      const status = String(statusRaw || '').trim().toUpperCase();
      const statusFa = String(statusRaw || '').trim();

      // Check if statement has final approval from employer or final status
      const isEmployerApprovedStatus =
        status === WorkflowStatus.APPROVED_BY_EMPLOYER ||
        status === 'APPROVED_BY_EMPLOYER' ||
        status === 'FINAL_APPROVED' ||
        status === 'FINAL_APPROVE' ||
        status === 'PAID' ||
        status === 'APPROVED' ||
        status === 'CONFIRMED' ||
        statusFa.includes('تایید نهایی') ||
        statusFa.includes('تایید کارفرما') ||
        statusFa.includes('مصوب کارفرما') ||
        statusFa.includes('Frozen') ||
        statusFa.includes('منجمد') ||
        statusFa.includes('قطعی');

      const hasEmployerApprovalEvent =
        Array.isArray(s.workflowHistory) &&
        s.workflowHistory.some(
          (ev: any) =>
            ev &&
            (ev.toStatus === WorkflowStatus.APPROVED_BY_EMPLOYER ||
              ev.toStatus === 'APPROVED_BY_EMPLOYER' ||
              ev.toStatus === 'APPROVED' ||
              ev.action === 'FINAL_APPROVE' ||
              ev.action === 'APPROVE_BY_EMPLOYER' ||
              (ev.action === 'APPROVE' && (ev.userRole === 'EMPLOYER' || ev.orgType === 'EMPLOYER' || String(ev.roleKey || '').includes('employer') || ev.toStatus === 'APPROVED_BY_EMPLOYER')) ||
              (ev.comment && (ev.comment.includes('تایید نهایی') || ev.comment.includes('کارفرما'))))
        );

      if (isFrozen || isEmployerApprovedStatus || hasEmployerApprovalEvent) {
        // As long as it wasn't subsequently rejected
        return status !== WorkflowStatus.REJECTED && status !== 'REJECTED' && !statusFa.includes('رد شده');
      }

      return false;
    };

    allCombinedStatements
      .filter(({ statement: s }) => isProjectMatch(s) && isStatementApproved(s))
      .forEach(({ statement: s, defaultType }) => {
        const isCbs = 
          defaultType === 'CBS' || 
          s.type === 'CBS' || 
          s.contractType === 'CBS' || 
          (Array.isArray(s.values) && s.values.some((v: any) => v.cbsId || v.currentProgressPercent !== undefined));

        let amount = 0;
        if (isCbs) {
          amount = EvmEngineService.calculateCbsStatementAmount(s, allCbsNodes, currentProject);
        } else {
          amount = EvmEngineService.calculateTraditionalStatementAmount(
            s,
            allMinutes,
            allMetres,
            allEstimates,
            currentProject
          );
        }

        // Fallback: If amount still 0 but statement has values or project initial budget
        if (amount === 0 && currentProject?.initialBudget) {
          if (Array.isArray(s.values) && s.values.length > 0) {
            const sumPerc = s.values.reduce((sum: number, v: any) => {
              return sum + (Number(v.employerProgressPercent ?? v.currentProgressPercent ?? v.progressPercent ?? 0));
            }, 0);
            if (sumPerc > 0) {
              amount = Math.round((sumPerc / 100) * (currentProject.initialBudget * 0.1));
            }
          }
        }

        totalAC += amount;
        approvedStatementIds.push(s.id);
        statementsSummary.push({
          id: s.id,
          number: s.number
            ? String(s.number).startsWith('صورت')
              ? s.number
              : isCbs
                ? `صورت‌وضعیت CBS شماره ${s.number}`
                : `صورت‌وضعیت کارکرد موقت شماره ${s.number}`
            : isCbs
              ? `صورت‌وضعیت CBS ${s.id}`
              : `صورت‌وضعیت کارکرد ${s.id}`,
          date: s.date || s.statementDate || s.periodEndDate || s.endDate || s.startDate || '1405/01/01',
          amount,
          type: isCbs ? 'CBS' : 'TRADITIONAL'
        });
      });

    return {
      totalAC,
      statementCount: approvedStatementIds.length,
      approvedStatementIds,
      statementsSummary
    };
  }

  /**
   * Calculate all EVM Key Indices and Forecasting values
   */
  public static calculateEvmIndices(params: {
    bac: number;
    pv: number;
    ev: number;
    ac: number;
    forecastMethod?: 'STANDARD' | 'CRITICAL_RATIO' | 'REVISED_BUDGET';
  }): {
    sv: number; // Schedule Variance
    cv: number; // Cost Variance
    spi: number; // Schedule Performance Index
    cpi: number; // Cost Performance Index
    eac: number; // Estimate at Completion
    vac: number; // Variance at Completion
    tcpi: number; // To-Complete Performance Index
    status: {
      scheduleStatus: 'AHEAD' | 'ON_TRACK' | 'SLIGHT_DELAY' | 'CRITICAL_DELAY';
      costStatus: 'UNDER_BUDGET' | 'ON_BUDGET' | 'SLIGHT_OVER' | 'CRITICAL_OVER';
    };
  } {
    const { bac, pv, ev, ac, forecastMethod = 'STANDARD' } = params;

    // Schedule Variance: SV = EV - PV (ریالی)
    const sv = ev - pv;

    // Cost Variance: CV = EV - AC (ریالی)
    const cv = ev - ac;

    // Schedule Performance Index: SPI = EV / PV
    const spi = pv > 0 ? Math.round((ev / pv) * 1000) / 1000 : 1.0;

    // Cost Performance Index: CPI = EV / AC
    const cpi = ac > 0 ? Math.round((ev / ac) * 1000) / 1000 : 1.0;

    // Estimate at Completion (EAC):
    let eac = bac;
    if (forecastMethod === 'STANDARD') {
      // EAC = BAC / CPI (فرض تداوم بازده هزینه فعلی)
      eac = cpi > 0 ? Math.round(bac / cpi) : Math.round(ac + (bac - ev));
    } else if (forecastMethod === 'CRITICAL_RATIO') {
      // EAC = AC + (BAC - EV) / (CPI * SPI) (فرض تاثیر توامان هزینه و زمان)
      const cr = Math.max(0.1, cpi * spi);
      eac = Math.round(ac + (bac - ev) / cr);
    } else {
      // EAC = AC + (BAC - EV) (فرض بازگشت بهره‌وری به برنامه اولیه)
      eac = Math.round(ac + Math.max(0, bac - ev));
    }

    // Variance at Completion: VAC = BAC - EAC
    const vac = bac - eac;

    // To-Complete Performance Index: TCPI = (BAC - EV) / (BAC - AC)
    const remainingBudget = bac - ac;
    const remainingWork = bac - ev;
    const tcpi = remainingBudget > 0 ? Math.round((remainingWork / remainingBudget) * 1000) / 1000 : 1.0;

    // Qualitative status determination
    let scheduleStatus: 'AHEAD' | 'ON_TRACK' | 'SLIGHT_DELAY' | 'CRITICAL_DELAY' = 'ON_TRACK';
    if (spi >= 1.05) scheduleStatus = 'AHEAD';
    else if (spi >= 0.98) scheduleStatus = 'ON_TRACK';
    else if (spi >= 0.88) scheduleStatus = 'SLIGHT_DELAY';
    else scheduleStatus = 'CRITICAL_DELAY';

    let costStatus: 'UNDER_BUDGET' | 'ON_BUDGET' | 'SLIGHT_OVER' | 'CRITICAL_OVER' = 'ON_BUDGET';
    if (cpi >= 1.03) costStatus = 'UNDER_BUDGET';
    else if (cpi >= 0.98) costStatus = 'ON_BUDGET';
    else if (cpi >= 0.88) costStatus = 'SLIGHT_OVER';
    else costStatus = 'CRITICAL_OVER';

    return {
      sv,
      cv,
      spi,
      cpi,
      eac,
      vac,
      tcpi,
      status: {
        scheduleStatus,
        costStatus
      }
    };
  }

  /**
   * Calculate Weighted Physical Progress for a list of activities
   */
  public static calculateWeightedProgress(activities: Array<{
    weightPercent: number;
    plannedProgress: number;
    actualProgress: number;
  }>): {
    planned: number;
    actual: number;
    totalWeight: number;
    isWeightNormalized: boolean;
  } {
    if (!activities || activities.length === 0) {
      return { planned: 0, actual: 0, totalWeight: 0, isWeightNormalized: true };
    }

    let sumWeight = 0;
    let weightedPlanned = 0;
    let weightedActual = 0;

    activities.forEach(act => {
      const w = Number(act.weightPercent) || 0;
      sumWeight += w;
      weightedPlanned += (Number(act.plannedProgress) || 0) * w;
      weightedActual += (Number(act.actualProgress) || 0) * w;
    });

    const isWeightNormalized = Math.abs(sumWeight - 100) < 0.1;
    const factor = sumWeight > 0 ? sumWeight : 1;

    return {
      planned: Math.min(100, Math.round((weightedPlanned / factor) * 100) / 100),
      actual: Math.min(100, Math.round((weightedActual / factor) * 100) / 100),
      totalWeight: Math.round(sumWeight * 100) / 100,
      isWeightNormalized
    };
  }

  /**
   * Generate Cumulative S-Curve Time-Series Data Points for plotting (PV, EV, AC over time)
   */
  public static generateCumulativeSCurveData(params: {
    projectId: string;
    bac: number;
    activities: PlanningActivity[];
    customPeriodRecords?: EvmPeriodCalculation[];
  }): SCurveDataPoint[] {
    const { projectId, bac, activities } = params;

    // 1. Check if there are recorded progress reports in hamyar_planning_reports
    const reports = loadFromStorage<any[]>('hamyar_planning_reports', [])
      .filter(r => String(r.projectId).trim() === String(projectId).trim());

    if (reports.length > 0) {
      const sortedReports = [...reports].sort((a, b) => 
        (a.periodEndDate || a.periodStartDate || '').localeCompare(b.periodEndDate || b.periodStartDate || '')
      );

      return sortedReports.map(r => {
        const plannedP = Number(r.plannedPhysicalProgress) || 0;
        const actualP = Number(r.actualPhysicalProgress) || 0;
        const finP = Number(r.actualFinancialProgress) || (r.ac && bac > 0 ? Math.round((r.ac / bac) * 100) : actualP);
        
        const pvAmount = r.pv || Math.round(bac * (plannedP / 100));
        const evAmount = r.ev || Math.round(bac * (actualP / 100));
        const acAmount = r.ac || Math.round(bac * (finP / 100));

        return {
          date: r.periodEndDate || r.periodStartDate || r.reportNumber || 'نامشخص',
          periodLabel: r.reportTitle || r.reportNumber || r.periodEndDate || 'گزارش پیشرفت',
          plannedPercent: plannedP,
          actualPercent: actualP,
          actualCostPercent: finP,
          pvAmount,
          evAmount,
          acAmount,
          spi: r.spi || (pvAmount > 0 ? Math.round((evAmount / pvAmount) * 100) / 100 : 1),
          cpi: r.cpi || (acAmount > 0 ? Math.round((evAmount / acAmount) * 100) / 100 : 1),
          sv: evAmount - pvAmount,
          cv: evAmount - acAmount
        };
      });
    }

    // 2. Load recorded EVM periods or generate monthly simulation based on baseline dates
    const storedPeriods = loadFromStorage<EvmPeriodCalculation[]>(EVM_PERIODS_STORAGE_KEY, [])
      .filter(p => String(p.projectId).trim() === String(projectId).trim());

    if (storedPeriods.length > 0) {
      // Sort by date
      const sorted = [...storedPeriods].sort((a, b) => a.periodDate.localeCompare(b.periodDate));
      return sorted.map(p => ({
        date: p.periodDate,
        periodLabel: p.periodName,
        plannedPercent: p.plannedProgressPercent,
        actualPercent: p.actualProgressPercent,
        actualCostPercent: p.financialProgressPercent,
        pvAmount: p.cumulativePv,
        evAmount: p.cumulativeEv,
        acAmount: p.cumulativeAc,
        spi: p.spi,
        cpi: p.cpi,
        sv: p.sv,
        cv: p.cv
      }));
    }

    // Generate monthly cumulative progression based on activity baseline and current progress
    const periods = [
      { key: 'm1', label: 'فروردین', date: '1405/01/31', plannedP: 8, actualP: 8, acRatio: 1.0 },
      { key: 'm2', label: 'اردیبهشت', date: '1405/02/31', plannedP: 20, actualP: 18, acRatio: 1.04 },
      { key: 'm3', label: 'خرداد', date: '1405/03/31', plannedP: 35, actualP: 30, acRatio: 1.05 },
      { key: 'm4', label: 'تیر (فعلی)', date: '1405/04/31', plannedP: 50, actualP: 42, acRatio: 1.06 },
      { key: 'm5', label: 'مرداد', date: '1405/05/31', plannedP: 65, actualP: 54, acRatio: 1.05 },
      { key: 'm6', label: 'شهریور', date: '1405/06/31', plannedP: 80, actualP: 68, acRatio: 1.04 },
      { key: 'm7', label: 'مهر', date: '1405/07/30', plannedP: 92, actualP: 82, acRatio: 1.03 },
      { key: 'm8', label: 'آبان (تکمیل)', date: '1405/08/30', plannedP: 100, actualP: 100, acRatio: 1.02 }
    ];

    // Read real AC from statements
    const realAcResult = this.fetchACFromApprovedStatements(projectId);
    const realAC = realAcResult.totalAC;

    // Calculate dynamic physical progress from actual activities
    const weightedProg = this.calculateWeightedProgress(activities);
    const currentActual = weightedProg.actual > 0 ? weightedProg.actual : 42;
    const currentPlanned = weightedProg.planned > 0 ? weightedProg.planned : 50;

    const points: SCurveDataPoint[] = [];

    periods.forEach((period, idx) => {
      // Scale planned and actual realistically up to current month (index 3 is current month)
      let plannedPercent = period.plannedP;
      let actualPercent = period.actualP;

      if (idx === 3) {
        plannedPercent = currentPlanned;
        actualPercent = currentActual;
      } else if (idx < 3) {
        // Earlier months proportional
        const factor = currentActual / 42;
        actualPercent = Math.min(100, Math.round(period.actualP * factor));
      }

      const pvAmount = Math.round(bac * (plannedPercent / 100));
      const evAmount = Math.round(bac * (actualPercent / 100));

      let acAmount = 0;
      if (idx <= 3) {
        if (idx === 3 && realAC > 0) {
          acAmount = realAC;
        } else {
          acAmount = Math.round(evAmount * period.acRatio);
        }
      }

      const actualCostPercent = acAmount > 0 ? Math.round((acAmount / bac) * 1000) / 10 : undefined;
      const spi = pvAmount > 0 ? Math.round((evAmount / pvAmount) * 100) / 100 : 1;
      const cpi = acAmount > 0 ? Math.round((evAmount / acAmount) * 100) / 100 : 1;

      points.push({
        date: period.date,
        periodLabel: period.label,
        plannedPercent,
        actualPercent: idx <= 3 ? actualPercent : (actualPercent || 0),
        actualCostPercent,
        pvAmount,
        evAmount,
        acAmount: idx <= 3 ? acAmount : undefined,
        spi: idx <= 3 ? spi : undefined,
        cpi: idx <= 3 ? cpi : undefined,
        sv: idx <= 3 ? evAmount - pvAmount : undefined,
        cv: idx <= 3 && acAmount > 0 ? evAmount - acAmount : undefined
      });
    });

    return points;
  }

  /**
   * Create and save a new Project Baseline snapshot (خط مبنای اولیه زمان‌بندی و بودجه)
   */
  public static createBaseline(params: {
    projectId: string;
    version: string;
    title: string;
    description?: string;
    totalBAC: number;
    activities: PlanningActivity[];
    user: { id: string; name: string };
  }): ProjectBaseline {
    const { projectId, version, title, description, totalBAC, activities, user } = params;

    const existingBaselines = loadFromStorage<ProjectBaseline[]>(BASELINES_STORAGE_KEY, []);

    // Set other baselines of this project to SUPERSEDED
    const updatedExisting = existingBaselines.map(b => {
      if (String(b.projectId).trim() === String(projectId).trim() && b.status === 'ACTIVE') {
        return { ...b, status: 'SUPERSEDED' as const };
      }
      return b;
    });

    const baselineActivities: BaselineActivity[] = activities.map(act => ({
      id: act.id,
      code: act.code,
      title: act.title,
      cbsNodeId: act.cbsNodeId,
      weightPercent: act.weightPercent || 0,
      plannedStartDate: act.baselineStartDate,
      plannedEndDate: act.baselineEndDate,
      durationDays: act.durationDays,
      bac: act.allocatedAmount || Math.round(totalBAC * ((act.weightPercent || 0) / 100)),
      unit: act.unit,
      totalQuantity: act.totalQuantity,
      unitPrice: act.unitPrice,
      isCriticalPath: act.isCriticalPath
    }));

    const newBaseline: ProjectBaseline = {
      id: `bl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      projectId,
      version: version || `BL-0${existingBaselines.filter(b => b.projectId === projectId).length + 1}`,
      title: title || 'خط مبنای مصوب زمان‌بندی و بودجه',
      approvalDate: new Date().toLocaleDateString('fa-IR'),
      approvedBy: user.name,
      description,
      totalBAC,
      status: 'ACTIVE',
      isLocked: true,
      activities: baselineActivities,
      createdAt: new Date().toISOString(),
      createdById: user.id
    };

    saveToStorage(BASELINES_STORAGE_KEY, [newBaseline, ...updatedExisting]);
    return newBaseline;
  }

  /**
   * Get all baselines for a specific project
   */
  public static getBaselines(projectId: string): ProjectBaseline[] {
    const all = loadFromStorage<ProjectBaseline[]>(BASELINES_STORAGE_KEY, []);
    return all.filter(b => String(b.projectId).trim() === String(projectId).trim());
  }

  /**
   * Save a Progress Tracking Log (ثبت پیشرفت فیزیکی دوره‌ای فعالیت‌ها)
   */
  public static saveProgressTracking(record: ProgressTrackingRecord): ProgressTrackingRecord[] {
    const records = loadFromStorage<ProgressTrackingRecord[]>(PROGRESS_TRACKING_STORAGE_KEY, []);
    const exists = records.some(r => r.id === record.id);
    let updated: ProgressTrackingRecord[];

    if (exists) {
      updated = records.map(r => r.id === record.id ? record : r);
    } else {
      updated = [record, ...records];
    }

    saveToStorage(PROGRESS_TRACKING_STORAGE_KEY, updated);
    return updated;
  }

  /**
   * Get progress tracking logs for a project
   */
  public static getProgressTrackings(projectId: string): ProgressTrackingRecord[] {
    const records = loadFromStorage<ProgressTrackingRecord[]>(PROGRESS_TRACKING_STORAGE_KEY, []);
    return records.filter(r => String(r.projectId).trim() === String(projectId).trim());
  }

  /**
   * Save a Periodic Plan / Replan Log (ثبت و اصلاح دوره‌ای برنامه زمانی: روزانه، هفتگی، دو‌هفتگی، ماهانه)
   */
  public static savePeriodicPlan(record: PeriodicPlanRecord): PeriodicPlanRecord[] {
    const records = loadFromStorage<PeriodicPlanRecord[]>(PERIODIC_PLANS_STORAGE_KEY, []);
    const exists = records.some(r => r.id === record.id);
    let updated: PeriodicPlanRecord[];

    if (exists) {
      updated = records.map(r => r.id === record.id ? record : r);
    } else {
      updated = [record, ...records];
    }

    saveToStorage(PERIODIC_PLANS_STORAGE_KEY, updated);
    return updated;
  }

  /**
   * Get periodic plan records for a project
   */
  public static getPeriodicPlans(projectId: string): PeriodicPlanRecord[] {
    const records = loadFromStorage<PeriodicPlanRecord[]>(PERIODIC_PLANS_STORAGE_KEY, []);
    return records.filter(r => String(r.projectId).trim() === String(projectId).trim());
  }

  /**
   * Delete a periodic plan record
   */
  public static deletePeriodicPlan(id: string): void {
    const records = loadFromStorage<PeriodicPlanRecord[]>(PERIODIC_PLANS_STORAGE_KEY, []);
    saveToStorage(PERIODIC_PLANS_STORAGE_KEY, records.filter(r => r.id !== id));
  }

  /**
   * Delete a progress tracking record
   */
  public static deleteProgressTracking(id: string): void {
    const records = loadFromStorage<ProgressTrackingRecord[]>(PROGRESS_TRACKING_STORAGE_KEY, []);
    saveToStorage(PROGRESS_TRACKING_STORAGE_KEY, records.filter(r => r.id !== id));
  }

  /**
   * Generate combined Periodic Comparison between Periodic Plans and Progress Tracking Records
   */
  public static getPeriodicComparison(
    projectId: string,
    periodFilter?: 'ALL' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
  ): PeriodicComparisonItem[] {
    const plans = EvmEngineService.getPeriodicPlans(projectId);
    const trackings = EvmEngineService.getProgressTrackings(projectId);

    const periodLabels: Record<string, string> = {
      DAILY: 'روزانه',
      WEEKLY: 'هفتگی',
      BIWEEKLY: 'دو‌هفتگی',
      MONTHLY: 'ماهانه'
    };

    const items: PeriodicComparisonItem[] = [];
    const usedTrackingIds = new Set<string>();

    // 1. Match from Plans
    plans.forEach(plan => {
      if (periodFilter && periodFilter !== 'ALL' && plan.periodType !== periodFilter) {
        return;
      }

      // Find closest or matching tracking record for same period
      const matchingTracking = trackings.find(
        t => t.reportingPeriod === plan.periodType && (t.date === plan.date || Math.abs(new Date(t.date).getTime() - new Date(plan.date).getTime()) < 86400000 * 7)
      ) || trackings.find(t => t.reportingPeriod === plan.periodType);

      if (matchingTracking) {
        usedTrackingIds.add(matchingTracking.id);
      }

      const pPlanned = plan.totalWeightedPlannedProgress || 0;
      const pActual = matchingTracking ? matchingTracking.totalWeightedActualProgress : (plan.totalWeightedActualProgress || 0);
      const variance = Math.round((pActual - pPlanned) * 100) / 100;
      const spi = pPlanned > 0 ? Math.round((pActual / pPlanned) * 100) / 100 : 1;

      let status: PeriodicComparisonItem['status'] = 'ON_TRACK';
      if (variance >= 2) status = 'AHEAD';
      else if (variance >= -2) status = 'ON_TRACK';
      else if (variance >= -8) status = 'SLIGHT_DELAY';
      else status = 'CRITICAL_DELAY';

      items.push({
        id: `comp_p_${plan.id}`,
        date: plan.date,
        periodType: plan.periodType,
        periodLabel: periodLabels[plan.periodType] || plan.periodType,
        planTitle: plan.title || `برنامه ${periodLabels[plan.periodType]} (${plan.planNumber})`,
        plannedPercent: pPlanned,
        actualPercent: pActual,
        variance,
        spi,
        status,
        planRecord: plan,
        trackingRecord: matchingTracking
      });
    });

    // 2. Add remaining tracking records that weren't paired
    trackings.forEach(track => {
      if (usedTrackingIds.has(track.id)) return;
      if (periodFilter && periodFilter !== 'ALL' && track.reportingPeriod !== periodFilter) {
        return;
      }

      const pPlanned = track.totalWeightedPlannedProgress || 0;
      const pActual = track.totalWeightedActualProgress || 0;
      const variance = Math.round((pActual - pPlanned) * 100) / 100;
      const spi = pPlanned > 0 ? Math.round((pActual / pPlanned) * 100) / 100 : 1;

      let status: PeriodicComparisonItem['status'] = 'ON_TRACK';
      if (variance >= 2) status = 'AHEAD';
      else if (variance >= -2) status = 'ON_TRACK';
      else if (variance >= -8) status = 'SLIGHT_DELAY';
      else status = 'CRITICAL_DELAY';

      items.push({
        id: `comp_t_${track.id}`,
        date: track.date,
        periodType: track.reportingPeriod,
        periodLabel: periodLabels[track.reportingPeriod] || track.reportingPeriod,
        planTitle: `گزارش پیشرفت ${periodLabels[track.reportingPeriod]} (${track.recordNumber})`,
        plannedPercent: pPlanned,
        actualPercent: pActual,
        variance,
        spi,
        status,
        trackingRecord: track
      });
    });

    // Sort by date descending
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }
}
