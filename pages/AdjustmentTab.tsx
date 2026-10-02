
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Plus, Trash2, Edit3, Save, X, Printer, Calculator, 
  FileText, Calendar, Sigma, Percent, Info, ScrollText,
  Clock, CheckCircle, ChevronDown, ChevronUp, AlertTriangle, PlusCircle, MinusCircle,
  Sliders, Layers, Filter
} from 'lucide-react';
import { AdjustmentRecord, AdjustmentPeriod, ChapterPeriodIndex, 
  WorkflowStatus, WorkflowAction 
} from '../types';
import { WorkflowService } from '../services/workflowService';
import { SystemAdminService } from '../services/systemAdminService';
import { formatShamsiDate } from '../utils/dateUtils';
import { ShamsiDatePicker } from '../components/ShamsiDatePicker';
import { formatUserDisplayFormal } from '../src/utils/userFormatter';

interface AdjustmentTabProps {
  selectedProjectId: string;
  statements: any[];
  minutes: any[];
  metres: any[];
  getRowEffectivePrice: (row: any) => number;
  getMultipliers: (code: string, type: any, independentCoef: number) => { total: number };
  currentUser: any;
  orgUsers: any[];
  openWorkflowModal: (item: any, action: any) => void;
  adjustments: AdjustmentRecord[];
  setAdjustments: (adjustments: AdjustmentRecord[]) => void;
  handlePrintOfficial: (type: string, data?: any) => void;
  onOpenHistory: (item: any) => void;
}

export default function AdjustmentTab({
  selectedProjectId,
  statements,
  minutes,
  metres,
  getRowEffectivePrice,
  getMultipliers,
  currentUser,
  orgUsers,
  openWorkflowModal,
  adjustments,
  setAdjustments,
  handlePrintOfficial,
  onOpenHistory
}: AdjustmentTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AdjustmentRecord>>({});
  const [customRootInput, setCustomRootInput] = useState('');
  const [expandedRoots, setExpandedRoots] = useState<Record<string, boolean>>({});
  
  // No local useEffect for adjustments persistence, handled by parent TechnicalOffice.tsx

  // Combine statements prop with CBS statements from localStorage
  const allCombinedStatements = useMemo(() => {
    const list = [...statements];
    try {
      const cbsRaw = localStorage.getItem('hamyar_cbs_statements');
      if (cbsRaw) {
        const cbsList = JSON.parse(cbsRaw);
        if (Array.isArray(cbsList)) {
          cbsList.forEach((cs: any) => {
            if (!list.some(s => s.id === cs.id)) {
              list.push(cs);
            }
          });
        }
      }
    } catch (e) {
      console.error('Error loading hamyar_cbs_statements in AdjustmentTab', e);
    }
    return list;
  }, [statements]);

  const projectAdjustments = useMemo(() => {
    return (adjustments || []).filter(a => {
      if (!a || a.projectId !== selectedProjectId) return false;
      if (!currentUser) return false;
      if (currentUser.role === 'SYSTEM_ADMIN') return true;

      // When a document is final/frozen, users across all organizations are allowed to view it
      if (a?.isFinalFrozen) return true;

      const hasNoOversightInfo = !a.createdById && !a.assigneeId && (!a.workflowHistory || a.workflowHistory.length === 0);
      if (hasNoOversightInfo) return true;

      if (a.createdById === currentUser.id || a.assigneeId === currentUser.id) return true;

      const history = a.workflowHistory || [];
      return history.some((ev: any) => 
        ev.assigneeUserId === currentUser.id || ev.actorUserId === currentUser.id
      );
    });
  }, [adjustments, selectedProjectId, currentUser]);

  const projectStatements = useMemo(() => {
    return (allCombinedStatements || []).filter(s => {
      if (!s || s.projectId !== selectedProjectId) return false;
      // Requirement: Only finalized (قطعی شده / isFinalFrozen === true) statements can be displayed and selected for adjustment calculations
      if (s?.isFinalFrozen !== true) return false;
      if (!currentUser) return false;
      if (currentUser.role === 'SYSTEM_ADMIN') return true;

      // When a document is final/frozen, users across all organizations are allowed to view it
      if (s?.isFinalFrozen) return true;

      const hasNoOversightInfo = !s.createdById && !s.assigneeId && (!s.workflowHistory || s.workflowHistory.length === 0);
      if (hasNoOversightInfo) return true;

      if (s.createdById === currentUser.id || s.assigneeId === currentUser.id) return true;

      const history = s.workflowHistory || [];
      return history.some((ev: any) => 
        ev.assigneeUserId === currentUser.id || ev.actorUserId === currentUser.id
      );
    });
  }, [allCombinedStatements, selectedProjectId, currentUser]);

  const currentProject = useMemo(() => {
    const pData = localStorage.getItem('hamyar_projects');
    if (pData) {
      const projects = JSON.parse(pData);
      return projects.find((p: any) => p.id === selectedProjectId);
    }
    return null;
  }, [selectedProjectId]);

  const isCbsContract = useMemo(() => {
    if (!currentProject) return false;
    const cType = String(currentProject.contractType || '').trim().toUpperCase();
    return (
      cType === 'CBS' ||
      cType === 'ساختار شکست' ||
      cType === 'WBS'
    );
  }, [currentProject]);

  const selectedStatement = useMemo(() => {
    if (!formData.statementId) return null;
    return allCombinedStatements.find(s => s.id === formData.statementId);
  }, [formData.statementId, allCombinedStatements]);

  const isCbsMode = useMemo(() => {
    if (!isCbsContract) {
      return false;
    }
    if (selectedStatement) {
      if (selectedStatement.type === 'CBS' || (selectedStatement.values && Array.isArray(selectedStatement.values))) {
        return true;
      }
      if (selectedStatement.selectedMinuteIds && selectedStatement.selectedMinuteIds.length > 0) {
        return false;
      }
    }
    return isCbsContract;
  }, [isCbsContract, selectedStatement]);

  const getChapterAmounts = (statementId: string) => {
    const stmt = allCombinedStatements.find(s => s.id === statementId);
    if (!stmt) return new Map<string, number>();

    const chapterMap = new Map<string, number>();

    // CASE 1: Standard WBS Statement (with selectedMinuteIds & metres)
    if (stmt.selectedMinuteIds && stmt.selectedMinuteIds.length > 0) {
      const currentNum = parseInt(String(stmt.number).replace(/[^0-9]/g, "")) || 0;
      const projWbsStmts = allCombinedStatements.filter(s => 
        s.projectId === stmt.projectId && s.selectedMinuteIds && s.selectedMinuteIds.length > 0
      );

      const currentMinuteIds = new Set<string>();
      const prevMinuteIds = new Set<string>();

      projWbsStmts.forEach(s => {
        const num = parseInt(String(s.number).replace(/[^0-9]/g, "")) || 0;
        if (num <= currentNum) {
          s.selectedMinuteIds?.forEach((id: string) => currentMinuteIds.add(id));
        }
        if (num < currentNum) {
          s.selectedMinuteIds?.forEach((id: string) => prevMinuteIds.add(id));
        }
      });

      if (currentMinuteIds.size === 0) {
        stmt.selectedMinuteIds.forEach((id: string) => currentMinuteIds.add(id));
      }

      const currentChapterMap = new Map<string, number>();
      currentMinuteIds.forEach((minId: string) => {
        const associatedMetres = metres.filter(m => m.minuteId === minId);
        associatedMetres.forEach(m => {
          const chapter = m.itemCode ? m.itemCode.substring(0, 2) : '01';
          const price = getRowEffectivePrice(m);
          const multipliers = getMultipliers(m.itemCode, m.itemType || 'NORMAL', m.independentCoefficient || 1);
          const amount = m.partialTotal * price * multipliers.total;
          currentChapterMap.set(chapter, (currentChapterMap.get(chapter) || 0) + amount);
        });
      });

      const prevChapterMap = new Map<string, number>();
      prevMinuteIds.forEach((minId: string) => {
        const associatedMetres = metres.filter(m => m.minuteId === minId);
        associatedMetres.forEach(m => {
          const chapter = m.itemCode ? m.itemCode.substring(0, 2) : '01';
          const price = getRowEffectivePrice(m);
          const multipliers = getMultipliers(m.itemCode, m.itemType || 'NORMAL', m.independentCoefficient || 1);
          const amount = m.partialTotal * price * multipliers.total;
          prevChapterMap.set(chapter, (prevChapterMap.get(chapter) || 0) + amount);
        });
      });

      const chapterMap = new Map<string, number>();
      currentChapterMap.forEach((currAmount, chapter) => {
        const prevAmount = prevChapterMap.get(chapter) || 0;
        const netPeriodAmount = Math.max(0, currAmount - prevAmount);
        chapterMap.set(chapter, netPeriodAmount);
      });

      return chapterMap;
    }

    // CASE 2: CBS Statement (with values & cbs nodes)
    if (stmt.values && Array.isArray(stmt.values)) {
      let projNodes: any[] = [];
      try {
        const rawNodes = localStorage.getItem('hamyar_cbs_nodes');
        if (rawNodes) {
          const allNodes = JSON.parse(rawNodes);
          projNodes = allNodes.filter((n: any) => n.projectId === selectedProjectId);
        }
      } catch (e) {
        console.error("Error reading hamyar_cbs_nodes", e);
      }

      if (projNodes.length === 0 && selectedProjectId === '2') {
        projNodes = [
          { id: '1', projectId: '2', code: '01', title: 'عملیات خاکی و تسطیح', parentId: null, budget: 1500000000 },
          { id: '1.1', projectId: '2', code: '01.01', title: 'خاکبرداری زمین‌های نرم', parentId: '1', budget: 900000000 },
          { id: '1.2', projectId: '2', code: '01.02', title: 'تسطیح و رگلاژ نهایی', parentId: '1', budget: 600000000 },
          { id: '2', projectId: '2', code: '02', title: 'سازه و بتن‌ریزی', parentId: null, budget: 3500000000 },
          { id: '2.1', projectId: '2', code: '02.01', title: 'آرماتوربندی و قالب‌بندی', parentId: '2', budget: 2000000000 },
          { id: '2.2', projectId: '2', code: '02.02', title: 'بتن‌ریزی فونداسیون و سقف', parentId: '2', budget: 1500000000 },
          { id: '3', projectId: '2', code: '03', title: 'تاسیسات مکانیکی و برقی', parentId: null, budget: 2000000000 },
          { id: '3.1', projectId: '2', code: '03.01', title: 'لوله‌کشی و کانال‌کشی', parentId: '3', budget: 1200000000 },
          { id: '3.2', projectId: '2', code: '03.02', title: 'کابل‌کشی و تابلو برق', parentId: '3', budget: 800000000 }
        ];
      }

      const nodeMap = new Map<string, any>();
      projNodes.forEach(n => nodeMap.set(n.id, n));

      stmt.values.forEach((v: any) => {
        const node = nodeMap.get(v.cbsId);
        if (!node) return;

        // Skip parent nodes if their child nodes have their own progress in stmt.values to avoid double counting
        const hasChildValues = projNodes.some(child => child.parentId === node.id && stmt.values.some((sv: any) => sv.cbsId === child.id));
        if (hasChildValues) {
          return;
        }

        const currProgress = Number(v.currentProgressPercent) || 0;
        const prevProgress = Number(v.previousProgressPercent) || 0;
        const periodProgressPercent = Math.max(0, currProgress - prevProgress);

        let nodeBudget = Number(node.budget) || 0;
        if (nodeBudget === 0 && node.quantity && node.unitPrice) {
          nodeBudget = node.quantity * node.unitPrice;
        }

        let periodAmount = 0;
        if (periodProgressPercent > 0 && nodeBudget > 0) {
          periodAmount = (periodProgressPercent / 100) * nodeBudget;
        } else if (v.currentQuantity && v.currentQuantity > 0 && node.unitPrice) {
          periodAmount = v.currentQuantity * node.unitPrice;
        } else if (currProgress > 0 && nodeBudget > 0 && prevProgress === 0) {
          periodAmount = (currProgress / 100) * nodeBudget;
        }

        if (periodAmount > 0) {
          // Accumulate amount on the node itself and roll up to all its ancestors and root
          let currNode: any = node;
          const visitedNodes = new Set<string>();
          while (currNode && !visitedNodes.has(currNode.id)) {
            visitedNodes.add(currNode.id);
            let cCode = currNode.code ? String(currNode.code).trim() : '';
            if (cCode.length === 1 && !isNaN(Number(cCode))) cCode = '0' + cCode;
            if (cCode) {
              chapterMap.set(cCode, (chapterMap.get(cCode) || 0) + periodAmount);
            }
            if (currNode.parentId && nodeMap.has(currNode.parentId)) {
              currNode = nodeMap.get(currNode.parentId);
            } else if (currNode.code && currNode.code.includes('.')) {
              const pCode = currNode.code.split('.').slice(0, -1).join('.');
              const pNode = projNodes.find((pn: any) => pn.code === pCode);
              currNode = pNode || null;
            } else {
              currNode = null;
            }
          }
        }
      });

      // Fallback to nodes if 0 progress recorded (e.g. initial draft)
      if (chapterMap.size === 0 && projNodes.length > 0) {
        projNodes.forEach(n => {
          let code = n.code ? String(n.code).trim() : '01';
          if (code.length === 1 && !isNaN(Number(code))) code = '0' + code;
          let b = Number(n.budget) || (n.quantity && n.unitPrice ? n.quantity * n.unitPrice : 100000000);
          chapterMap.set(code, b);
        });
      }

      return chapterMap;
    }

    return chapterMap;
  };

  interface CbsItemNode {
    id: string;
    code: string;
    title: string;
    budget: number;
    parentId: string | null;
    children: CbsItemNode[];
  }

  const getProjectCbsTree = (): CbsItemNode[] => {
    let projNodes: any[] = [];
    try {
      const rawNodes = localStorage.getItem('hamyar_cbs_nodes');
      if (rawNodes) {
        const allNodes = JSON.parse(rawNodes);
        projNodes = allNodes.filter((n: any) => n.projectId === selectedProjectId);
      }
    } catch (e) {
      console.error("Error reading hamyar_cbs_nodes", e);
    }

    if (projNodes.length === 0 && selectedProjectId === '2') {
      projNodes = [
        { id: '1', projectId: '2', code: '01', title: 'عملیات خاکی و تسطیح', parentId: null, budget: 1500000000 },
        { id: '1.1', projectId: '2', code: '01.01', title: 'خاکبرداری زمین‌های نرم', parentId: '1', budget: 900000000 },
        { id: '1.2', projectId: '2', code: '01.02', title: 'تسطیح و رگلاژ نهایی', parentId: '1', budget: 600000000 },
        { id: '2', projectId: '2', code: '02', title: 'سازه و بتن‌ریزی', parentId: null, budget: 3500000000 },
        { id: '2.1', projectId: '2', code: '02.01', title: 'آرماتوربندی و قالب‌بندی', parentId: '2', budget: 2000000000 },
        { id: '2.2', projectId: '2', code: '02.02', title: 'بتن‌ریزی فونداسیون و سقف', parentId: '2', budget: 1500000000 },
        { id: '3', projectId: '2', code: '03', title: 'تاسیسات مکانیکی و برقی', parentId: null, budget: 2000000000 },
        { id: '3.1', projectId: '2', code: '03.01', title: 'لوله‌کشی و کانال‌کشی', parentId: '3', budget: 1200000000 },
        { id: '3.2', projectId: '2', code: '03.02', title: 'کابل‌کشی و تابلو برق', parentId: '3', budget: 800000000 }
      ];
    }

    const itemMap = new Map<string, CbsItemNode>();
    const codeMap = new Map<string, CbsItemNode>();

    projNodes.forEach(n => {
      let code = n.code ? String(n.code).trim() : '01';
      if (code.length === 1 && !isNaN(Number(code))) code = '0' + code;
      let b = Number(n.budget) || 0;
      if (b === 0 && n.quantity && n.unitPrice) b = n.quantity * n.unitPrice;

      const node: CbsItemNode = {
        id: String(n.id),
        code,
        title: n.title || `آیتم ${code}`,
        budget: b,
        parentId: n.parentId ? String(n.parentId) : null,
        children: []
      };
      itemMap.set(node.id, node);
      codeMap.set(node.code, node);
    });

    const roots: CbsItemNode[] = [];

    itemMap.forEach(node => {
      if (node.parentId && itemMap.has(node.parentId)) {
        itemMap.get(node.parentId)!.children.push(node);
      } else {
        if (node.code.includes('.')) {
          const pCode = node.code.split('.').slice(0, -1).join('.');
          if (codeMap.has(pCode)) {
            codeMap.get(pCode)!.children.push(node);
            return;
          }
        }
        roots.push(node);
      }
    });

    if (formData.statementId) {
      const stmtMap = getChapterAmounts(formData.statementId);
      stmtMap.forEach((_, code) => {
        if (!codeMap.has(code) && !roots.some(r => r.code === code)) {
          const extraNode: CbsItemNode = {
            id: 'extra_' + code,
            code,
            title: getChapterTitle(code),
            budget: 0,
            parentId: null,
            children: []
          };
          roots.push(extraNode);
        }
      });
    }

    const sortNodes = (nodes: CbsItemNode[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      nodes.forEach(n => sortNodes(n.children));
    };
    sortNodes(roots);

    return roots;
  };

  const getAllChildCodes = (node: CbsItemNode): string[] => {
    let list: string[] = [];
    node.children.forEach(c => {
      list.push(c.code);
      list.push(...getAllChildCodes(c));
    });
    return list;
  };

  const getActiveMainRootCodes = (selectedCodes: string[]): string[] => {
    if (!isCbsMode) {
      return Array.from(new Set(selectedCodes)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    const tree = getProjectCbsTree();
    const activeRoots = new Set<string>();

    tree.forEach(root => {
      const childCodes = getAllChildCodes(root);
      const isSelected = selectedCodes.includes(root.code) || childCodes.some(c => selectedCodes.includes(c));
      if (isSelected) {
        activeRoots.add(root.code);
      }
    });

    // Also include any standalone root codes (e.g. custom root codes that don't have '.')
    selectedCodes.forEach(code => {
      if (!code.includes('.')) {
        let padded = code.length === 1 && !isNaN(Number(code)) ? '0' + code : code;
        activeRoots.add(padded);
      } else {
        const r = code.split('.')[0];
        let padded = r.length === 1 && !isNaN(Number(r)) ? '0' + r : r;
        activeRoots.add(padded);
      }
    });

    return Array.from(activeRoots).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const getTopSelectedSubNodesSum = (
    node: CbsItemNode,
    selectedSet: Set<string>,
    chapterMap: Map<string, number>
  ): number => {
    let sum = 0;
    for (const child of node.children) {
      if (selectedSet.has(child.code)) {
        sum += (chapterMap.get(child.code) || 0);
      } else {
        sum += getTopSelectedSubNodesSum(child, selectedSet, chapterMap);
      }
    }
    return sum;
  };

  const getRootEffectiveAmount = (
    rootCode: string,
    statementId: string,
    selectedCodes?: string[]
  ): number => {
    const chapterMap = getChapterAmounts(statementId);
    if (!isCbsMode) {
      return chapterMap.get(rootCode) || 0;
    }

    const tree = getProjectCbsTree();
    const paddedRoot = rootCode.length === 1 && !isNaN(Number(rootCode)) ? '0' + rootCode : rootCode;
    const rootNode = tree.find(r => r.code === rootCode || r.code === paddedRoot);

    if (!rootNode) {
      return chapterMap.get(rootCode) || chapterMap.get(paddedRoot) || 0;
    }

    const childCodes = getAllChildCodes(rootNode);
    if (childCodes.length === 0) {
      // Single level root node without children
      return chapterMap.get(rootNode.code) || chapterMap.get(rootCode) || 0;
    }

    // Root has children
    if (!selectedCodes || selectedCodes.length === 0) {
      return chapterMap.get(rootNode.code) || 0;
    }

    const selectedSet = new Set(selectedCodes);
    const selectedChildrenCount = childCodes.filter(c => selectedSet.has(c)).length;
    const isRootFullySelected = (selectedSet.has(rootNode.code) && (childCodes.length === 0 || selectedChildrenCount === childCodes.length)) ||
      (childCodes.length > 0 && selectedChildrenCount === childCodes.length);

    if (isRootFullySelected) {
      return chapterMap.get(rootNode.code) || 0;
    }

    // When specific sub-nodes are selected with checkboxes, recursively aggregate their amounts into the main root
    const subSum = getTopSelectedSubNodesSum(rootNode, selectedSet, chapterMap);
    if (subSum > 0 || selectedChildrenCount > 0) {
      return subSum;
    }

    if (selectedSet.has(rootNode.code)) {
      return chapterMap.get(rootNode.code) || 0;
    }

    return 0;
  };

  const updateSelectedRootCodes = (newCodes: string[]) => {
    const sortedCodes = Array.from(new Set(newCodes)).sort();
    const activeMainRootCodes = isCbsMode ? getActiveMainRootCodes(sortedCodes) : sortedCodes;

    setFormData(prev => {
      const newPeriods = (prev.periods || []).map(p => {
        const existingMap = new Map((p.indices || []).map(i => [i.chapterCode, i]));
        const updatedIndices = activeMainRootCodes.map(code => {
          return existingMap.get(code) || { chapterCode: code, baseIndex: 100, performanceIndex: 100 };
        });
        return { ...p, indices: updatedIndices };
      });
      return { ...prev, selectedRootCodes: sortedCodes, periods: newPeriods };
    });
  };

  const toggleRootTreeNode = (root: CbsItemNode) => {
    const selected = formData.selectedRootCodes || [];
    const childCodes = getAllChildCodes(root);

    const isRootSelected = selected.includes(root.code);
    const selectedChildrenCount = childCodes.filter(c => selected.includes(c)).length;
    const isFullySelected = isRootSelected || (childCodes.length > 0 && selectedChildrenCount === childCodes.length);

    let nextCodes: string[];
    if (isFullySelected || selectedChildrenCount > 0) {
      // Deselect root and all its children
      nextCodes = selected.filter(c => c !== root.code && !childCodes.includes(c));
    } else {
      // Select root and all its children
      if (childCodes.length > 0) {
        nextCodes = Array.from(new Set([...selected, root.code, ...childCodes]));
      } else {
        nextCodes = Array.from(new Set([...selected, root.code]));
      }
    }
    updateSelectedRootCodes(nextCodes);
  };

  const toggleSubTreeNode = (sub: CbsItemNode, root: CbsItemNode) => {
    const selected = formData.selectedRootCodes || [];
    const childCodes = getAllChildCodes(root);
    const subChildCodes = getAllChildCodes(sub);
    const allSubBranchCodes = [sub.code, ...subChildCodes];
    const isSubSelected = selected.includes(sub.code);

    let nextCodes = [...selected];

    if (isSubSelected) {
      // Remove sub and its children
      nextCodes = nextCodes.filter(c => !allSubBranchCodes.includes(c));
      // Also remove root code if present
      nextCodes = nextCodes.filter(c => c !== root.code);
    } else {
      // Add sub and its children
      nextCodes = Array.from(new Set([...nextCodes, ...allSubBranchCodes]));
      // Check if all children of root are now selected
      const allSelected = childCodes.every(c => nextCodes.includes(c));
      if (allSelected) {
        nextCodes.push(root.code);
      }
    }
    updateSelectedRootCodes(nextCodes);
  };

  const selectAllSubNodesOfRoot = (root: CbsItemNode) => {
    const selected = (formData.selectedRootCodes || []);
    const childCodes = getAllChildCodes(root);
    const nextCodes = Array.from(new Set([...selected, root.code, ...childCodes]));
    updateSelectedRootCodes(nextCodes);
  };

  const deselectAllSubNodesOfRoot = (root: CbsItemNode) => {
    const childCodes = getAllChildCodes(root);
    const nextCodes = (formData.selectedRootCodes || []).filter(c => c !== root.code && !childCodes.includes(c));
    updateSelectedRootCodes(nextCodes);
  };

  const selectAllRootCodes = () => {
    const tree = getProjectCbsTree();
    const allCodes: string[] = [];
    tree.forEach(r => {
      allCodes.push(r.code);
      allCodes.push(...getAllChildCodes(r));
    });
    updateSelectedRootCodes(allCodes);
  };

  const selectAllNodesAndSubNodes = () => {
    const tree = getProjectCbsTree();
    const allCodes: string[] = [];
    tree.forEach(r => {
      allCodes.push(r.code);
      allCodes.push(...getAllChildCodes(r));
    });
    updateSelectedRootCodes(allCodes);
  };

  const deselectAllRootCodes = () => {
    updateSelectedRootCodes([]);
  };

  const toggleExpandRoot = (rootCode: string) => {
    setExpandedRoots(prev => ({ ...prev, [rootCode]: !prev[rootCode] }));
  };

  const handleAddCustomRootCode = () => {
    if (!customRootInput.trim()) return;
    let code = customRootInput.trim();
    if (code.length === 1 && !isNaN(Number(code))) code = '0' + code;
    const currentCodes = formData.selectedRootCodes || [];
    if (!currentCodes.includes(code)) {
      updateSelectedRootCodes([...currentCodes, code]);
    }
    setCustomRootInput('');
  };

  const getChapterTitle = (code: string) => {
    try {
      const rawNodes = localStorage.getItem('hamyar_cbs_nodes');
      if (rawNodes) {
        const allNodes = JSON.parse(rawNodes);
        const matched = allNodes.find((n: any) => 
          n.projectId === selectedProjectId && 
          (n.code === code || n.code.startsWith(code + '.') || String(n.code).split('.')[0] === code)
        );
        if (matched) return matched.title;
      }
    } catch (e) {}

    const padded = code.length === 1 && !isNaN(Number(code)) ? '0' + code : code;

    try {
      const rawEstimates = localStorage.getItem('hamyar_estimates');
      const rawStatements = localStorage.getItem('hamyar_statements');
      
      let items: any[] = [];
      if (rawEstimates) {
        const ests = JSON.parse(rawEstimates);
        items = items.concat(ests.filter((e: any) => e.projectId === selectedProjectId && e.code && e.code.substring(0, 2) === padded));
      }
      if (rawStatements) {
        const stmts = JSON.parse(rawStatements);
        const projStmts = stmts.filter((s: any) => s.projectId === selectedProjectId);
        projStmts.forEach((s: any) => {
          if (s.items) {
            items = items.concat(s.items.filter((it: any) => it.code && it.code.substring(0, 2) === padded));
          }
        });
      }
      
      if (items.length > 0) {
        const combinedDesc = items
          .map((it) => (it.desc || it.description || it.title || "").toLowerCase())
          .join(" ");

        const hasConcrete = 
          combinedDesc.includes("بتن") || 
          combinedDesc.includes("درجا") || 
          combinedDesc.includes("بتن ریزی") || 
          combinedDesc.includes("بتن‌ریزی") || 
          combinedDesc.includes("عیار") || 
          combinedDesc.includes("مگر");
          
        const hasPrecastOrBlock = 
          combinedDesc.includes("پیش ساخته") || 
          combinedDesc.includes("پیش‌ساخته") || 
          combinedDesc.includes("بلوک") || 
          combinedDesc.includes("بلوک‌چینی") || 
          combinedDesc.includes("بلوک چینی");

        if (padded === "08" || padded === "07" || padded === "12" || padded === "10") {
          if (hasConcrete && !hasPrecastOrBlock) {
            return "کارهای بتنی درجا";
          }
          if (hasPrecastOrBlock) {
            return "بتن پیش‌ساخته و بلوک‌چینی";
          }
        }
      }
    } catch (e) {}

    // Fallback for standard Fahrest Baha chapters when no CBS node is found
    const standardChapters: { [code: string]: string } = {
      "01": "عملیات تخریب",
      "02": "عملیات خاکی با دست",
      "03": "عملیات خاکی با ماشین",
      "04": "عملیات بنایی با سنگ",
      "05": "قالب‌بندی و چوب‌بست",
      "06": "کارهای فولادی با میلگرد",
      "07": "کارهای بتنی درجا",
      "08": "بتن پیش‌ساخته و بلوک‌چینی",
      "09": "کارهای فولادی سنگین",
      "10": "سقف سبک بتنی",
      "11": "آجرکاری و شفته‌ریزی",
      "12": "بتن سبک و بتن مگر",
      "13": "عایق‌کاری رطوبتی",
      "14": "عایق‌کاری حرارتی و صوتی",
      "15": "کارهای دست، ابزار و یراق",
      "16": "کارهای فلزی سبک",
      "17": "کارهای آلومینیومی",
      "18": "کارهای چوبی",
      "19": "کارهای پلاستیکی و پلیمری",
      "20": "شیشه‌بری و نصب شیشه",
      "21": "رنگ‌آمیزی",
      "22": "کارهای آسفالتی",
      "23": "درزگیری و بندکشی",
      "24": "کاشی و سرامیک‌کاری",
      "25": "موزاییک‌کاری",
      "26": "سنگ‌کاری با سنگ پلاک",
      "27": "کارهای سنگی با سنگ لاشه",
      "28": "برچسب و پوشش‌های دیواری",
      "29": "کارهای راه‌سازی",
      "30": "کارهای متفرقه"
    };

    if (standardChapters[padded]) {
      return standardChapters[padded];
    }

    return `فصل / ریشه ${code}`;
  };

  const calculateChapterAdjustmentValue = (amount: number, baseIdx: number, perfIdx: number, ratio: number, coeff: number) => {
    if (!baseIdx || baseIdx === 0) return 0;
    return amount * ((perfIdx / baseIdx) - 1) * ratio * coeff;
  };

  const calculateRecordTotal = (record: Partial<AdjustmentRecord>) => {
    if (!record.statementId) return 0;
    const coeff = record.coefficient || 0.95;
    let total = 0;

    const totalDays = record.totalDays || 1;
    const selectedCodes = record.selectedRootCodes;

    record.periods?.forEach(period => {
      const ratio = period.days / totalDays;
      period.indices.forEach(idx => {
        if (selectedCodes && selectedCodes.length > 0 && !selectedCodes.includes(idx.chapterCode)) {
          if (!isCbsMode) return;
          // In CBS mode, check if any child of this root was selected
          const tree = getProjectCbsTree();
          const rNode = tree.find(r => r.code === idx.chapterCode);
          if (rNode) {
            const childCodes = getAllChildCodes(rNode);
            const hasSelectedChild = childCodes.some(c => selectedCodes.includes(c));
            if (!hasSelectedChild) return;
          } else {
            return;
          }
        }
        const amount = getRootEffectiveAmount(idx.chapterCode, record.statementId!, selectedCodes);
        total += calculateChapterAdjustmentValue(amount, idx.baseIndex, idx.performanceIndex, ratio, coeff);
      });
    });
    return Math.round(total);
  };

  const { totalApprovedAdjustment, totalPendingAdjustment } = useMemo(() => {
    let approved = 0;
    let pending = 0;

    projectAdjustments.forEach(adj => {
      const val = calculateRecordTotal(adj);
      const status = WorkflowService.getStatus(adj);
      const isApproved =
        status === WorkflowStatus.APPROVED_INTERNAL ||
        status === WorkflowStatus.APPROVED_BY_CONSULTANT ||
        status === ("APPROVED" as any) ||
        (adj as any)?.isFinalFrozen;

      if (isApproved) {
        approved += val;
      } else {
        pending += val;
      }
    });

    return { totalApprovedAdjustment: approved, totalPendingAdjustment: pending };
  }, [projectAdjustments, allCombinedStatements, metres]);

  const handleOpenModal = (record?: AdjustmentRecord) => {
    if (record) {
      setEditingId(record.id);
      let rootCodes = record.selectedRootCodes;
      if (!rootCodes || rootCodes.length === 0) {
        rootCodes = record.periods[0]?.indices.map(i => i.chapterCode) || [];
      }
      
      let periods = record.periods;
      if (isCbsMode && periods) {
        const activeMainRoots = getActiveMainRootCodes(rootCodes);
        periods = periods.map(p => {
          const existingMap = new Map((p.indices || []).map(i => [i.chapterCode, i]));
          const updatedIndices = activeMainRoots.map(code => {
            return existingMap.get(code) || { chapterCode: code, baseIndex: 100, performanceIndex: 100 };
          });
          return { ...p, indices: updatedIndices };
        });
      }

      setFormData({ ...record, selectedRootCodes: rootCodes, periods });
    } else {
      setEditingId(null);
      setFormData({
        id: Math.random().toString(36).substr(2, 9),
        projectId: selectedProjectId,
        date: new Date().toLocaleDateString('fa-IR'),
        number: (projectAdjustments.length + 1).toString().padStart(2, '0'),
        coefficient: 0.95,
        isMultiPeriod: false,
        totalDays: 30,
        periods: [{ id: 'p1', title: 'دوره اول', days: 30, indices: [] }],
        selectedRootCodes: [],
        status: WorkflowStatus.DRAFT,
        workflowHistory: [],
        createdById: currentUser?.id,
        ownerOrgId: currentUser?.orgId,
        currentOrgId: currentUser?.orgId
      });
    }
    setIsModalOpen(true);
  };

  const handleStatementChange = (stmtId: string) => {
    const stmt = allCombinedStatements.find(s => s.id === stmtId);
    const stmtIsCbs = isCbsContract || stmt?.type === 'CBS' || !!(stmt?.values && Array.isArray(stmt.values));

    const chapterMap = getChapterAmounts(stmtId);
    let detectedCodes = Array.from(chapterMap.keys()).sort();
    
    if (stmtIsCbs) {
      const tree = getProjectCbsTree();
      const allSelectedCodes: string[] = [];
      tree.forEach(r => {
        allSelectedCodes.push(r.code);
        allSelectedCodes.push(...getAllChildCodes(r));
      });
      if (allSelectedCodes.length === 0) {
        allSelectedCodes.push(...detectedCodes);
      }
      const activeMainRootCodes = getActiveMainRootCodes(allSelectedCodes);

      setFormData(prev => {
        const newPeriods = (prev.periods || [{ id: 'p1', title: 'دوره اول', days: prev.totalDays || 30, indices: [] }]).map(p => ({
          ...p,
          indices: activeMainRootCodes.map(code => ({ chapterCode: code, baseIndex: 100, performanceIndex: 100 }))
        }));
        return { ...prev, statementId: stmtId, selectedRootCodes: allSelectedCodes, periods: newPeriods };
      });
    } else {
      // Unit Price List contract (قرارداد های فهرست بهایی):
      // Only standard chapters from the statement/metres/estimates
      let activeCodes = detectedCodes;
      if (activeCodes.length === 0) {
        try {
          const rawEstimates = localStorage.getItem('hamyar_estimates');
          if (rawEstimates) {
            const ests = JSON.parse(rawEstimates).filter((e: any) => e.projectId === selectedProjectId);
            const estChapters = new Set<string>();
            ests.forEach((e: any) => {
              if (e.code) {
                const ch = e.code.substring(0, 2);
                if (ch) estChapters.add(ch);
              }
            });
            activeCodes = Array.from(estChapters).sort();
          }
        } catch (e) {}
      }

      if (activeCodes.length === 0) {
        activeCodes = ['01', '02', '03', '07'];
      }

      setFormData(prev => {
        const newPeriods = (prev.periods || [{ id: 'p1', title: 'دوره اول', days: prev.totalDays || 30, indices: [] }]).map(p => ({
          ...p,
          indices: activeCodes.map(code => ({ chapterCode: code, baseIndex: 100, performanceIndex: 100 }))
        }));
        return { ...prev, statementId: stmtId, selectedRootCodes: activeCodes, periods: newPeriods };
      });
    }
  };

  const addPeriod = () => {
    let activeCodes: string[] = [];
    if (isCbsMode) {
      activeCodes = getActiveMainRootCodes(formData.selectedRootCodes || []);
      if (activeCodes.length === 0) {
        const tree = getProjectCbsTree();
        activeCodes = tree.map(r => r.code);
      }
    } else {
      activeCodes = formData.selectedRootCodes && formData.selectedRootCodes.length > 0
        ? formData.selectedRootCodes
        : (formData.statementId ? Array.from(getChapterAmounts(formData.statementId).keys()).sort() : []);
    }
      
    const newPeriod: AdjustmentPeriod = {
      id: Math.random().toString(36).substr(2, 9),
      title: `دوره جدید`,
      days: 0,
      indices: activeCodes.map(code => ({ chapterCode: code, baseIndex: 100, performanceIndex: 100 }))
    };
    setFormData(prev => ({ ...prev, periods: [...(prev.periods || []), newPeriod] }));
  };

  const removePeriod = (id: string) => {
    setFormData(prev => ({ ...prev, periods: prev.periods?.filter(p => p.id !== id) }));
  };

  const updatePeriodField = (pId: string, field: keyof AdjustmentPeriod, value: any) => {
    setFormData(prev => ({
      ...prev,
      periods: prev.periods?.map(p => p.id === pId ? { ...p, [field]: value } : p)
    }));
  };

  const updateIndexField = (pId: string, chapterCode: string, field: keyof ChapterPeriodIndex, value: any) => {
    setFormData(prev => ({
      ...prev,
      periods: prev.periods?.map(p => {
        if (p.id === pId) {
          return {
            ...p,
            indices: p.indices.map(idx => idx.chapterCode === chapterCode ? { ...idx, [field]: value } : idx)
          };
        }
        return p;
      })
    }));
  };

  const getDifferenceMessage = (oldVal: any, newVal: any): string => {
    const changes: string[] = [];
    if (oldVal.number !== newVal.number) {
      changes.push(`شماره: از "${oldVal.number || 'خالی'}" به "${newVal.number || 'خالی'}"`);
    }
    if (oldVal.date !== newVal.date) {
      changes.push(`تاریخ: از "${oldVal.date || 'خالی'}" به "${newVal.date || 'خالی'}"`);
    }
    if (oldVal.description !== newVal.description) {
      changes.push(`توضیحات: از "${oldVal.description || 'خالی'}" به "${newVal.description || 'خالی'}"`);
    }
    if (Number(oldVal.coefficient) !== Number(newVal.coefficient)) {
      changes.push(`ضریب تعدیل: از ${oldVal.coefficient || 0} به ${newVal.coefficient || 0}`);
    }
    return changes.length > 0 ? changes.join(" | ") : "";
  };

  const handleSave = () => {
    if (!formData.statementId) return alert("لطفا صورت‌وضعیت را انتخاب کنید.");
    const record = { ...formData } as AdjustmentRecord;
    if (editingId) {
      const oldRecord = adjustments.find(a => a.id === editingId);
      if (oldRecord) {
        const changes = getDifferenceMessage(oldRecord, record);
        if (changes) {
          const authorOrg = SystemAdminService.getOrganization(currentUser.orgId);
          const editEvent = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            action: 'EDIT' as WorkflowAction,
            fromStatus: oldRecord.status || WorkflowStatus.DRAFT,
            toStatus: record.status || WorkflowStatus.DRAFT,
            actorUserId: currentUser?.id || "",
            actorName: currentUser
              ? formatUserDisplayFormal(currentUser, authorOrg)
              : "کاربر",
            comment: changes,
          };
          record.workflowHistory = [
            ...(oldRecord.workflowHistory || []),
            editEvent
          ];
        }
      }
      setAdjustments(adjustments.map(a => a.id === editingId ? record : a));
    } else {
      setAdjustments([record, ...adjustments]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (itemToDelete) {
      setAdjustments(adjustments.filter(a => a.id !== itemToDelete));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const toggleMultiPeriod = () => {
    setFormData(prev => {
      const isNowMulti = !prev.isMultiPeriod;
      let newPeriods = [...(prev.periods || [])];
      
      if (isNowMulti && newPeriods.length < 2) {
        // Automatically add a second period if switching to multi
        const stmtId = prev.statementId;
        const codes = stmtId ? Array.from(getChapterAmounts(stmtId).keys()).sort() : [];
        newPeriods.push({
          id: Math.random().toString(36).substr(2, 9),
          title: 'دوره دوم',
          days: 0,
          indices: codes.map(code => ({ chapterCode: code, baseIndex: 100, performanceIndex: 100 }))
        });
      } else if (!isNowMulti) {
        // If switching back to single, keep only the first
        newPeriods = [newPeriods[0]];
        newPeriods[0].days = prev.totalDays || 30;
      }
      
      return { ...prev, isMultiPeriod: isNowMulti, periods: newPeriods };
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-[#e5ded0] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-amber-500/20">
            <TrendingUp size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black text-stone-800">تعدیل آحاد بها</h3>
            <p className="text-xs text-stone-500 font-bold mt-1">مدیریت شاخص‌ها و محاسبات ما‌به‌التفاوت قیمت</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handlePrintOfficial('adjustment', null)} className="flex items-center gap-2 bg-stone-100 text-stone-600 px-6 py-3 rounded-2xl font-bold hover:bg-stone-200 transition-all" title="چاپ رسمی کل محاسبات تعدیل فعال">
            <Printer size={18}/> چاپ رسمی کل
          </button>
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-stone-900 transition-all shadow-lg shadow-amber-500/20 active:scale-95">
            <Plus size={20}/> محاسبه تعدیل جدید
          </button>
        </div>
      </div>

      {/* Summary KPI Cards for Approved and In-Review Adjustment Amounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-white p-6 rounded-3xl border border-emerald-200/80 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
              <CheckCircle size={16} className="text-emerald-600" />
              مبلغ کل تعدیل تایید شده
            </span>
            <div className="text-2xl font-black text-emerald-950 flex items-baseline gap-1 mt-1">
              <span>{totalApprovedAdjustment.toLocaleString('fa-IR')}</span>
              <span className="text-xs font-bold text-emerald-700">ریال</span>
            </div>
            <p className="text-[11px] font-bold text-emerald-600/80">صورت‌وضعیت‌های تعدیل دارای تایید نهایی</p>
          </div>
          <div className="w-14 h-14 bg-emerald-600/10 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200/50 shadow-inner group-hover:scale-105 transition-transform">
            <CheckCircle size={28} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-6 rounded-3xl border border-amber-200/80 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
          <div className="space-y-1">
            <span className="text-xs font-black text-amber-800 flex items-center gap-1.5">
              <Clock size={16} className="text-amber-600" />
              مبلغ کل تعدیل در دست بررسی
            </span>
            <div className="text-2xl font-black text-amber-950 flex items-baseline gap-1 mt-1">
              <span>{totalPendingAdjustment.toLocaleString('fa-IR')}</span>
              <span className="text-xs font-bold text-amber-700">ریال</span>
            </div>
            <p className="text-[11px] font-bold text-amber-600/80">صورت‌وضعیت‌های تعدیل پیش‌نویس و در جریان بررسی</p>
          </div>
          <div className="w-14 h-14 bg-amber-600/10 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-200/50 shadow-inner group-hover:scale-105 transition-transform">
            <Clock size={28} />
          </div>
        </div>
      </div>

      {(currentProject?.contractType === "CBS" || currentProject?.contractType === "LUMP_SUM" || currentProject?.contractType === "COST_PLUS") && (
        <div className="bg-stone-50/80 border border-indigo-200/80 rounded-[2rem] p-6 text-right text-indigo-900 shadow-sm flex flex-col md:flex-row items-start gap-4 animate-fadeIn">
          <div className="p-3 bg-amber-600 text-white rounded-xl shadow-md mt-1">
            <Info size={24} />
          </div>
          <div className="space-y-2 flex-1">
            <h4 className="font-black text-sm">
              💡 نحوه تعدیل در قراردادهای {currentProject?.contractType === 'CBS' ? 'ساختار شکست هزینه (CBS)' : currentProject?.contractType === 'LUMP_SUM' ? 'سرجمع (Lump Sum)' : 'مدیریت پیمان (Cost-Plus)'}:
            </h4>
            <p className="text-xs font-bold leading-relaxed text-amber-700">
              {currentProject?.contractType === 'CBS' || currentProject?.contractType === 'LUMP_SUM' ? (
                `در قراردادهای سرجمع و ساختار شکست فیزیکی (${currentProject?.contractType === 'CBS' ? 'CBS' : 'WBS'})، بر اساس بخشنامه سازمان برنامه و بودجه کشور، تعدیل آحاد بها معمولاً شامل شاخص‌های عمومی کارکرد بوده یا غیرقابل تعدیل می‌باشد. سیستم به صورت خودکار فعالیت‌های کلان را به عنوان فصول مبنای محاسبه شاخص در نظر گرفته و برآورد ما‌به‌التفاوت قیمت را انجام می‌دهد.`
              ) : (
                `در قراردادهای مدیریت پیمان (Cost-Plus)، تعدیل بهای مصالح و کارمزد مدیریت پیمانکار بر اساس فاکتورهای تایید شده خرید واقعی و توافق‌نامه‌های نرخ روز انجام می‌شود. پلتفرم به صورت خودکار هزینه‌های واقعی خرید را مبنای کار قرار می‌دهد.`
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {projectAdjustments.length === 0 ? (
          <div className="bg-white p-24 rounded-[3.5rem] border-2 border-dashed border-[#e5ded0] text-center text-stone-400">
             <Calculator size={64} className="mx-auto mb-6 opacity-20"/>
             <p className="font-black text-xl">سوابق تعدیل یافت نشد</p>
          </div>
        ) : (
          projectAdjustments.map(adj => (
            <div key={adj.id} className="bg-white p-8 rounded-[3rem] border border-[#e5ded0] shadow-sm hover:shadow-xl hover:border-blue-200 transition-all flex flex-col xl:flex-row justify-between items-center gap-8 group">
               <div className="flex items-center gap-6 flex-1">
                  <div className="w-16 h-16 bg-[#faf8f4] text-stone-400 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-inner group-hover:bg-amber-600 group-hover:text-white transition-all duration-500">
                    {adj.number}
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-black text-lg text-stone-800">تعدیل صورت‌وضعیت {projectStatements.find(s => s.id === adj.statementId)?.number || 'نامشخص'}</h4>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-[10px] font-bold text-stone-400 flex items-center gap-1.5"><Calendar size={14}/> {adj.date}</span>
                      <span className="text-[10px] font-bold text-amber-600 bg-stone-50 px-3 py-1 rounded-xl border border-blue-100">ضریب: {adj.coefficient}</span>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-100">{adj.isMultiPeriod ? `چنددوره‌ای (${adj.periods.length} دوره)` : 'تک‌دوره‌ای'}</span>
                      <span className={`px-3 py-1 rounded-xl font-black text-[10px] border shadow-sm ${
                        WorkflowService.getStatus(adj) === WorkflowStatus.APPROVED_INTERNAL || WorkflowService.getStatus(adj) === WorkflowStatus.APPROVED_BY_CONSULTANT ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        WorkflowService.getStatus(adj) === WorkflowStatus.REJECTED ? 'bg-red-50 text-red-600 border-red-100' :
                        WorkflowService.getStatus(adj) === WorkflowStatus.IN_REVIEW ? 'bg-stone-50 text-amber-600 border-blue-100' :
                        'bg-[#faf8f4] text-stone-500 border-[#ece5d8]'
                      }`}>
                        {WorkflowService.getStatus(adj) === WorkflowStatus.APPROVED_INTERNAL || WorkflowService.getStatus(adj) === WorkflowStatus.APPROVED_BY_CONSULTANT ? 'تایید نهایی' :
                         WorkflowService.getStatus(adj) === WorkflowStatus.REJECTED ? 'رد شده' :
                         WorkflowService.getStatus(adj) === WorkflowStatus.IN_REVIEW ? 'در جریان' : 'پیش‌نویس'}
                      </span>
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-12 w-full xl:w-auto border-t xl:border-t-0 xl:border-r border-[#ece5d8] pt-6 xl:pt-0 xl:pr-12">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">خالص تعدیل دوره (ریال)</p>
                    <p className="text-2xl font-black text-stone-900 tracking-tighter">{calculateRecordTotal(adj).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentUser && WorkflowService.getAvailableActions(adj, currentUser, SystemAdminService.getOrganization(currentUser.orgId)?.type).length > 0 && (
                      <div className="flex gap-1 ml-2">
                        {WorkflowService.getAvailableActions(adj, currentUser, SystemAdminService.getOrganization(currentUser.orgId)?.type).map(action => (
                          <button 
                            key={action}
                            onClick={() => openWorkflowModal(adj, action)}
                            className={`p-1.5 rounded-lg text-[9px] font-bold transition-all ${
                              action === 'APPROVE' || action === 'FINAL_APPROVE' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                              action === 'REJECT' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                              action === 'SEND_TO_CONSULTANT' ? 'bg-stone-100 text-amber-700 hover:bg-indigo-200' :
                              action === 'SEND_TO_EMPLOYER' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                              action === 'RETURN_TO_CONTRACTOR' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' :
                              action === 'RETURN_TO_CONSULTANT' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' :
                              action === 'UNFREEZE_BY_VARIATION' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                              'bg-blue-100 text-stone-900 hover:bg-blue-200'
                            }`}
                          >
                            {WorkflowService.getActionLabel(action, SystemAdminService.getOrganization(currentUser.orgId)?.type, currentUser.id, true)}
                          </button>
                        ))}
                      </div>
                    )}
                    <button onClick={() => handlePrintOfficial('adjustment', adj)} className="p-4 text-stone-400 hover:text-amber-600 hover:bg-stone-50 rounded-2xl transition-all shadow-sm hover:shadow-md" title="چاپ برگ محاسبات تعدیل"><Printer size={20}/></button>
                    <button onClick={() => onOpenHistory(adj)} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all" title="تاریخچه"><ScrollText size={16}/></button>
                    {WorkflowService.canEdit(adj, currentUser) && (
                      <button onClick={() => handleOpenModal(adj)} className="p-4 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all shadow-sm hover:shadow-md" title="ویرایش محاسبات"><Edit3 size={20}/></button>
                    )}
                    {WorkflowService.canDelete(adj, currentUser) && (
                      <button onClick={() => { setItemToDelete(adj.id); setIsDeleteModalOpen(true); }} className="p-4 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm hover:shadow-md" title="حذف تعدیل"><Trash2 size={20}/></button>
                    )}
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xl animate-fadeIn">
          <div className="bg-white w-full max-w-5xl rounded-[4rem] shadow-2xl flex flex-col max-h-[95vh] border border-white/20">
            <div className="p-10 border-b border-[#ece5d8] flex justify-between items-center bg-stone-900 text-white rounded-t-[4rem]">
              <div className="flex items-center gap-6 text-right">
                 <div className="w-16 h-16 bg-amber-600 rounded-[1.8rem] flex items-center justify-center shadow-2xl shadow-amber-500/30"><Calculator size={32}/></div>
                 <div><h3 className="text-2xl font-black tracking-tight">{editingId ? 'ویرایش محاسبات تعدیل' : 'ثبت و محاسبه تعدیل جدید'}</h3><p className="text-xs opacity-60 font-bold mt-1">پروژه: {currentProject?.title}</p></div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all"><X size={28}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-[#faf8f4]/50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-stone-400 mr-2">انتخاب صورت‌وضعیت (فقط صورت‌وضعیت‌های قطعی شده)</label>
                  <select value={formData.statementId || ''} onChange={e => handleStatementChange(e.target.value)} className="w-full p-5 bg-white border border-[#e5ded0] rounded-[1.5rem] font-black text-sm outline-none">
                    <option value="">{projectStatements.length === 0 ? 'هیچ صورت‌وضعیت قطعی شده‌ای یافت نشد' : 'انتخاب کنید...'}</option>
                    {projectStatements.map(s => (
                      <option key={s.id} value={s.id}>
                        صورت‌وضعیت {s.number} {(s.values || s.type === 'CBS') ? '(شکست کار CBS)' : '(فهرست بهایی)'} - {s.date || s.startDate || ''} (قطعی شده)
                      </option>
                    ))}
                  </select>
                  {projectStatements.length === 0 && (
                    <p className="text-[10px] text-amber-600 font-bold mr-1">
                      توجه: تنها صورت‌وضعیت‌هایی که فرآیند بررسی آن‌ها تکمیل و قطعی شده‌اند (قفل شده) برای محاسبه تعدیل قابل انتخاب هستند.
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-stone-400 mr-2">تاریخ تنظیم</label>
                  <ShamsiDatePicker
                    value={formData.date || ''}
                    onChange={val => setFormData({ ...formData, date: val })}
                    placeholder="1403/--/--"
                    inputClassName="!p-5 !bg-white !border-[#e5ded0] !rounded-[1.5rem] !font-black !text-sm !text-center"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-stone-400 mr-2">ضریب (معمولاً ۰.۹۵)</label>
                  <input type="number" step="0.01" value={formData.coefficient || ''} onChange={e => setFormData({...formData, coefficient: Number(e.target.value)})} className="w-full p-5 bg-white border border-[#e5ded0] rounded-[1.5rem] font-black text-sm text-center outline-none"/>
                </div>
                <div className="space-y-3">
                   <label className="text-[11px] font-black text-stone-400 mr-2">تعداد کل روزها</label>
                   <input type="number" value={formData.totalDays || ''} onChange={e => setFormData({...formData, totalDays: Number(e.target.value)})} className="w-full p-5 bg-white border border-[#e5ded0] rounded-[1.5rem] font-black text-sm text-center outline-none"/>
                </div>
              </div>

              {/* Enhanced Toggle for Multi-period */}
              <div className="bg-white p-8 rounded-3xl border border-[#e5ded0] shadow-sm flex items-center justify-between transition-all hover:border-blue-300">
                 <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl transition-all ${formData.isMultiPeriod ? 'bg-stone-50 text-amber-600' : 'bg-[#faf8f4] text-stone-400'}`}>
                      <Clock size={28}/>
                    </div>
                    <div>
                       <h4 className="font-black text-stone-800 text-lg">محاسبه چنددوره‌ای تعدیل</h4>
                       <p className="text-[10px] text-stone-400 font-bold mt-1">در صورتی که صورت‌وضعیت با بیش از یک دوره شاخص تلاقی دارد، این گزینه را فعال کنید.</p>
                    </div>
                 </div>
                 <button 
                   type="button" 
                   onClick={toggleMultiPeriod} 
                   className={`w-24 h-11 rounded-full transition-all relative shadow-inner ${formData.isMultiPeriod ? 'bg-amber-600' : 'bg-stone-200'}`}
                 >
                    <div className={`absolute top-1 w-9 h-9 bg-white rounded-full shadow-lg transition-all transform ${formData.isMultiPeriod ? 'transtone-x-12' : 'transtone-x-1'}`}></div>
                    <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black transition-opacity ${formData.isMultiPeriod ? 'pr-8 text-white' : 'pl-8 text-stone-400'}`}>
                      {formData.isMultiPeriod ? 'فعال' : 'غیرفعال'}
                    </span>
                 </button>
              </div>

              {/* CBS Manual Roots and Sub-nodes Selection - ONLY for CBS / WBS contracts */}
              {isCbsMode && formData.statementId && (
                <div className="bg-white p-6 rounded-3xl border border-[#e5ded0] shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-3">
                    <div>
                      <h4 className="font-black text-stone-800 text-base flex items-center gap-2">
                        <Sliders size={20} className="text-amber-600" />
                        انتخاب دستی ریشه‌های اصلی و زیرمجموعه‌های CBS / ساختار شکست برای این صورت‌وضعیت
                      </h4>
                      <p className="text-xs text-stone-400 font-bold mt-1">
                        ریشه‌ها یا زیرمجموعه‌های ساختار شکست که قصد دارید شاخص تعدیل برای آن‌ها در این صورت‌وضعیت محاسبه شود را انتخاب کنید:
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={selectAllRootCodes}
                        className="px-3 py-2 bg-emerald-50 text-emerald-700 text-xs font-black rounded-xl hover:bg-emerald-100 transition-all border border-emerald-200"
                      >
                        انتخاب همه ریشه‌ها
                      </button>
                      <button
                        type="button"
                        onClick={selectAllNodesAndSubNodes}
                        className="px-3 py-2 bg-amber-50 text-amber-800 text-xs font-black rounded-xl hover:bg-amber-100 transition-all border border-amber-200"
                      >
                        انتخاب تمام زیرمجموعه‌ها
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllRootCodes}
                        className="px-3 py-2 bg-stone-100 text-stone-600 text-xs font-black rounded-xl hover:bg-stone-200 transition-all border border-stone-200"
                      >
                        لغو همه
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 pt-1">
                    {getProjectCbsTree().map((root) => {
                      const selected = formData.selectedRootCodes || [];
                      const childCodes = getAllChildCodes(root);
                      const isRootSelected = selected.includes(root.code);
                      const selectedChildrenCount = childCodes.filter(c => selected.includes(c)).length;
                      const isFull = isRootSelected || (childCodes.length > 0 && selectedChildrenCount === childCodes.length);
                      const isPartial = !isFull && selectedChildrenCount > 0;
                      const isExpanded = !!expandedRoots[root.code];

                      const stmtAmount = getChapterAmounts(formData.statementId!).get(root.code) || 0;

                      return (
                        <div
                          key={root.code}
                          className={`rounded-2xl border transition-all select-none overflow-hidden ${
                            isFull
                              ? 'bg-amber-50/70 border-amber-400 shadow-sm'
                              : isPartial
                              ? 'bg-amber-50/30 border-amber-300 shadow-xs'
                              : 'bg-stone-50/50 border-stone-200 opacity-75 hover:opacity-100'
                          }`}
                        >
                          {/* Main Card Header */}
                          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div
                              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                              onClick={() => toggleRootTreeNode(root)}
                            >
                              <input
                                type="checkbox"
                                checked={isFull}
                                ref={el => { if (el) el.indeterminate = isPartial; }}
                                onChange={() => {}}
                                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 accent-amber-600 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-xs text-amber-800 bg-white px-2 py-0.5 rounded-lg border border-amber-200 shadow-xs">
                                    ریشه {root.code}
                                  </span>
                                  <span className="font-black text-sm text-stone-800" title={root.title}>
                                    {root.title}
                                  </span>
                                  {isFull && (
                                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                      انتخاب کامل
                                    </span>
                                  )}
                                  {isPartial && (
                                    <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                                      {selectedChildrenCount} از {childCodes.length} زیرمجموعه
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-bold text-stone-500 mt-1 flex items-center gap-3 flex-wrap">
                                  <span>
                                    کارکرد کل در صورت‌وضعیت: <span className="text-stone-700 font-black">{Math.round(stmtAmount).toLocaleString('fa-IR')} ریال</span>
                                  </span>
                                  {isPartial && (
                                    <span className="text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md font-black">
                                      مبلغ تجمیعی منتخب: {Math.round(getRootEffectiveAmount(root.code, formData.statementId!, selected)).toLocaleString('fa-IR')} ریال
                                    </span>
                                  )}
                                  {root.children.length > 0 && (
                                    <span className="text-stone-400">({root.children.length} زیرمجموعه مستقیم)</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Expand / Sub-nodes toggle button */}
                            {root.children.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleExpandRoot(root.code)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all self-start sm:self-auto ${
                                  isExpanded
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                                }`}
                              >
                                <Layers size={14} />
                                <span>{isExpanded ? 'پنهان کردن زیرمجموعه‌ها' : `مشاهده زیرمجموعه‌ها (${childCodes.length})`}</span>
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            )}
                          </div>

                          {/* Sub-nodes Panel */}
                          {root.children.length > 0 && isExpanded && (
                            <div className="bg-amber-50/40 border-t border-amber-200/60 p-4 space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-amber-200/40">
                                <div className="text-xs font-black text-stone-700 flex items-center gap-1.5">
                                  <Layers size={14} className="text-amber-600" />
                                  زیرمجموعه‌ها و شکست‌کارهای کد {root.code}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => selectAllSubNodesOfRoot(root)}
                                    className="text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-all"
                                  >
                                    انتخاب همه زیرمجموعه‌های {root.code}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deselectAllSubNodesOfRoot(root)}
                                    className="text-[11px] font-black text-stone-600 bg-white hover:bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-lg transition-all"
                                  >
                                    لغو زیرمجموعه‌های {root.code}
                                  </button>
                                </div>
                              </div>

                              {/* Nested Sub-nodes */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                                {root.children.map(child => {
                                  const isSubSel = selected.includes(child.code);
                                  const subAmount = getChapterAmounts(formData.statementId!).get(child.code) || 0;

                                  return (
                                    <div
                                      key={child.code}
                                      onClick={() => toggleSubTreeNode(child, root)}
                                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                                        isSubSel
                                          ? 'bg-white border-amber-400 shadow-sm text-stone-800'
                                          : 'bg-stone-50/60 border-stone-200 text-stone-500 hover:bg-white hover:text-stone-700'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSubSel}
                                        onChange={() => {}}
                                        className="mt-1 w-3.5 h-3.5 text-amber-600 rounded focus:ring-amber-500 accent-amber-600 cursor-pointer"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-black text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                            کد {child.code}
                                          </span>
                                          <span className="font-black text-xs truncate" title={child.title}>
                                            {child.title}
                                          </span>
                                        </div>
                                        <div className="text-[10px] font-bold text-stone-500 mt-1">
                                          کارکرد: {Math.round(subAmount).toLocaleString('fa-IR')} ریال
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center gap-3">
                    <span className="text-xs font-black text-stone-500">افزودن دستی کد ریشه/زیرمجموعه:</span>
                    <input
                      type="text"
                      placeholder="مثلاً 01.01 یا 04"
                      value={customRootInput}
                      onChange={(e) => setCustomRootInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomRootCode();
                        }
                      }}
                      className="p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black w-36 outline-none focus:border-amber-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomRootCode}
                      className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-black hover:bg-black transition-all flex items-center gap-1"
                    >
                      <Plus size={14} /> افزودن
                    </button>
                  </div>
                </div>
              )}

              {formData.statementId && (
                <div className="space-y-12">
                  <div className="flex items-center justify-between border-b border-[#ece5d8] pb-4">
                    <h4 className="font-black text-stone-800 flex items-center gap-3">
                      <Sigma size={22} className="text-amber-500"/> 
                      {isCbsMode ? 'مدیریت شاخص‌ها و محاسبات لحظه‌ای (ریشه‌های اصلی CBS)' : 'مدیریت شاخص‌ها و محاسبات لحظه‌ای (فصول فهرست بها)'}
                    </h4>
                    {formData.isMultiPeriod && (
                      <button type="button" onClick={addPeriod} className="flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-black transition-all shadow-lg active:scale-95">
                        <PlusCircle size={16}/> افزودن دوره جدید
                      </button>
                    )}
                  </div>
                  <div className="space-y-10">
                    {formData.periods?.map((period, pIdx) => (
                      <div key={period.id} className="bg-white p-8 rounded-[3.5rem] border border-[#e5ded0] shadow-xl space-y-8 relative overflow-hidden group/period">
                         <div className="absolute top-0 right-0 w-2 h-full bg-amber-500 opacity-20 group-hover/period:opacity-100 transition-opacity"></div>
                         
                         <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-stone-50 pb-6">
                            <div className="flex items-center gap-4 flex-1">
                               <div className="w-12 h-12 bg-stone-50 text-amber-600 rounded-2xl flex items-center justify-center font-black text-sm">{pIdx + 1}</div>
                               <input value={period.title} onChange={e => updatePeriodField(period.id, 'title', e.target.value)} className="text-lg font-black text-stone-800 bg-transparent border-none outline-none focus:ring-0 w-full" placeholder="نام دوره (مثلاً سه ماهه اول)"/>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="flex items-center gap-3 bg-[#faf8f4] p-2 rounded-2xl border border-[#ece5d8]">
                                  <span className="text-[10px] font-black text-stone-400">روزهای دوره:</span>
                                  <input type="number" value={period.days} onChange={e => updatePeriodField(period.id, 'days', Number(e.target.value))} className="w-20 p-2 bg-white border border-[#e5ded0] rounded-xl text-center font-black text-sm outline-none focus:border-amber-500"/>
                                  <span className="text-[10px] font-black text-stone-400 ml-1">از {formData.totalDays} روز</span>
                               </div>
                               {formData.isMultiPeriod && (formData.periods?.length || 0) > 1 && (
                                 <button type="button" onClick={() => removePeriod(period.id)} className="p-3 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="حذف این دوره"><Trash2 size={20}/></button>
                               )}
                            </div>
                         </div>
                         <div className="grid grid-cols-1 gap-4">
                            {period.indices.map((idx) => {
                                const amount = getRootEffectiveAmount(idx.chapterCode, formData.statementId!, formData.selectedRootCodes);
                                const ratio = period.days / (formData.totalDays || 1);
                                const adjVal = calculateChapterAdjustmentValue(amount, idx.baseIndex, idx.performanceIndex, ratio, formData.coefficient || 0.95);
                                
                                let selectedSubCount = 0;
                                let totalSubCount = 0;
                                if (isCbsMode) {
                                  const tree = getProjectCbsTree();
                                  const rNode = tree.find(r => r.code === idx.chapterCode || r.code === (idx.chapterCode.length === 1 ? '0' + idx.chapterCode : idx.chapterCode));
                                  if (rNode && rNode.children.length > 0) {
                                    const childCodes = getAllChildCodes(rNode);
                                    totalSubCount = childCodes.length;
                                    selectedSubCount = childCodes.filter(c => (formData.selectedRootCodes || []).includes(c)).length;
                                  }
                                }

                                return (
                                <div key={idx.chapterCode} className="bg-[#faf8f4]/50 p-6 rounded-[2rem] border border-[#ece5d8] grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-white transition-all shadow-sm">
                                   <div className="md:col-span-3 text-right font-black text-stone-800 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                                      <div className="text-amber-600 text-xs flex items-center justify-between">
                                        <span>{isCbsMode ? `ریشه اصلی ${idx.chapterCode}` : `فصل ${idx.chapterCode}`}</span>
                                        {isCbsMode && totalSubCount > 0 && selectedSubCount > 0 && selectedSubCount < totalSubCount && (
                                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black">
                                            {selectedSubCount} از {totalSubCount} زیرمجموعه
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] font-bold text-stone-600 truncate mt-0.5">{getChapterTitle(idx.chapterCode)}</div>
                                   </div>
                                   <div className="md:col-span-2">
                                      <span className="text-[9px] block text-stone-400 mb-0.5">{isCbsMode ? 'مبلغ تجمیعی ریشه' : 'کارکرد فصل'}</span>
                                      <div className="text-xs font-black text-stone-700">{Math.round(amount).toLocaleString()}</div>
                                      {formData.isMultiPeriod && <div className="text-[8px] text-blue-400 mt-0.5">سهم دوره: {Math.round(amount * ratio).toLocaleString()}</div>}
                                   </div>
                                   <div className="md:col-span-2">
                                      <label className="text-[9px] block text-stone-400 mb-1">شاخص مبنا</label>
                                      <input type="number" value={idx.baseIndex} onChange={e => updateIndexField(period.id, idx.chapterCode, 'baseIndex', Number(e.target.value))} className="w-full p-2 bg-white border border-[#e5ded0] rounded-xl text-center font-black text-xs outline-none focus:border-amber-500 shadow-inner"/>
                                   </div>
                                   <div className="md:col-span-2">
                                      <label className="text-[9px] block text-stone-400 mb-1">شاخص دوره</label>
                                      <input type="number" value={idx.performanceIndex} onChange={e => updateIndexField(period.id, idx.chapterCode, 'performanceIndex', Number(e.target.value))} className="w-full p-2 bg-white border border-[#e5ded0] rounded-xl text-center font-black text-xs outline-none focus:border-amber-500 shadow-inner"/>
                                   </div>
                                   <div className="md:col-span-3 text-left">
                                      <span className="text-[9px] block text-stone-400 mb-0.5">تعدیل سهم دوره</span>
                                      <div className={`text-sm font-black tracking-tighter ${adjVal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {adjVal >= 0 ? '+' : ''}{Math.round(adjVal).toLocaleString()}
                                      </div>
                                   </div>
                                </div>
                            )})}
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.statementId && (
                <div className="bg-stone-900 text-white p-10 rounded-[3rem] flex flex-col md:flex-row justify-between items-center shadow-2xl gap-8 relative overflow-hidden border border-stone-800">
                  <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                     <TrendingUp size={200} className="absolute -left-20 -bottom-20 rotate-12 text-amber-500" />
                  </div>
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md text-blue-400 shadow-inner border border-white/10"><Calculator size={48}/></div>
                    <div className="text-right">
                      <span className="text-[11px] font-black opacity-50 uppercase tracking-widest">خالص مبلغ تعدیل برآورد شده (لحظه‌ای):</span>
                      <p className="text-[10px] text-stone-400 font-bold mt-1">بر اساس مقادیر فصل‌ها و شاخص‌های وارد شده در تمامی دوره‌ها</p>
                    </div>
                  </div>
                  <div className="text-left relative z-10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black tracking-tighter text-blue-400 drop-shadow-lg">{calculateRecordTotal(formData).toLocaleString()}</span>
                      <span className="text-sm text-stone-500 font-black">ریال</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-10 bg-[#faf8f4] border-t border-[#ece5d8] flex justify-end gap-4 rounded-b-[4rem]">
               <button onClick={() => setIsModalOpen(false)} className="px-10 py-4 text-stone-500 font-black rounded-2xl hover:bg-stone-200 transition-all">انصراف</button>
               <button onClick={handleSave} className="px-12 py-4 bg-amber-600 text-white rounded-2xl font-black shadow-2xl shadow-amber-600/30 hover:bg-stone-900 active:scale-95 transition-all flex items-center gap-3">
                 <Save size={24}/> {editingId ? 'بروزرسانی نهایی' : 'ثبت و ذخیره محاسبات'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
         <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm text-center border border-[#ece5d8]">
               <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full mx-auto flex items-center justify-center mb-4 shadow-inner">
                 <AlertTriangle size={32}/>
               </div>
               <h3 className="text-lg font-black text-stone-800">حذف محاسبات تعدیل</h3>
               <p className="text-sm text-stone-500 mt-2">آیا از حذف این سابقه محاسباتی اطمینان دارید؟ این عملیات غیرقابل بازگشت است.</p>
               <div className="flex gap-4 mt-8">
                  <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 rounded-2xl bg-stone-100 text-stone-700 font-black hover:bg-stone-200 transition-all">انصراف</button>
                  <button onClick={handleDelete} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black hover:bg-red-700 shadow-xl shadow-red-500/20 active:scale-95 transition-all">تایید و حذف</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
