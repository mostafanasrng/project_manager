import React, { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { MOCK_PROJECTS, DEFAULT_CBS_NODES, CbsNode } from "../constants";
import { Project, PriceList, CbsRevision } from "../types";
import { SystemAdminService } from "../services/systemAdminService";
import {
  Layers, Plus, Trash2, Edit3, Save, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown,
  Upload, FileSpreadsheet, Download, Printer, RefreshCw, FileText, Paperclip, 
  MessageSquare, History, Search, Filter, ShieldCheck, ShieldAlert, Lock, ChevronRight, ChevronDown, 
  Info, Eye, Copy, Ban, Check, HelpCircle, EyeOff
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

// Interfaces moved to constants.tsx

// Helper to find parent by code and handle 1.00 / 1.0 conventions
const findParentIdByCode = (code: string, codeToIdMap: Record<string, string>) => {
  if (!code || !code.includes('.')) return null;
  const parts = code.split('.');
  const standardParentCode = parts.slice(0, -1).join('.');
  
  // 1. Try standard (1.01 -> 1)
  if (codeToIdMap[standardParentCode]) return codeToIdMap[standardParentCode];
  
  // 2. Try header (1.01 -> 1.00 or 1.0)
  const header00 = standardParentCode + '.00';
  if (codeToIdMap[header00] && header00 !== code) return codeToIdMap[header00];
  
  const header0 = standardParentCode + '.0';
  if (codeToIdMap[header0] && header0 !== code) return codeToIdMap[header0];
  
  return null;
};

// Auto-repair utility for imported or misconfigured CBS nodes
const repairCbsNodes = (allNodes: CbsNode[]): CbsNode[] => {
  if (!Array.isArray(allNodes)) return allNodes;

  const projectIds = Array.from(new Set(allNodes.map(n => n.projectId).filter(Boolean)));
  const repaired: CbsNode[] = [];

  projectIds.forEach(pId => {
    const projNodes = allNodes.filter(n => n.projectId === pId);
    
    // Sort nodes so parents are processed before children (e.g. "1" before "1.1")
    const sorted = [...projNodes].sort((a, b) => {
      const codeA = a.code || "";
      const codeB = b.code || "";
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const codeToIdMap: Record<string, string> = {};
    const idToRepairedNode: Record<string, CbsNode> = {};

    sorted.forEach(n => {
      codeToIdMap[n.code] = n.id;
    });

    sorted.forEach(n => {
      const parentId = findParentIdByCode(n.code, codeToIdMap);
      
      let level = 0;
      if (parentId) {
        const parentNode = idToRepairedNode[parentId];
        if (parentNode) {
          level = parentNode.level + 1;
        } else {
          level = n.code.includes('.') ? n.code.split('.').length - 1 : 0;
        }
      } else {
        level = n.code.includes('.') ? n.code.split('.').length - 1 : 0;
      }

      const repairedNode: CbsNode = {
        ...n,
        parentId,
        level,
        isActive: n.isActive !== undefined ? n.isActive : true,
        status: n.status || "ACTIVE",
        weightPercent: Number(n.weightPercent) || 0,
        budget: Number(n.budget) || 0,
        quantity: n.quantity !== undefined ? Number(n.quantity) : 1,
        unit: n.unit || "پروژه",
      };

      if (repairedNode.quantity > 0) {
        repairedNode.unitPrice = repairedNode.budget / repairedNode.quantity;
      } else {
        repairedNode.unitPrice = repairedNode.budget;
      }

      idToRepairedNode[n.id] = repairedNode;
      repaired.push(repairedNode);
    });
  });

  const noProjectNodes = allNodes.filter(n => !n.projectId);
  return [...repaired, ...noProjectNodes];
};

const calculateImportRootWeightsSum = (items: any[]): number => {
  if (!items || items.length === 0) return 0;
  
  const allCodes = items.map(item => String(item.code || '').trim()).filter(Boolean);
  
  const hasParent = (code: string): boolean => {
    if (!code || !code.includes('.')) return false;
    const parts = code.split('.');
    const standardParentCode = parts.slice(0, -1).join('.');
    
    // 1. Try standard (1.01 -> 1)
    if (allCodes.includes(standardParentCode)) return true;
    
    // 2. Try header (1.01 -> 1.00 or 1.0)
    const header00 = standardParentCode + '.00';
    if (allCodes.includes(header00) && header00 !== code) return true;
    
    const header0 = standardParentCode + '.0';
    if (allCodes.includes(header0) && header0 !== code) return true;
    
    return false;
  };
  
  const rootItems = items.filter(item => {
    const code = String(item.code || '').trim();
    return !hasParent(code);
  });
  
  const sum = rootItems.reduce((acc, item) => acc + (item.weightPercent || 0), 0);
  return Math.round(sum * 100) / 100;
};

const calculateImportRootBudgetSum = (items: any[]): number => {
  if (!items || items.length === 0) return 0;
  
  const allCodes = items.map(item => String(item.code || '').trim()).filter(Boolean);
  
  const hasParent = (code: string): boolean => {
    if (!code || !code.includes('.')) return false;
    const parts = code.split('.');
    const standardParentCode = parts.slice(0, -1).join('.');
    
    // 1. Try standard (1.01 -> 1)
    if (allCodes.includes(standardParentCode)) return true;
    
    // 2. Try header (1.01 -> 1.00 or 1.0)
    const header00 = standardParentCode + '.00';
    if (allCodes.includes(header00) && header00 !== code) return true;
    
    const header0 = standardParentCode + '.0';
    if (allCodes.includes(header0) && header0 !== code) return true;
    
    return false;
  };
  
  const rootItems = items.filter(item => {
    const code = String(item.code || '').trim();
    return !hasParent(code);
  });
  
  return rootItems.reduce((acc, item) => acc + (item.budget || 0), 0);
};

const convertPriceListToCbsNodes = (projId: string, priceList: PriceList): CbsNode[] => {
  const items = priceList.items || [];
  const generatedNodes: CbsNode[] = [];
  
  // Sort items by code length and lexicographically so we process parents before children
  const sortedItems = [...items].sort((a, b) => {
    const codeA = a.code || "";
    const codeB = b.code || "";
    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
  });
  
  // Keep track of code to generated node ID and ID to level
  const codeToIdMap: Record<string, string> = {};
  const idToLevelMap: Record<string, number> = {};
  
  sortedItems.forEach((item, index) => {
    const code = item.code || "";
    const id = `node_auto_${projId}_${code.replace(/\./g, '_')}_${Date.now()}_${index}`;
    codeToIdMap[code] = id;
    
    // Find parentId and determine level
    const parentId = findParentIdByCode(code, codeToIdMap);
    const level = parentId ? (idToLevelMap[parentId] + 1) : 0;
    idToLevelMap[id] = level;
    
    // Determine weight percentage and budget
    const budget = item.price || 0;
    const weightPercent = item.weightPercent || 0;
    
    const node: CbsNode = {
      id,
      projectId: projId,
      code,
      title: item.description || `فعالیت ${code}`,
      description: item.description || "",
      parentId,
      level,
      sortOrder: (index + 1) * 10,
      isActive: true,
      status: "ACTIVE",
      weightPercent: weightPercent,
      budget: budget,
      unit: item.unit || "پروژه",
      quantity: item.quantity !== undefined ? item.quantity : 1,
      unitPrice: (item.quantity && item.quantity > 0) ? (budget / item.quantity) : budget,
      responsibleUser: "مدیر پروژه",
      notes: [],
      attachments: [],
      auditLogs: [{
        id: `log_auto_${Date.now()}_${index}`,
        user: "سیستم",
        action: "بارگذاری خودکار",
        details: "بارگذاری خودکار ساختار شکست ثبت شده از مشخصات پروژه",
        date: new Date().toLocaleDateString('fa-IR')
      }]
    };
    
    generatedNodes.push(node);
  });
  
  return generatedNodes;
};

interface CbsManagementProps {
  selectedProjectId?: string;
}

export default function CbsManagement({ selectedProjectId }: CbsManagementProps) {
  // System Admin permission check for direct CBS edits
  const currentUser = useMemo(() => SystemAdminService.getCurrentUser(), []);
  const isSystemAdmin = currentUser?.role === "SYSTEM_ADMIN";

  // Load projects from localStorage
  const [projectsList] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem("hamyar_projects");
      if (saved) {
        const loaded = JSON.parse(saved);
        if (Array.isArray(loaded)) {
          const cleaned = loaded.filter((p: any) => p.id !== '2' && !String(p.title || '').includes('تصفیه‌خانه مرکزی') && !String(p.title || '').includes('تسویه خانه مرکزی') && !String(p.title || '').includes('نیایش'));
          return cleaned.length > 0 ? cleaned : MOCK_PROJECTS;
        }
      }
    } catch (e) {}
    return MOCK_PROJECTS as Project[];
  });

  const [currentProjId, setCurrentProjId] = useState<string>(() => {
    if (selectedProjectId) return selectedProjectId;
    const saved = localStorage.getItem("hamyar_selected_project_id");
    return (saved && saved !== '2') ? saved : (projectsList[0]?.id || "1");
  });

  useEffect(() => {
    if (selectedProjectId) {
      setCurrentProjId(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    const handleProjectChanged = (e?: Event) => {
      const customEvent = e as CustomEvent<{ projectId: string }>;
      const newProjId = customEvent?.detail?.projectId || localStorage.getItem("hamyar_selected_project_id");
      if (newProjId && newProjId !== currentProjId) {
        setCurrentProjId(newProjId);
      }
    };
    window.addEventListener("project-changed", handleProjectChanged);
    window.addEventListener("storage", handleProjectChanged);
    return () => {
      window.removeEventListener("project-changed", handleProjectChanged);
      window.removeEventListener("storage", handleProjectChanged);
    };
  }, [currentProjId]);

  const projId = currentProjId;

  const activeProjectObj = projectsList.find((p) => p.id === projId);
  const projectTitle = activeProjectObj?.title || "مدیریت ساختار شکست (CBS)";
  const activeCurrency = activeProjectObj?.currency || 'تومان';

  const formatAmount = (val: number) => {
    return (val || 0).toLocaleString('fa-IR');
  };

  // Primary State
  const [nodes, setNodes] = useState<CbsNode[]>(() => {
    const saved = localStorage.getItem("hamyar_cbs_nodes");
    if (saved) {
      try {
        const loaded = JSON.parse(saved);
        return repairCbsNodes(loaded);
      } catch (e) {
        return repairCbsNodes(DEFAULT_CBS_NODES);
      }
    }
    return repairCbsNodes(DEFAULT_CBS_NODES);
  });

  // Automatically synchronize from project's priceLists if nodes are missing for this project
  useEffect(() => {
    if (!activeProjectObj) return;
    
    // Check if we already have nodes for this project
    const projectNodes = nodes.filter(n => n.projectId === projId);
    if (projectNodes.length === 0) {
      // Find a priceList of type CBS or containing "CBS" / "ساختار شکست"
      const cbsPriceList = activeProjectObj.priceLists?.find(
        pl => pl.type === 'CBS' || pl.title?.includes('CBS') || pl.title?.includes('ساختار شکست') || pl.title?.includes('ساختار')
      );
      
      if (cbsPriceList && cbsPriceList.items && cbsPriceList.items.length > 0) {
        const autoNodes = convertPriceListToCbsNodes(projId, cbsPriceList);
        if (autoNodes.length > 0) {
          setNodes(prev => {
            const otherNodes = prev.filter(n => n.projectId !== projId);
            const merged = repairCbsNodes([...otherNodes, ...autoNodes]);
            localStorage.setItem("hamyar_cbs_nodes", JSON.stringify(merged));
            return merged;
          });
        }
      }
    }
  }, [projId, activeProjectObj]);

  // Revisions State
  const [revisions, setRevisions] = useState<CbsRevision[]>(() => {
    const saved = localStorage.getItem("hamyar_cbs_revisions");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      {
        id: "rev_initial",
        version: "V1.0",
        date: "1403/01/16",
        author: "Mostafa.nasrollahnejad",
        changes: "تعریف و تصویب ساختار شکست مبنا (Baseline) پروژه",
        nodeCount: DEFAULT_CBS_NODES.length,
        totalBudget: 80000000000,
        nodesSnapshot: DEFAULT_CBS_NODES
      }
    ];
  });

  // Selected state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({
    "node_1": true,
    "node_2": true,
    "node_2_1": true,
    "node_3": true,
    "node_4": true
  });

  // General controls & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [levelFilter, setLevelFilter] = useState<number | string>("ALL");
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "attachments" | "audit" | "docs">("details");

  // Excel Import UI states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Revision Modal UI states
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revComment, setRevComment] = useState("");
  const [revVersion, setRevVersion] = useState("V1.1");

  // Node editing form state
  const [editForm, setEditForm] = useState<Partial<CbsNode>>({});
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDanger: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "تایید",
    cancelText: "انصراف",
    isDanger: false,
    onConfirm: () => {}
  });

  // Save to localStorage on state change and dispatch custom events for Technical Office sync
  useEffect(() => {
    localStorage.setItem("hamyar_cbs_nodes", JSON.stringify(nodes));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("cbs-nodes-updated", { detail: { projectId: projId } }));
    window.dispatchEvent(new CustomEvent("estimates-updated", { detail: { projectId: projId } }));
  }, [nodes, projId]);

  useEffect(() => {
    localStorage.setItem("hamyar_cbs_revisions", JSON.stringify(revisions));
  }, [revisions]);

  // Compute selected node details
  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  useEffect(() => {
    if (selectedNode) {
      setEditForm({ ...selectedNode });
      setFormError("");
      setFormSuccess("");
    } else {
      setEditForm({});
    }
  }, [selectedNodeId, selectedNode]);

  // Expand / collapse single node
  const toggleNodeExpand = (id: string) => {
    setExpandedNodeIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Expand all nodes
  const expandAll = () => {
    const next: Record<string, boolean> = {};
    nodes.forEach(n => {
      next[n.id] = true;
    });
    setExpandedNodeIds(next);
  };

  // Collapse all nodes
  const collapseAll = () => {
    setExpandedNodeIds({});
  };

  // Save changes to current selected node (Live validation check)
  const handleSaveNode = () => {
    if (!isSystemAdmin) {
      setFormError("امکان ویرایش مستقیم ساختار شکست هزینه (CBS) صرفاً برای مدیر کل سیستم (System Admin) مقدور می‌باشد.");
      return;
    }

    if (!editForm.code || !editForm.title) {
      setFormError("وارد کردن کد CBS و عنوان فعالیت الزامی است.");
      return;
    }

    // Code uniqueness check (exclude self)
    const duplicateCode = nodes.some(n => n.code === editForm.code && n.id !== editForm.id);
    if (duplicateCode) {
      setFormError(`کد CBS وارد شده (${editForm.code}) قبلاً استفاده شده است.`);
      return;
    }

    // Auto-calculate parentId and level from Code
    const codeToIdMap: Record<string, string> = {};
    nodes.forEach(n => { codeToIdMap[n.code] = n.id; });
    
    const finalParentId = findParentIdByCode(editForm.code || "", codeToIdMap);
    const parentNode = nodes.find(n => n.id === finalParentId);
    const finalLevel = parentNode ? parentNode.level + 1 : 0;

    // Budget weight calculation check
    const calculatedBudget = (Number(editForm.quantity || 0) * Number(editForm.unitPrice || 0)) || editForm.budget || 0;

    const actionText = editForm.id ? "ویرایش" : "ایجاد";
    const auditRecord = {
      id: `l_${Date.now()}`,
      user: "Mostafa.nasrollahnejad",
      action: editForm.id ? "EDIT_NODE" : "CREATE_NODE",
      details: `${actionText} گره با عنوان "${editForm.title}" و کد "${editForm.code}". وزن فیزیکی: ${editForm.weightPercent}%`,
      date: new Date().toLocaleDateString("fa-IR") + " " + new Date().toLocaleTimeString("fa-IR").substring(0, 5)
    };

    setNodes(prev => {
      // First, update the node itself
      const updatedNodes = prev.map(n => {
        if (n.id === editForm.id) {
          return {
            ...n,
            ...editForm,
            parentId: finalParentId,
            level: finalLevel,
            budget: calculatedBudget,
            unitPrice: Number(editForm.unitPrice) || 0,
            quantity: Number(editForm.quantity) || 0,
            weightPercent: Number(editForm.weightPercent) || 0,
            auditLogs: [auditRecord, ...(n.auditLogs || [])]
          };
        }
        return n;
      });

      // Then, recursively update all descendant levels and hierarchical codes based on their actual parent node
      const updateDescendantHierarchy = (nodeList: CbsNode[]): CbsNode[] => {
        let changed = false;
        const result = nodeList.map(n => {
          if (n.parentId) {
            const parent = nodeList.find(p => p.id === n.parentId);
            if (parent) {
              const suffix = n.code.includes('.') ? n.code.split('.').pop() : n.code;
              
              // Handle hierarchical code prefix (strip .00 or .0 from parent if it exists)
              let parentPrefix = parent.code;
              if (parentPrefix.endsWith('.00')) parentPrefix = parentPrefix.slice(0, -3);
              else if (parentPrefix.endsWith('.0')) parentPrefix = parentPrefix.slice(0, -2);
              
              const expectedCode = `${parentPrefix}.${suffix}`;
              const expectedLevel = parent.level + 1;
              if (n.level !== expectedLevel || n.code !== expectedCode) {
                changed = true;
                return { ...n, level: expectedLevel, code: expectedCode };
              }
            }
          } else if (n.level !== 0 && !n.parentId) {
            changed = true;
            return { ...n, level: 0 };
          }
          return n;
        });
        return changed ? updateDescendantHierarchy(result) : result;
      };

      return updateDescendantHierarchy(updatedNodes);
    });

    setFormError("");
    setFormSuccess("تغییرات با موفقیت ذخیره و در ساختار CBS اعمال شد.");
    setTimeout(() => setFormSuccess(""), 3000);
  };

  // Recursive check for descendant
  const isDescendant = (parentId: string, childId: string): boolean => {
    let current = nodes.find(n => n.id === childId);
    while (current && current.parentId) {
      if (current.parentId === parentId) return true;
      current = nodes.find(n => n.id === current!.parentId);
    }
    return false;
  };

  // Determine Node level based on Parent ID
  const getNodeLevel = (parentId: string | null): number => {
    if (!parentId) return 0;
    const parentNode = nodes.find(n => n.id === parentId);
    return parentNode ? parentNode.level + 1 : 0;
  };

  // Add a new sibling / child node helper
  const handleAddNewNode = (isChildOfSelected: boolean, directParentId?: string | null) => {
    if (!isSystemAdmin) {
      alert("امکان افزودن گره جدید به ساختار شکست (CBS) صرفاً برای مدیر کل سیستم مقدور می‌باشد.");
      return;
    }
    let parentId: string | null = null;
    if (directParentId !== undefined) {
      parentId = directParentId;
    } else {
      parentId = isChildOfSelected && selectedNodeId ? selectedNodeId : (selectedNode?.parentId || null);
    }
    const parentNode = nodes.find(n => n.id === parentId);
    
    // Suggest next code based on actual sibling codes
    const siblings = nodes.filter(n => n.parentId === parentId);
    let nextSuffixNumber = 1;
    let maxSortOrder = 0;
    if (siblings.length > 0) {
      const suffixes = siblings.map(s => {
        const parts = s.code.split('.');
        const lastPart = parts[parts.length - 1];
        return parseInt(lastPart, 10) || 0;
      });
      nextSuffixNumber = Math.max(...suffixes, 0) + 1;
      maxSortOrder = Math.max(...siblings.map(s => s.sortOrder), 0);
    }
    
    let nextSuffix = String(nextSuffixNumber).padStart(2, "0");
    
    // Handle hierarchical code prefix (strip .00 or .0 from parent if it exists)
    let parentPrefix = parentNode?.code || "";
    if (parentPrefix.endsWith('.00')) parentPrefix = parentPrefix.slice(0, -3);
    else if (parentPrefix.endsWith('.0')) parentPrefix = parentPrefix.slice(0, -2);
    
    let suggestedCode = parentPrefix ? `${parentPrefix}.${nextSuffix}` : nextSuffix;

    const newNodeId = `node_${Date.now()}`;
    const newRecord: CbsNode = {
      id: newNodeId,
      projectId: projId,
      code: suggestedCode,
      title: "آیتم ساختار شکست جدید",
      description: "توضیحات و شرح عملیات بسته کاری",
      parentId: parentId,
      level: parentNode ? parentNode.level + 1 : 0,
      sortOrder: Math.max(maxSortOrder + 10, nextSuffixNumber * 10),
      isActive: true,
      status: "DRAFT",
      weightPercent: 0,
      budget: 0,
      unit: "مترمکعب",
      quantity: 0,
      unitPrice: 0,
      responsibleUser: "در انتظار انتساب",
      notes: [],
      attachments: [],
      auditLogs: [{
        id: `l_${Date.now()}`,
        user: "Mostafa.nasrollahnejad",
        action: "CREATE_NODE",
        details: `ایجاد گره جدید با کد موقت ${suggestedCode}`,
        date: new Date().toLocaleDateString("fa-IR")
      }]
    };

    setNodes(prev => [...prev, newRecord]);
    setSelectedNodeId(newNodeId);
    if (parentId) {
      setExpandedNodeIds(prev => ({ ...prev, [parentId]: true }));
    }
  };

  // Delete Node (and recursive descendants check) using custom dialog
  const handleDeleteNode = (id: string) => {
    if (!isSystemAdmin) {
      alert("امکان حذف گره‌های ساختار شکست (CBS) صرفاً برای مدیر کل سیستم مقدور می‌باشد.");
      return;
    }
    const targetNode = nodes.find(n => n.id === id);
    if (!targetNode) return;

    const children = nodes.filter(n => n.parentId === id);
    const hasChildren = children.length > 0;
    
    let confirmMsg = `آیا از حذف ردیف ساختار شکست "${targetNode.title}" (کد: ${targetNode.code}) مطمئن هستید؟ با تایید، تمامی اطلاعات متناظر در بخش دفتر فنی و پیمان‌ها نیز پاکسازی خواهد شد.`;
    if (hasChildren) {
      confirmMsg = `این گره دارای ${children.length} فرزند/زیرشاخه در درختی است. با تایید حذف، این گره و تمامی زیرشاخه‌های آن به طور کامل حذف شده و تمامی اطلاعات متناظر در دفتر فنی و پیمان‌ها پاک خواهند شد. آیا ادامه می‌دهید؟`;
    }

    setConfirmDialog({
      isOpen: true,
      title: "تایید حذف ردیف ساختار شکست (CBS)",
      message: confirmMsg,
      confirmText: "بله، حذف شود",
      cancelText: "انصراف",
      isDanger: true,
      onConfirm: () => {
        let idsToRemove = [id];
        if (hasChildren) {
          const getDescendantIds = (nodeId: string): string[] => {
            const direct = nodes.filter(n => n.parentId === nodeId);
            let descIds = direct.map(n => n.id);
            direct.forEach(d => {
              descIds = [...descIds, ...getDescendantIds(d.id)];
            });
            return descIds;
          };
          idsToRemove = [...idsToRemove, ...getDescendantIds(id)];
        }

        const removedNodes = nodes.filter(n => idsToRemove.includes(n.id));
        const removedCodes = removedNodes.map(n => String(n.code || '').trim().toLowerCase());
        const removedIds = removedNodes.map(n => String(n.id).trim());

        const remainingNodes = nodes.filter(n => !idsToRemove.includes(n.id));
        setNodes(remainingNodes);
        setSelectedNodeId(null);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));

        // 1. Immediately save to hamyar_cbs_nodes
        localStorage.setItem("hamyar_cbs_nodes", JSON.stringify(remainingNodes));

        // 2. Clean up hamyar_estimates (Technical Office CBS Engineering)
        try {
          const storedEst = JSON.parse(localStorage.getItem('hamyar_estimates') || '[]');
          if (Array.isArray(storedEst)) {
            const cleanEst = storedEst.filter((e: any) => {
              const estProjId = String(e.projectId || '').trim();
              if (estProjId === String(projId).trim()) {
                const itemCode = String(e.code || e.itemCode || e.cbsCode || '').trim().toLowerCase();
                const itemId = String(e.cbsId || e.id || '').trim();
                if (removedCodes.includes(itemCode) || removedIds.includes(itemId)) {
                  return false;
                }
              }
              return true;
            });
            localStorage.setItem('hamyar_estimates', JSON.stringify(cleanEst));
          }
        } catch (err) {}

        // 3. Clean up hamyar_cbs_contracts (cbsMapping)
        try {
          const storedContracts = JSON.parse(localStorage.getItem('hamyar_cbs_contracts') || '[]');
          if (Array.isArray(storedContracts)) {
            const updatedContracts = storedContracts.map((c: any) => {
              if (String(c.projectId || '').trim() === String(projId).trim()) {
                const updatedMapping = (c.cbsMapping || []).filter((m: any) => {
                  const mapCode = String(m.cbsCode || m.code || '').trim().toLowerCase();
                  return !removedCodes.includes(mapCode);
                });
                return { ...c, cbsMapping: updatedMapping };
              }
              return c;
            });
            localStorage.setItem('hamyar_cbs_contracts', JSON.stringify(updatedContracts));
          }
        } catch (err) {}

        // 4. Clean up hamyar_projects
        try {
          const storedProjs = JSON.parse(localStorage.getItem('hamyar_projects') || '[]');
          if (Array.isArray(storedProjs)) {
            const updatedProjs = storedProjs.map((p: any) => {
              if (String(p.id || '').trim() === String(projId).trim()) {
                const cleanMapping = (p.cbsMapping || []).filter((m: any) => {
                  const mapCode = String(m.cbsCode || m.code || '').trim().toLowerCase();
                  return !removedCodes.includes(mapCode);
                });
                const cleanWbs = (p.wbsScheduleMapping || []).filter((m: any) => {
                  const mapCode = String(m.cbsCode || m.code || '').trim().toLowerCase();
                  return !removedCodes.includes(mapCode);
                });
                return { ...p, cbsMapping: cleanMapping, wbsScheduleMapping: cleanWbs };
              }
              return p;
            });
            localStorage.setItem('hamyar_projects', JSON.stringify(updatedProjs));
          }
        } catch (err) {}

        // 5. Broadcast custom events so Technical Office re-renders immediately
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("cbs-nodes-updated", { detail: { projectId: projId } }));
        window.dispatchEvent(new CustomEvent("estimates-updated", { detail: { projectId: projId } }));
        window.dispatchEvent(new CustomEvent("cbs-contracts-updated", { detail: { projectId: projId } }));
        window.dispatchEvent(new CustomEvent("wbs-updated", { detail: { projectId: projId } }));
        window.dispatchEvent(new CustomEvent("project-changed", { detail: { projectId: projId } }));
      }
    });
  };

  // Reorder node (shift up / down among siblings)
  const handleShiftNodeOrder = (direction: "UP" | "DOWN") => {
    if (!isSystemAdmin) {
      alert("امکان تغییر ترتیب گره‌های CBS صرفاً برای مدیر کل سیستم مقدور می‌باشد.");
      return;
    }
    if (!selectedNodeId || !selectedNode) return;
    const parentId = selectedNode.parentId;
    const siblings = nodes
      .filter(n => n.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    
    const currentIndex = siblings.findIndex(s => s.id === selectedNodeId);
    if (direction === "UP" && currentIndex > 0) {
      const prevSibling = siblings[currentIndex - 1];
      setNodes(prev => prev.map(n => {
        if (n.id === selectedNodeId) return { ...n, sortOrder: prevSibling.sortOrder };
        if (n.id === prevSibling.id) return { ...n, sortOrder: selectedNode.sortOrder };
        return n;
      }));
    } else if (direction === "DOWN" && currentIndex < siblings.length - 1) {
      const nextSibling = siblings[currentIndex + 1];
      setNodes(prev => prev.map(n => {
        if (n.id === selectedNodeId) return { ...n, sortOrder: nextSibling.sortOrder };
        if (n.id === nextSibling.id) return { ...n, sortOrder: selectedNode.sortOrder };
        return n;
      }));
    }
  };

  // Add Comment/Note to Node
  const [newCommentText, setNewCommentText] = useState("");
  const handleAddComment = () => {
    if (!newCommentText.trim() || !selectedNodeId) return;
    const newComment = {
      id: `comm_${Date.now()}`,
      author: "Mostafa.nasrollahnejad (کارشناس ارشد کنترل پروژه)",
      text: newCommentText.trim(),
      date: new Date().toLocaleDateString("fa-IR") + " " + new Date().toLocaleTimeString("fa-IR").substring(0, 5)
    };

    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        return {
          ...n,
          notes: [newComment, ...(n.notes || [])]
        };
      }
      return n;
    }));
    setNewCommentText("");
  };

  // Attach File to Node
  const [dragActive, setDragActive] = useState(false);
  const handleFileUploadSim = (fileName: string) => {
    if (!selectedNodeId) return;
    const newAttach = {
      id: `att_${Date.now()}`,
      name: fileName,
      size: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
      date: new Date().toLocaleDateString("fa-IR")
    };

    setNodes(prev => prev.map(n => {
      if (n.id === selectedNodeId) {
        return {
          ...n,
          attachments: [newAttach, ...(n.attachments || [])]
        };
      }
      return n;
    }));
  };

  // Create Snapshot Version History (Revision)
  const handleCreateRevision = () => {
    if (!isSystemAdmin) {
      alert("امکان ایجاد نسخه جدید CBS صرفاً برای مدیر کل سیستم مقدور می‌باشد.");
      return;
    }
    if (!revVersion.trim()) {
      alert("لطفاً شماره نسخه تجدیدنظر را به درستی وارد کنید.");
      return;
    }
    const sumWeights = nodes.reduce((acc, n) => acc + (n.parentId === null ? n.weightPercent : 0), 0);
    const sumBudget = nodes.reduce((acc, n) => acc + (n.parentId === null ? n.budget : 0), 0);

    const newRev: CbsRevision = {
      id: `rev_${Date.now()}`,
      version: revVersion,
      date: new Date().toLocaleDateString("fa-IR"),
      author: "Mostafa.nasrollahnejad",
      changes: revComment || "اعمال تغییرات ابلاغیه جدید متمم و الحاقیه فنی ساختار شکست",
      nodeCount: nodes.length,
      totalBudget: sumBudget || 80000000000,
      nodesSnapshot: JSON.parse(JSON.stringify(nodes))
    };

    setRevisions(prev => [newRev, ...prev]);
    setIsRevisionModalOpen(false);
    setRevComment("");
    alert(`نسخه تجدیدنظر ${revVersion} ساختار شکست CBS با موفقیت بایگانی و در بانک سوابق ثبت شد.`);
  };

  // Restore Revision Snapshot
  const handleRestoreRevision = (rev: CbsRevision) => {
    if (!isSystemAdmin) {
      alert("امکان بازیابی نسخه‌های CBS صرفاً برای مدیر کل سیستم مقدور می‌باشد.");
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: `بازیابی نسخه تجدیدنظر ${rev.version}`,
      message: `آیا مطمئن هستید که می‌خواهید ساختار شکست فعال پروژه را به نسخه ${rev.version} (مورخ ${rev.date}) بازنشانی و بازیابی کنید؟ اطلاعات فعلی با اطلاعات این نسخه جایگزین خواهد شد.`,
      confirmText: "بله، بازیابی شود",
      cancelText: "انصراف",
      isDanger: false,
      onConfirm: () => {
        setNodes(rev.nodesSnapshot);
        setSelectedNodeId(null);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setIsRevisionModalOpen(false);
      }
    });
  };

  // Import template generator or live preview loader
  const handleExcelTemplateDownload = () => {
    try {
      const data = [
        { "کد فعالیت (WBS/CBS Code)": "01", "شرح فعالیت (Activity Title)": "تجهیز کارگاه تفصیلی", "واحد سنجش (Unit)": "پروژه", "مقدار (Quantity)": 1, "درصد وزن فیزیکی (Weight Percent)": 5, "برآورد هزینه مبنا - ریال (Budget - Rials)": 4000000000 },
        { "کد فعالیت (WBS/CBS Code)": "01.01", "شرح فعالیت (Activity Title)": "احداث دفاتر کارگاهی و فنس‌کشی", "واحد سنجش (Unit)": "مترمربع", "مقدار (Quantity)": 250, "درصد وزن فیزیکی (Weight Percent)": 3, "برآورد هزینه مبنا - ریال (Budget - Rials)": 2400000000 },
        { "کد فعالیت (WBS/CBS Code)": "01.02", "شرح فعالیت (Activity Title)": "پاکسازی نهایی و برچیدن کارگاه", "واحد سنجش (Unit)": "پروژه", "مقدار (Quantity)": 1, "درصد وزن فیزیکی (Weight Percent)": 2, "برآورد هزینه مبنا - ریال (Budget - Rials)": 1600000000 },
        { "کد فعالیت (WBS/CBS Code)": "02", "شرح فعالیت (Activity Title)": "عملیات اسکلت و سازه اصلی بتنی", "واحد سنجش (Unit)": "مترمکعب", "مقدار (Quantity)": 1200, "درصد وزن فیزیکی (Weight Percent)": 50, "برآورد هزینه مبنا - ریال (Budget - Rials)": 40000000000 },
        { "کد فعالیت (WBS/CBS Code)": "02.01", "شرح فعالیت (Activity Title)": "خاکبرداری، پی‌کنی و فونداسیون سازه‌ای", "واحد سنجش (Unit)": "مترمکعب", "مقدار (Quantity)": 450, "درصد وزن فیزیکی (Weight Percent)": 15, "برآورد هزینه مبنا - ریال (Budget - Rials)": 12000000000 }
      ];

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "قالب استاندارد CBS");

      worksheet['!cols'] = [
        { wch: 25 },
        { wch: 45 },
        { wch: 15 },
        { wch: 15 },
        { wch: 25 },
        { wch: 35 }
      ];

      XLSX.writeFile(workbook, "CBS_Standard_Template.xlsx");
    } catch (err: any) {
      alert(`خطا در ایجاد قالب نمونه: ${err.message}`);
    }
  };

  const handleRealExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

        // Find Header Row
        let headerIndex = -1;
        for(let i = 0; i < Math.min(rawRows.length, 50); i++) {
           const rowStr = rawRows[i].map((c: any) => String(c || '').trim().toLowerCase());
           if (rowStr.some((c: string) => c.includes('شرح') || c.includes('description') || c.includes('عنوان') || c.includes('activity'))) {
              headerIndex = i;
              break;
           }
        }

        if (headerIndex === -1) {
           if (rawRows[0] && rawRows[0].length >= 2) headerIndex = 0;
           else throw new Error("سطر عنوان یافت نشد. لطفا از قالب نمونه استاندارد استفاده نمایید.");
        }

        const headerRow = rawRows[headerIndex].map((c: any) => String(c || '').trim().toLowerCase());
        
        // Map Columns with robust cleaning (stripping non-alphanumeric, e.g., q.t.y -> qty)
        const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');
        const getColIdx = (keywords: string[]) => {
          const cleanKeywords = keywords.map(cleanStr).filter(Boolean);
          return headerRow.findIndex((h: string) => {
            const cleanH = cleanStr(h);
            if (!cleanH) return false;
            return cleanKeywords.some(k => {
              if (k === cleanH) return true;
              if (k.length > 1 && cleanH.length > 1) {
                return cleanH.includes(k) || k.includes(cleanH);
              }
              return false;
            });
          });
        };

        const codeIdx = getColIdx(['کد', 'code', 'شماره', 'ردیف', 'item']);
        const descIdx = getColIdx(['شرح', 'description', 'عنوان', 'موضوع', 'activity']);
        const unitIdx = getColIdx(['واحد', 'unit']);
        const priceIdx = getColIdx(['بها', 'قیمت', 'price', 'amount', 'مبلغ', 'rate', 'budget', 'برآورد']);
        const weightIdx = getColIdx(['وزن', 'weight', 'percent', 'درصد', 'سهم']);
        const qtyIdx = getColIdx(['مقدار', 'تعداد', 'quantity', 'qty', 'count', 'q', 'q.t.y', 'qnty', 'qnt', 'qt']);

        if (descIdx === -1) throw new Error("ستون 'شرح فعالیت' شناسایی نشد.");

        const parsedRows: any[] = [];
        for (let i = headerIndex + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const toEnglishDigits = (str: string): string => {
            return str
              .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
              .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
          };

          const code = codeIdx !== -1 ? String(row[codeIdx] || '').trim() : '';
          const title = String(row[descIdx] || '').trim();
          const unit = unitIdx !== -1 ? String(row[unitIdx] || '').trim() : 'پروژه';

          let priceStr = '0';
          if (priceIdx !== -1 && row[priceIdx] !== undefined && row[priceIdx] !== null && row[priceIdx] !== '') {
            priceStr = toEnglishDigits(String(row[priceIdx]));
          }
          priceStr = priceStr.replace(/[^0-9.]/g, '');
          const budget = parseFloat(priceStr) || 0;

          let weightStr = '0';
          if (weightIdx !== -1 && row[weightIdx] !== undefined && row[weightIdx] !== null && row[weightIdx] !== '') {
            weightStr = toEnglishDigits(String(row[weightIdx]));
          }
          weightStr = weightStr.replace(/[^0-9.]/g, '');
          const weightPercent = parseFloat(weightStr) || 0;

          let qtyStr = '1';
          if (qtyIdx !== -1 && row[qtyIdx] !== undefined && row[qtyIdx] !== null && row[qtyIdx] !== '') {
            qtyStr = toEnglishDigits(String(row[qtyIdx]));
          }
          qtyStr = qtyStr.replace(/[^0-9.]/g, '');
          const quantity = parseFloat(qtyStr) || 1;

          if (title && (code || budget > 0)) {
            parsedRows.push({ code, title, unit, weightPercent, budget, quantity });
          }
        }

        if (parsedRows.length === 0) {
          throw new Error("هیچ ردیف معتبری یافت نشد. لطفا فایل را با اطلاعات معتبر تکمیل کنید.");
        }

        setImportPreview(parsedRows);
      } catch (err: any) {
        alert(`خطا در پردازش فایل: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleApplyImportedRows = () => {
    if (!isSystemAdmin) {
      alert("امکان الحاق فایلهای اکسل CBS صرفاً برای مدیر کل سیستم مقدور می‌باشد.");
      return;
    }
    if (importPreview.length === 0) return;
    
    const timestamp = Date.now();
    
    // Sort importPreview by code to ensure parents are processed before children
    const sortedPreview = [...importPreview].sort((a, b) => {
      const codeA = a.code || "";
      const codeB = b.code || "";
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });

    // First, create a temporary map of codes to IDs for the new nodes
    const codeToIdMap: Record<string, string> = {};
    // Also include existing nodes in the map for cross-referencing
    nodes.forEach(n => { codeToIdMap[n.code] = n.id; });
    
    sortedPreview.forEach((item, idx) => {
      codeToIdMap[item.code] = `node_imported_${timestamp}_${idx}`;
    });

    const idToLevelMap: Record<string, number> = {};
    nodes.forEach(n => { idToLevelMap[n.id] = n.level; });

    // Convert preview objects into nodes with parent mapping
    const importedNodes: CbsNode[] = sortedPreview.map((item, idx) => {
      const code = item.code;
      const id = codeToIdMap[code];
      const parentId = findParentIdByCode(code, codeToIdMap);
      const level = parentId ? (idToLevelMap[parentId] + 1) : 0;
      idToLevelMap[id] = level;

      return {
        id,
        projectId: projId,
        code: item.code,
        title: item.title,
        description: "وارد شده از سیستم اکسل یکپارچه مالی",
        parentId: parentId,
        level: level,
        sortOrder: (idx + 1) * 10,
        isActive: true,
        status: "ACTIVE",
        weightPercent: item.weightPercent,
        budget: item.budget,
        unit: item.unit,
        quantity: item.quantity !== undefined ? item.quantity : 1,
        unitPrice: (item.quantity && item.quantity > 0) ? (item.budget / item.quantity) : item.budget,
        responsibleUser: "مدیر بازرگانی",
        notes: [],
        attachments: [],
        auditLogs: [{
          id: `l_${timestamp}_${idx}`,
          user: "Mostafa.nasrollahnejad",
          action: "IMPORT_EXCEL",
          details: "بارگذاری اکسل",
          date: new Date().toLocaleDateString("fa-IR")
        }]
      };
    });

    setNodes(prev => [...prev, ...importedNodes]);
    setIsImportModalOpen(false);
    setImportPreview([]);
    alert(`تعداد ${importedNodes.length} فعالیت با موفقیت بر اساس کدهای ساختار شکست در درختی پروژه الحاق شد.`);
  };

  // Direct print landscape CBS structure
  const handlePrintStructure = () => {
    const projectNodes = nodes
      .filter(n => n.projectId === projId)
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));

    if (projectNodes.length === 0) {
      alert("هیچ داده‌ای برای چاپ وجود ندارد.");
      return;
    }

    const totalBudget = projectNodes.reduce((sum, n) => n.level === 0 ? sum + n.budget : sum, 0);
    const totalWeight = projectNodes.reduce((sum, n) => n.level === 0 ? sum + n.weightPercent : sum, 0);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("لطفاً اجازه باز شدن پنجره پاپ‌آپ را بدهید.");
      return;
    }

    const reportDate = new Date().toLocaleDateString("fa-IR");
    const currentVersion = revisions.length > 0 ? revisions[revisions.length - 1].version : "V1.0";

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>فرم استاندارد ساختار شکست هزینه (CBS) - ${projectTitle}</title>
        <style>
          @font-face {
            font-family: 'Vazir';
            src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazir-font@v30.1.0/dist/Vazir.woff2') format('woff2');
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Vazir', Tahoma, Arial, sans-serif;
            margin: 0 auto;
            padding: 25px 40px;
            max-width: 1100px;
            color: #0f172a;
            line-height: 1.5;
            background-color: #fff;
            font-size: 11px;
          }
          
          /* Standard Header Frame */
          .standard-header-frame {
            border: 2px solid #1e293b;
            border-radius: 6px;
            margin-bottom: 12px;
            overflow: hidden;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
          }
          .header-table td {
            padding: 8px 12px;
            vertical-align: middle;
            border-left: 1px solid #1e293b;
          }
          .header-table td:last-child {
            border-left: none;
          }
          .org-title { font-size: 10px; font-weight: bold; color: #475569; }
          .org-val { font-size: 11px; font-weight: 900; color: #0f172a; margin-top: 1px; }
          .header-title-box { text-align: center; }
          .header-title-box h2 {
            margin: 0;
            font-size: 15px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .project-subtitle {
            font-size: 11px;
            font-weight: bold;
            color: #2563eb;
            margin-top: 4px;
          }
          .header-meta-box { font-size: 10px; font-weight: bold; color: #334155; line-height: 1.8; }
          
          /* Project Specification Info Table */
          .info-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #cbd5e1;
            margin-bottom: 16px;
            font-size: 10px;
          }
          .info-table td {
            padding: 6px 10px;
            border: 1px solid #cbd5e1;
          }
          .info-label {
            background-color: #f1f5f9;
            font-weight: bold;
            color: #475569;
            width: 15%;
          }
          .info-val {
            color: #0f172a;
            font-weight: 900;
            width: 35%;
          }

          /* Main CBS Data Table */
          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            border: 1px solid #cbd5e1;
            margin-bottom: 20px;
          }
          .data-table th {
            background-color: #1e293b;
            color: #ffffff;
            padding: 8px 10px;
            text-align: right;
            font-weight: 900;
            font-size: 10px;
            border: 1px solid #1e293b;
          }
          .data-table td {
            padding: 7px 10px;
            border: 1px solid #e2e8f0;
          }
          .level-0 { font-weight: 900; background-color: #f8fafc; color: #0f172a; }
          .level-1 { padding-right: 22px; font-weight: 700; color: #1e293b; }
          .level-2 { padding-right: 38px; color: #334155; }
          .level-3 { padding-right: 54px; color: #475569; }
          
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .font-mono { font-family: monospace; font-weight: bold; }
          
          @media print {
            body { padding: 0; margin: 0; max-width: 100%; }
            .no-print { display: none; }
            @page { margin: 15mm; size: A4 portrait; }
          }
          
          /* Footer Signatures Frame */
          .signatures-container {
            margin-top: 30px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            page-break-inside: avoid;
          }
          .signature-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
            background-color: #f8fafc;
          }
          .signature-role {
            font-size: 10px;
            font-weight: 900;
            color: #1e293b;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .signature-box {
            height: 70px;
            border: 1px dashed #94a3b8;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            color: #94a3b8;
            background-color: #fff;
          }
          
          .doc-footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #64748b;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <!-- STANDARD FORM HEADER -->
        <div class="standard-header-frame">
          <table class="header-table">
            <tr>
              <td width="30%">
                <div class="org-title">کارفرما: <span class="org-val">${activeProjectObj?.employerName || "دستگاه کارفرمایی"}</span></div>
                <div class="org-title" style="margin-top: 4px;">مشاور: <span class="org-val">${activeProjectObj?.consultantName || "مهندسین مشاور پروژه"}</span></div>
              </td>
              <td width="42%" class="header-title-box">
                <h2>فرم استاندارد ساختار شکست هزینه (CBS)</h2>
                <div class="project-subtitle">${projectTitle}</div>
              </td>
              <td width="28%">
                <div class="header-meta-box">
                  <div>کد پروژه: <span class="font-mono">${activeProjectObj?.contractNumber || "PRJ-002"}</span></div>
                  <div>تاریخ گزارش: <span>${reportDate}</span></div>
                  <div>نسخه/ویرایش: <span>${currentVersion}</span></div>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- PROJECT SPECIFICATIONS HEADER TABLE -->
        <table class="info-table">
          <tr>
            <td class="info-label">نام پروژه:</td>
            <td class="info-val">${projectTitle}</td>
            <td class="info-label">شماره قرارداد:</td>
            <td class="info-val font-mono">${activeProjectObj?.contractNumber || "ثبت نشده"}</td>
          </tr>
          <tr>
            <td class="info-label">دستگاه کارفرمایی:</td>
            <td class="info-val">${activeProjectObj?.employerName || "دستگاه کارفرمایی"}</td>
            <td class="info-label">مهندس مشاور / نظارت:</td>
            <td class="info-val">${activeProjectObj?.consultantName || "مهندسین مشاور پروژه"}</td>
          </tr>
          <tr>
            <td class="info-label">پیمانکار اصلی:</td>
            <td class="info-val">${activeProjectObj?.contractorName || "پیمانکار عمومی"}</td>
            <td class="info-label">مبلغ برآورد کل:</td>
            <td class="info-val font-mono">${totalBudget.toLocaleString("fa-IR")} تومان (وزن کل: ${totalWeight.toFixed(2)}٪)</td>
          </tr>
        </table>

        <!-- CBS MAIN DATA TABLE -->
        <table class="data-table">
          <thead>
            <tr>
              <th width="12%">کد CBS</th>
              <th width="42%">شرح فعالیت / ردیف ساختار شکست</th>
              <th width="8%" class="text-center">واحد</th>
              <th width="8%" class="text-center">مقدار</th>
              <th width="8%" class="text-center">وزن (%)</th>
              <th width="22%" class="text-left">مبلغ برآوردی (تومان)</th>
            </tr>
          </thead>
          <tbody>
            ${projectNodes.map(node => `
              <tr class="level-${node.level}">
                <td class="font-mono">${node.code}</td>
                <td>${node.title}</td>
                <td class="text-center">${node.unit || "-"}</td>
                <td class="text-center font-mono">${(node.quantity || 0).toLocaleString("fa-IR")}</td>
                <td class="text-center font-mono">${node.weightPercent}%</td>
                <td class="text-left font-mono">${getAggregatedBudget(node.id, nodes).toLocaleString("fa-IR")}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f5f9; font-weight: 900;">
              <td colspan="4" style="text-align: left; padding: 10px; font-weight: 900;">جمع کل برآورد ساختار شکست (CBS):</td>
              <td class="text-center font-mono" style="font-weight: 900;">${totalWeight.toFixed(2)}%</td>
              <td class="text-left font-mono" style="font-weight: 900;">${totalBudget.toLocaleString("fa-IR")}</td>
            </tr>
          </tfoot>
        </table>

        <!-- OFFICIAL SIGNATURES BLOCK -->
        <div class="signatures-container">
          <div class="signature-card">
            <div class="signature-role">تنظیم‌کننده (پیمانکار)</div>
            <div class="signature-box">محل امضاء و مهر پیمانکار</div>
          </div>
          <div class="signature-card">
            <div class="signature-role">تایید‌کننده (دستگاه نظارت / مشاور)</div>
            <div class="signature-box">محل امضاء و مهر مشاور</div>
          </div>
          <div class="signature-card">
            <div class="signature-role">تصویب‌کننده (کارفرما / دستگاه اجرایی)</div>
            <div class="signature-box">محل امضاء و مهر کارفرما</div>
          </div>
        </div>

        <div class="doc-footer">
          <div>سامانه مدیریت هوشمند پروژه‌های عمرانی همیار - گزارش رسمی CBS</div>
          <div>تاریخ چاپ: ${reportDate}</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Tree recursive builder function
  const renderCbsTreeRows = (parentId: string | null) => {
    const levelNodes = nodes
      .filter(n => n.parentId === parentId && (parentId !== null || n.projectId === projId))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (levelNodes.length === 0) return null;

    return (
      <div className={`mr-2 pr-2 border-r border-[#ece5d8] ${parentId ? "mt-1.5 space-y-1.5" : "space-y-3"}`}>
        {levelNodes.map(node => {
          const children = nodes.filter(n => n.parentId === node.id);
          const hasChildren = children.length > 0;
          const isExpanded = expandedNodeIds[node.id];
          const isSelected = selectedNodeId === node.id;
          
          // Match Search filter
          const queryMatch = node.title.includes(searchQuery) || node.code.includes(searchQuery) || (node.description && node.description.includes(searchQuery));
          const statusMatch = statusFilter === "ALL" || node.status === statusFilter;
          const levelMatch = levelFilter === "ALL" || node.level === Number(levelFilter);
          const isVisible = queryMatch && statusMatch && levelMatch;

          return (
            <div key={node.id} className="transition-all">
              {isVisible && (
                <div 
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border ${
                    isSelected 
                      ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-500/15 scale-[1.01]" 
                      : "bg-white text-stone-700 border-[#ece5d8] hover:border-stone-300 hover:bg-[#faf8f4]/50 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNodeExpand(node.id);
                      }}
                      className={`p-1 rounded-lg transition-transform ${hasChildren ? "opacity-100" : "opacity-20 pointer-events-none"} ${
                        isSelected ? "text-blue-100 hover:bg-amber-500" : "text-stone-400 hover:bg-stone-100"
                      }`}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {/* CBS Code tag */}
                    <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                      isSelected ? "bg-stone-900 text-blue-100" : "bg-stone-100 text-stone-600"
                    }`}>
                      {node.code}
                    </span>

                    {/* Node Title */}
                    <span className={`text-xs font-black truncate max-w-[280px] md:max-w-[360px] ${
                      isSelected ? "text-white" : "text-stone-800"
                    }`}>
                      {node.title}
                    </span>

                    {/* Level Badge */}
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-amber-500 text-blue-100" : "bg-stone-100 text-stone-500"
                    }`}>
                      سطح {node.level}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-left font-mono">
                    <span className={`text-[10px] font-bold ${isSelected ? "text-blue-200" : "text-stone-400"}`}>
                      {node.weightPercent}%
                    </span>
                    <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-stone-700"}`}>
                      {formatAmount(getAggregatedBudget(node.id, nodes))} {activeCurrency}
                    </span>
                    
                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
                      node.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" :
                      node.status === "FROZEN" ? "bg-blue-100 text-stone-950" :
                      node.status === "DEACTIVATED" ? "bg-rose-100 text-rose-800" :
                      "bg-amber-100 text-amber-800"
                    }`}>
                      {node.status === "ACTIVE" ? "فعال" :
                       node.status === "FROZEN" ? "منجمد" :
                       node.status === "DEACTIVATED" ? "غیرفعال" : "پیش‌نویس"}
                    </span>

                    {/* Quick Direct Actions on Row */}
                    <div className="flex items-center gap-1 mr-2 border-r border-[#e5ded0]/40 pr-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNodeId(node.id);
                          handleAddNewNode(true, node.id);
                        }}
                        className={`p-1 rounded-lg transition-all ${
                          isSelected ? "text-blue-100 hover:bg-stone-900 hover:text-white" : "text-stone-400 hover:bg-stone-100 hover:text-amber-600"
                        }`}
                        title="افزودن گره فرزند (زیرشاخه)"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(node.id);
                        }}
                        className={`p-1 rounded-lg transition-all ${
                          isSelected ? "text-rose-200 hover:bg-rose-700 hover:text-white" : "text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                        }`}
                        title="حذف گره و زیرشاخه‌ها"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Recursive render for children */}
              {hasChildren && isExpanded && (
                <div className="mr-4 transition-all">
                  {renderCbsTreeRows(node.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Recursive aggregation of budget for macro charts
  function getAggregatedBudget(nodeId: string, allNodes: CbsNode[]): number {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return 0;
    
    const children = allNodes.filter(n => n.parentId === nodeId);
    if (children.length === 0) return node.budget || 0;
    
    // In CBS, typically parent budget is either its own defined budget OR sum of children.
    // If children have budgets, sum them up.
    const childrenSum = children.reduce((sum, child) => sum + getAggregatedBudget(child.id, allNodes), 0);
    return childrenSum || node.budget || 0;
  }

  // Purge all CBS data for current project (mirroring handleClearWbsData in CbsContracts)
  const handlePurgeAllCbsData = () => {
    // 1. Clear nodes for this project
    const remainingNodes = nodes.filter(n => String(n.projectId).trim() !== String(projId).trim());
    setNodes(remainingNodes);
    setSelectedNodeId(null);

    localStorage.setItem("hamyar_cbs_nodes", JSON.stringify(remainingNodes));

    // 2. Clear estimates for this project in hamyar_estimates
    try {
      const storedEst = JSON.parse(localStorage.getItem('hamyar_estimates') || '[]');
      if (Array.isArray(storedEst)) {
        const cleanEst = storedEst.filter((e: any) => String(e.projectId || '').trim() !== String(projId).trim());
        localStorage.setItem('hamyar_estimates', JSON.stringify(cleanEst));
      }
    } catch (err) {}

    // 3. Clear cbsMapping in hamyar_cbs_contracts for this project
    try {
      const storedContracts = JSON.parse(localStorage.getItem('hamyar_cbs_contracts') || '[]');
      if (Array.isArray(storedContracts)) {
        const updatedContracts = storedContracts.map((c: any) => {
          if (String(c.projectId || '').trim() === String(projId).trim()) {
            return { ...c, cbsMapping: [] };
          }
          return c;
        });
        localStorage.setItem('hamyar_cbs_contracts', JSON.stringify(updatedContracts));
      }
    } catch (err) {}

    // 4. Clear hamyar_projects (cbsMapping, wbsScheduleMapping, priceLists)
    try {
      const storedProjs = JSON.parse(localStorage.getItem('hamyar_projects') || '[]');
      if (Array.isArray(storedProjs)) {
        const updatedProjs = storedProjs.map((p: any) => {
          if (String(p.id || '').trim() === String(projId).trim()) {
            return { ...p, cbsMapping: [], wbsScheduleMapping: [], priceLists: [] };
          }
          return p;
        });
        localStorage.setItem('hamyar_projects', JSON.stringify(updatedProjs));
      }
    } catch (err) {}

    // 5. Clear hamyar_planning_activities for this project
    try {
      const storedActs = JSON.parse(localStorage.getItem('hamyar_planning_activities') || '[]');
      if (Array.isArray(storedActs)) {
        const remainingActs = storedActs.filter((a: any) => String(a.projectId || '').trim() !== String(projId).trim());
        localStorage.setItem('hamyar_planning_activities', JSON.stringify(remainingActs));
      }
    } catch (err) {}

    // 6. Broadcast all events
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('cbs-nodes-updated', { detail: { projectId: projId } }));
    window.dispatchEvent(new CustomEvent('estimates-updated', { detail: { projectId: projId } }));
    window.dispatchEvent(new CustomEvent('cbs-contracts-updated', { detail: { projectId: projId } }));
    window.dispatchEvent(new CustomEvent('wbs-updated', { detail: { projectId: projId } }));
    window.dispatchEvent(new CustomEvent('planning-activities-updated', { detail: { projectId: projId } }));
    window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId: projId } }));

    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  // High-level Calculations
  const currentProjectNodes = nodes.filter(n => n.projectId === projId);
  const rootNodes = nodes.filter(n => n.projectId === projId && n.parentId === null);
  const totalWeightCoefficients = rootNodes.reduce((sum, n) => sum + n.weightPercent, 0);
  
  const rootNodesWithAggregated = rootNodes.map(rn => ({
    ...rn,
    aggregatedBudget: getAggregatedBudget(rn.id, nodes)
  }));
  
  const totalBudgetCalculated = rootNodesWithAggregated.reduce((sum, n) => sum + n.aggregatedBudget, 0);
  
  // Total proposed budget of project
  const originalBudgetBaseline = activeProjectObj?.initialBudget || 80000000000;
  const unallocatedBudget = originalBudgetBaseline - totalBudgetCalculated;

  // Pie chart weight data
  const pieData = rootNodes.map((n, i) => ({
    name: n.title,
    value: n.weightPercent,
    budget: n.budget
  }));

  const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6"];

  return (
    <div className="space-y-6 pb-12 text-right" dir="rtl">
      {/* LANDSCAPE PRINT VIEW CONTAINER */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #cbs-print-section, #cbs-print-section * {
            visibility: visible;
          }
          #cbs-print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            direction: rtl;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* HEADER SECTION */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-8 no-print">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-stone-900 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-2xl shadow-stone-500/20">
            <Layers size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">مهندسی ساختار شکست هزینه (CBS)</h2>
            <p className="text-stone-500 text-xs font-bold mt-1">مدیریت سلسله‌مراتبی اوزان، بودجه‌ریزی هوشمند و یکپارچه‌سازی با متره و برآورد</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isSystemAdmin && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                <FileSpreadsheet size={16} />
                بارگذاری فایل اکسل
              </button>

              {currentProjectNodes.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDialog({
                      isOpen: true,
                      title: 'تأیید حذف کامل ساختار شکست هزینه (CBS)',
                      message: 'آیا از حذف کامل اطلاعات جدول ساختار شکست هزینه (CBS) اطمینان دارید؟ تمامی ردیف‌ها از جدول و تمامی بخش‌های دفتر فنی (برآوردها و احجام) و کنترل و برنامه‌ریزی به صورت اتوماتیک پاکسازی خواهند شد.',
                      confirmText: 'بله، حذف اطلاعات جدول CBS',
                      cancelText: 'انصراف',
                      isDanger: true,
                      onConfirm: () => handlePurgeAllCbsData()
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Trash2 size={16} />
                  <span>حذف اطلاعات جدول CBS</span>
                </button>
              )}

              <button
                onClick={() => setIsRevisionModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-900 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                <History size={16} />
                بایگانی نسخه / Snapshot
              </button>
            </>
          )}
          <button
            onClick={handlePrintStructure}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-105 cursor-pointer"
          >
            <Printer size={18} />
            چاپ ساختار درختی
          </button>
        </div>
      </div>

      {/* ANALYTICS KPIs ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 no-print">
        {/* KPI 1: Active Tree Depth */}
        <div className="bg-white p-5 rounded-[2rem] border border-[#ece5d8] shadow-sm flex flex-col justify-between">
          <span className="text-stone-400 font-bold text-xs block">تعداد کل گره‌ها (محدوده نامحدود)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-stone-800">{currentProjectNodes.length}</span>
            <span className="text-[10px] text-stone-400 font-bold">بسته کاری</span>
          </div>
          <div className="mt-2 text-[9px] text-stone-400 font-semibold">بیشترین عمق ثبت‌شده: {Math.max(...currentProjectNodes.map(n => n.level), 0) + 1} سطح</div>
        </div>

        {/* KPI 2: Total Budget Baseline */}
        <div className="bg-white p-5 rounded-[2rem] border border-[#ece5d8] shadow-sm flex flex-col justify-between">
          <span className="text-stone-400 font-bold text-xs block">بودجه مبنای قرارداد</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-stone-800">{formatAmount(originalBudgetBaseline)}</span>
            <span className="text-[10px] text-stone-500 font-black">{activeCurrency}</span>
          </div>
          <div className="mt-2 text-[9px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 size={10} /> ۱۰۰٪ بودجه کل پروژه
          </div>
        </div>

        {/* KPI 3: Weight Sum Balance */}
        <div className="bg-white p-5 rounded-[2rem] border border-[#ece5d8] shadow-sm flex flex-col justify-between">
          <span className="text-stone-400 font-bold text-xs block">مجموع ضرایب وزن فیزیکی ریشه‌ها</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-2xl font-black ${Math.abs(totalWeightCoefficients - 100) < 0.01 ? "text-emerald-600" : "text-amber-500"}`}>
              {totalWeightCoefficients.toFixed(2)}٪
            </span>
            <span className="text-[10px] text-stone-400 font-bold">از ۱۰۰٪</span>
          </div>
          <div className="mt-2 text-[9px] font-bold">
            {Math.abs(totalWeightCoefficients - 100) < 0.01 ? (
              <span className="text-emerald-600 flex items-center gap-1">✔ تراز وزنی کامل است</span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">⚠ عدم تراز (نیاز به بازنگری)</span>
            )}
          </div>
        </div>

        {/* KPI 4: Budget Allocated */}
        <div className="bg-white p-5 rounded-[2rem] border border-[#ece5d8] shadow-sm flex flex-col justify-between">
          <span className="text-stone-400 font-bold text-xs block">بودجه تخصیص‌یافته در درخت</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-stone-800">{formatAmount(totalBudgetCalculated)}</span>
            <span className="text-[10px] text-stone-400 font-bold">{activeCurrency}</span>
          </div>
          <div className="mt-2 text-[9px] text-amber-600 font-bold">
            {((totalBudgetCalculated / originalBudgetBaseline) * 100).toFixed(1)}٪ کل بودجه
          </div>
        </div>

        {/* KPI 5: Unallocated Buffer */}
        <div className="bg-white p-5 rounded-[2rem] border border-[#ece5d8] shadow-sm flex flex-col justify-between">
          <span className="text-stone-400 font-bold text-xs block">بودجه آزاد تخصیص‌نیافته</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-2xl font-black ${unallocatedBudget < 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {formatAmount(unallocatedBudget)}
            </span>
            <span className="text-[10px] text-stone-400 font-bold">{activeCurrency}</span>
          </div>
          <div className="mt-2 text-[9px] font-bold">
            {unallocatedBudget === 0 ? (
              <span className="text-emerald-600">توزیع مالی بدون باقیمانده</span>
            ) : unallocatedBudget < 0 ? (
              <span className="text-rose-600">بیش‌تخصیص (سرریز مالی!)</span>
            ) : (
              <span className="text-stone-400">ذخیره احتیاطی آزاد</span>
            )}
          </div>
        </div>
      </div>

      {/* DASHBOARD CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* Chart 1: Weight Distribution */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#ece5d8] shadow-sm flex flex-col items-center justify-between gap-6 overflow-hidden">
          <div className="w-full flex items-center justify-between border-b border-stone-50 pb-4">
            <div className="text-right">
              <h3 className="font-black text-stone-800 text-sm flex items-center gap-2">
                <Layers className="text-amber-600" size={18} />
                توزیع درصدی وزن فیزیکی ریشه‌های CBS
              </h3>
              <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                اثرگذاری فیزیکی بسته‌های کلان کاری روی کل پروژه
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-black text-stone-900">{totalWeightCoefficients.toFixed(2)}٪</span>
              <span className="text-[8px] text-stone-400 font-black uppercase tracking-tighter">TOTAL WEIGHT</span>
            </div>
          </div>

          <div className="w-full flex flex-col md:flex-row items-center gap-8">
            <div className="w-48 h-48 shrink-0 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: "بدون اطلاعات", value: 100 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ fontWeight: '900', fontSize: '11px' }}
                    formatter={(value) => `${value}%`} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center pointer-events-none">
                <span className="text-xs font-black text-stone-400">ساختار</span>
                <span className="text-xl font-black text-stone-900">CBS</span>
              </div>
            </div>
            
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 content-start max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {rootNodes.map((rn, idx) => (
                <div key={rn.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-[#faf8f4] transition-colors border border-transparent hover:border-[#ece5d8]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-stone-700 truncate">{rn.title}</span>
                    <span className="text-[9px] text-stone-400 font-bold">{rn.code}</span>
                  </div>
                  <span className="text-[11px] text-amber-600 mr-auto font-black tabular-nums">{rn.weightPercent}%</span>
                </div>
              ))}
              {rootNodes.length === 0 && (
                <div className="col-span-2 text-center py-8 opacity-40">
                  <Info className="mx-auto mb-1" size={24} />
                  <p className="text-[10px] font-bold">هیچ ردیف ریشه‌ای یافت نشد</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart 2: Budget Distribution per Macro Root Node */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#ece5d8] shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-stone-800 text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.4)]"></span>
                  توزیع بودجه تخصیص‌یافته کلان
                </h3>
                <p className="text-[10px] text-stone-400 font-bold mt-0.5">تفکیک بسته‌های اصلی بر اساس میلیارد تومان</p>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/60 px-2.5 py-1 rounded-full font-black">
                {rootNodesWithAggregated.length} بسته کاری کلان
              </span>
            </div>
            
            <div className="space-y-2.5 my-2 max-h-56 overflow-y-auto pr-1.5 pl-0.5 custom-scrollbar">
              {rootNodesWithAggregated.map((r, index) => {
                const percentOfTotal = totalBudgetCalculated > 0 
                  ? ((r.aggregatedBudget / totalBudgetCalculated) * 100).toFixed(1) 
                  : "0";
                const color = COLORS[index % COLORS.length];
                return (
                  <div key={r.id} className="space-y-1.5 bg-[#faf8f4] p-3 rounded-2xl border border-[#ece5d8]/80 hover:border-amber-400/40 transition-all">
                    {/* Item Title and Details Row ABOVE the Bar */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="px-2 py-0.5 bg-stone-200/80 text-stone-800 rounded-md font-mono text-[11px] font-black shrink-0">
                          {r.code}
                        </span>
                        <span className="text-stone-800 font-bold truncate text-[11px]" title={r.title}>
                          {r.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                        <span className="text-stone-900 font-black">
                          {(r.aggregatedBudget / 1000000000).toLocaleString('fa-IR')} میلیارد {activeCurrency}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-black text-[10px]">
                          {percentOfTotal}٪
                        </span>
                      </div>
                    </div>
                    {/* Horizontal Bar under the Title */}
                    <div className="w-full h-2.5 bg-stone-200/60 rounded-full overflow-hidden p-0.5">
                      <div 
                        className="h-full rounded-full transition-all duration-500 shadow-sm" 
                        style={{ 
                          width: `${Math.max(Number(percentOfTotal), 1.5)}%`, 
                          backgroundColor: color 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-400">مجموع بودجه ریشه‌ها:</span>
            <span className="text-sm font-black text-stone-800">{formatAmount(totalBudgetCalculated)} {activeCurrency}</span>
          </div>
        </div>
      </div>

      {/* WORKING TREE & PANEL VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* RIGHT: TREE DESIGNER PANEL (7 COLS) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#ece5d8] shadow-sm flex flex-col min-h-[600px]">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece5d8] pb-4 mb-4">
            <h3 className="font-black text-stone-800 text-sm flex items-center gap-2">
              📂 ساختار درختی و کدهای سلسله‌مراتبی CBS
            </h3>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={expandAll}
                className="p-1.5 bg-[#faf8f4] hover:bg-stone-100 text-stone-600 text-[10px] font-black rounded-lg transition-all"
              >
                ➕ بازکردن همه
              </button>
              <button 
                onClick={collapseAll}
                className="p-1.5 bg-[#faf8f4] hover:bg-stone-100 text-stone-600 text-[10px] font-black rounded-lg transition-all"
              >
                ➖ بستن همه
              </button>
              {isSystemAdmin && (
                <button 
                  onClick={() => handleAddNewNode(false)}
                  className="px-2.5 py-1.5 bg-stone-50 text-stone-900 hover:bg-blue-100 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} />
                  افزودن گره ریشه
                </button>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 bg-[#faf8f4] p-3 rounded-2xl border border-[#ece5d8]">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 text-stone-400" size={14} />
              <input
                type="text"
                placeholder="جستجو در عنوان یا کد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 bg-white border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-stone-500">
              <span className="shrink-0">وضعیت:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-white border border-[#e5ded0] rounded-xl px-2 py-1.5 text-[11px] font-bold"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="ACTIVE">فعال</option>
                <option value="DRAFT">پیش‌نویس</option>
                <option value="FROZEN">منجمد (مبنا)</option>
                <option value="DEACTIVATED">غیرفعال</option>
              </select>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-stone-500">
              <span className="shrink-0">سطح:</span>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full bg-white border border-[#e5ded0] rounded-xl px-2 py-1.5 text-[11px] font-bold"
              >
                <option value="ALL">همه سطوح سلسله‌مراتب</option>
                <option value="0">سطح ۰ (ریشه‌ها)</option>
                <option value="1">سطح ۱ (زیرمجموعه‌ها)</option>
                <option value="2">سطح ۲ (بسته‌های کاری)</option>
              </select>
            </div>
          </div>

          {/* Tree Scroll Area */}
          <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 space-y-1">
            {renderCbsTreeRows(null)}
          </div>
        </div>

        {/* LEFT: NODE EDITING PANEL & DETAILS (5 COLS) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#ece5d8] shadow-sm flex flex-col min-h-[600px]">
          {selectedNodeId && selectedNode ? (
            <div className="space-y-4">
              {/* Node Title Header */}
              <div className="border-b border-[#ece5d8] pb-3 flex justify-between items-start gap-2">
                <div>
                  <span className="text-[10px] font-black font-mono bg-stone-50 text-amber-600 px-2 py-0.5 rounded-md">
                    CBS: {selectedNode.code}
                  </span>
                  <h3 className="font-black text-stone-800 text-sm mt-1.5">
                    {selectedNode.title}
                  </h3>
                </div>
                <div className="flex gap-1 shrink-0">
                  {isSystemAdmin && (
                    <>
                      <button 
                        onClick={() => handleShiftNodeOrder("UP")}
                        className="p-1.5 hover:bg-stone-100 text-stone-500 rounded-lg transition-all cursor-pointer"
                        title="انتقال به بالا"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button 
                        onClick={() => handleShiftNodeOrder("DOWN")}
                        className="p-1.5 hover:bg-stone-100 text-stone-500 rounded-lg transition-all cursor-pointer"
                        title="انتقال به پایین"
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button 
                        onClick={() => handleAddNewNode(true)}
                        className="p-1.5 bg-stone-50 hover:bg-blue-100 text-amber-600 rounded-lg transition-all cursor-pointer"
                        title="افزودن گره فرزند (زیرشاخه)"
                      >
                        <Plus size={15} />
                      </button>
                      <button 
                        onClick={() => handleDeleteNode(selectedNode.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                        title="حذف گره"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Details Content (ویژگی‌ها) */}
              <div className="space-y-3.5 mt-2">
                {formError && <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-100">{formError}</div>}
                {formSuccess && <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100">{formSuccess}</div>}

                {/* Display Aggregated Budget for Selected Node */}
                <div className="p-4 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-2xl flex items-center justify-between text-xs font-bold text-stone-800">
                  <span className="text-stone-500">بودجه کل مصوب این ردیف (تجمیعی):</span>
                  <span className="font-black text-amber-700 font-mono text-sm">
                    {formatAmount(getAggregatedBudget(selectedNode.id, nodes))} {activeCurrency}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block">کد ساختار شکست (CBS)</label>
                    <input
                      type="text"
                      disabled={!isSystemAdmin}
                      value={editForm.code || ""}
                      onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                      className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-xl text-xs font-bold text-stone-800 focus:outline-none disabled:bg-stone-100 disabled:text-stone-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block">عنوان بسته کاری/گره</label>
                    <input
                      type="text"
                      disabled={!isSystemAdmin}
                      value={editForm.title || ""}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-xl text-xs font-bold text-stone-800 focus:outline-none disabled:bg-stone-100 disabled:text-stone-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-stone-500 font-bold block">شرح عملیات تفصیلی</label>
                  <textarea
                    rows={2}
                    disabled={!isSystemAdmin}
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-xl text-xs font-bold text-stone-800 focus:outline-none resize-none disabled:bg-stone-100 disabled:text-stone-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block">واحد اندازه‌گیری (UOM)</label>
                    <input
                      type="text"
                      disabled={!isSystemAdmin}
                      value={editForm.unit || ""}
                      onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                      className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-xl text-xs font-bold text-stone-800 disabled:bg-stone-100 disabled:text-stone-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block">مقدار برآورد</label>
                    <input
                      type="text"
                      disabled={!isSystemAdmin}
                      value={editForm.quantity ? new Intl.NumberFormat('en-US').format(editForm.quantity) : '0'}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/,/g, '');
                        const val = clean === '' ? 0 : Number(clean);
                        if (!isNaN(val)) {
                          setEditForm({ ...editForm, quantity: val });
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-xl text-xs font-bold text-stone-800 focus:outline-none ltr text-left disabled:bg-stone-100 disabled:text-stone-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block">بهای واحد اولیه ({activeCurrency})</label>
                    <input
                      type="text"
                      disabled={!isSystemAdmin}
                      value={editForm.unitPrice ? new Intl.NumberFormat('en-US').format(editForm.unitPrice) : '0'}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/,/g, '');
                        const val = clean === '' ? 0 : Number(clean);
                        if (!isNaN(val)) {
                          setEditForm({ ...editForm, unitPrice: val });
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-xl text-xs font-bold text-stone-800 focus:outline-none ltr text-left disabled:bg-stone-100 disabled:text-stone-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block">ضریب وزن فیزیکی (٪ Weight)</label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!isSystemAdmin}
                      value={editForm.weightPercent || 0}
                      onChange={(e) => setEditForm({ ...editForm, weightPercent: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-xl text-xs font-bold text-stone-800 disabled:bg-stone-100 disabled:text-stone-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block">وضعیت آیتم در سیستم</label>
                    <select
                      disabled={!isSystemAdmin}
                      value={editForm.status || "DRAFT"}
                      onChange={(e: any) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-xl text-xs font-bold text-stone-800 disabled:bg-stone-100 disabled:text-stone-500"
                    >
                      <option value="DRAFT">پیش‌نویس (Draft)</option>
                      <option value="ACTIVE">فعال جهت اجرا (Active)</option>
                      <option value="DEACTIVATED">غیرفعال موقت (Deactivated)</option>
                      <option value="FROZEN">منجمد (Frozen Baseline)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block">مسئول پیگیری / بسته کاری</label>
                    <input
                      type="text"
                      disabled={!isSystemAdmin}
                      value={editForm.responsibleUser || ""}
                      onChange={(e) => setEditForm({ ...editForm, responsibleUser: e.target.value })}
                      className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e5ded0]/60 rounded-xl text-xs font-bold text-stone-800 disabled:bg-stone-100 disabled:text-stone-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block">والد مستقیم (تعیین خودکار بر اساس کد)</label>
                    <div className="w-full px-3 py-2 bg-stone-100 border border-[#e5ded0] rounded-xl text-[11px] font-bold text-stone-500 flex items-center justify-between">
                      <span>
                        {editForm.code?.includes('.') 
                          ? (nodes.find(n => n.code === editForm.code?.split('.').slice(0, -1).join('.'))?.title || 'شناسایی نشد')
                          : 'گره ریشه (بدون والد)'}
                      </span>
                      <Info size={14} className="text-stone-400" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#ece5d8] flex gap-2">
                  {isSystemAdmin ? (
                    <button
                      onClick={handleSaveNode}
                      className="flex-1 py-3 bg-amber-600 hover:bg-stone-900 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Save size={14} />
                      ثبت ویژگی‌ها و محاسبات مالی CBS
                    </button>
                  ) : (
                    <div className="flex-1 py-3 bg-stone-100 border border-stone-200 text-stone-500 font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                      <Lock size={14} className="text-amber-600" />
                      ساختار شکست قفل است (ویرایش اختصاصی مدیر کل سیستم)
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    بستن پنل
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-10 text-stone-400">
              <Layers size={48} className="text-stone-200 mb-4 animate-pulse" />
              <h4 className="font-black text-sm text-stone-700">هیچ گره‌ای انتخاب نشده است</h4>
              <p className="text-[11px] text-stone-400 mt-2 max-w-xs leading-relaxed">
                لطفاً جهت تعریف جزییات، ویژگی‌ها و محاسبات مالی، یکی از ردیف‌های ساختار درختی را انتخاب نمایید.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DIRECT PRINT WINDOW (HIDDEN BY DEFAULT, VISIBLE ONLY FOR PRINT MEDIA) */}
      <div id="cbs-print-section" className="hidden print:block p-6 bg-white text-right space-y-4">
        {/* Standard Form Header Frame */}
        <div className="border-2 border-slate-900 rounded-md overflow-hidden">
          <div className="grid grid-cols-12 divide-x divide-x-reverse divide-slate-900 items-center p-3">
            <div className="col-span-3 text-right text-xs space-y-1">
              <div>
                <span className="font-bold text-slate-500 block text-[9px]">دستگاه اجرایی / کارفرما:</span>
                <span className="font-black text-slate-900 block text-[10px]">{activeProjectObj?.employerName || "کارفرمای پروژه"}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 block text-[9px]">مهندس مشاور / دستگاه نظارت:</span>
                <span className="font-black text-slate-900 block text-[10px]">{activeProjectObj?.consultantName || "مهندسین مشاور پروژه"}</span>
              </div>
            </div>
            <div className="col-span-6 text-center">
              <h1 className="text-base font-black text-slate-900 tracking-tight">فرم استاندارد ساختار شکست هزینه (CBS)</h1>
              <span className="text-xs font-bold text-blue-600 block mt-0.5">{projectTitle}</span>
            </div>
            <div className="col-span-3 text-left text-[10px] font-bold text-slate-700 space-y-0.5">
              <div>کد پروژه: <span className="font-mono">{activeProjectObj?.contractNumber || "PRJ-002"}</span></div>
              <div>تاریخ گزارش: <span>{new Date().toLocaleDateString("fa-IR")}</span></div>
              <div>نسخه: <span>Rev-1.0</span></div>
            </div>
          </div>
        </div>

        {/* Project Metadata Table */}
        <table className="w-full text-right text-[10px] border-collapse border border-slate-300">
          <tbody>
            <tr>
              <td className="bg-slate-100 font-bold text-slate-600 p-2 border border-slate-300 w-1/6">نام پروژه:</td>
              <td className="font-black text-slate-900 p-2 border border-slate-300 w-2/6">{projectTitle}</td>
              <td className="bg-slate-100 font-bold text-slate-600 p-2 border border-slate-300 w-1/6">شماره قرارداد:</td>
              <td className="font-mono font-bold text-slate-900 p-2 border border-slate-300 w-2/6">{activeProjectObj?.contractNumber || "PRJ-002"}</td>
            </tr>
            <tr>
              <td className="bg-slate-100 font-bold text-slate-600 p-2 border border-slate-300">دستگاه کارفرمایی:</td>
              <td className="font-bold text-slate-900 p-2 border border-slate-300">{activeProjectObj?.employerName || "دستگاه کارفرمایی"}</td>
              <td className="bg-slate-100 font-bold text-slate-600 p-2 border border-slate-300">مهندس مشاور / نظارت:</td>
              <td className="font-bold text-slate-900 p-2 border border-slate-300">{activeProjectObj?.consultantName || "مهندسین مشاور پروژه"}</td>
            </tr>
            <tr>
              <td className="bg-slate-100 font-bold text-slate-600 p-2 border border-slate-300">پیمانکار اصلی:</td>
              <td className="font-bold text-slate-900 p-2 border border-slate-300">{activeProjectObj?.contractorName || "پیمانکار عمومی"}</td>
              <td className="bg-slate-100 font-bold text-slate-600 p-2 border border-slate-300">مبلغ کل برآورد:</td>
              <td className="font-mono font-bold text-slate-900 p-2 border border-slate-300">{totalBudgetCalculated.toLocaleString("fa-IR")} تومان</td>
            </tr>
          </tbody>
        </table>

        {/* CBS Data Table */}
        <div className="space-y-1">
          <div className="grid grid-cols-12 bg-slate-900 text-white p-2.5 rounded-t-md font-black text-[11px]">
            <span className="col-span-2 font-mono">کد CBS</span>
            <span className="col-span-4">شرح بسته کاری / فعالیت</span>
            <span className="col-span-2 text-center">واحد</span>
            <span className="col-span-2 text-left">وزن (%)</span>
            <span className="col-span-2 text-left">بودجه (تومان)</span>
          </div>

          {nodes.sort((a,b) => a.code.localeCompare(b.code)).map(node => (
            <div 
              key={node.id} 
              className={`grid grid-cols-12 p-2 text-xs font-bold border-b border-slate-200 text-slate-800 ${node.level === 0 ? 'bg-slate-50 font-black' : ''}`}
              style={{ paddingRight: `${node.level * 16 + 8}px` }}
            >
              <span className="col-span-2 font-mono">{node.code}</span>
              <span className="col-span-4">{node.title}</span>
              <span className="col-span-2 text-center text-slate-500">{node.unit || "-"}</span>
              <span className="col-span-2 text-left font-mono">{node.weightPercent}%</span>
              <span className="col-span-2 text-left font-mono">{getAggregatedBudget(node.id, nodes).toLocaleString("fa-IR")}</span>
            </div>
          ))}
        </div>

        {/* Official Signatures */}
        <div className="pt-6 grid grid-cols-3 gap-4 text-center text-[10px] font-bold">
          <div className="border border-slate-300 rounded p-2 bg-slate-50">
            <div className="font-black text-slate-900 mb-2 pb-1 border-b border-slate-200">پیمانکار (تنظیم‌کننده)</div>
            <div className="h-16 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400">محل امضاء و مهر</div>
          </div>
          <div className="border border-slate-300 rounded p-2 bg-slate-50">
            <div className="font-black text-slate-900 mb-2 pb-1 border-b border-slate-200">مهندس مشاور (تاییدکننده)</div>
            <div className="h-16 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400">محل امضاء و مهر</div>
          </div>
          <div className="border border-slate-300 rounded p-2 bg-slate-50">
            <div className="font-black text-slate-900 mb-2 pb-1 border-b border-slate-200">کارفرما (تصویب‌کننده)</div>
            <div className="h-16 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400">محل امضاء و مهر</div>
          </div>
        </div>
      </div>

      {/* IMPORT EXCEL DIALOG MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)}></div>
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-6 bg-[#faf8f4] border-b border-[#ece5d8] flex justify-between items-center">
              <h3 className="font-black text-stone-800 text-sm flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" size={18} />
                بارگذاری ساختار شکست تفصیلی CBS از فایل اکسل (Excel)
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="p-1 hover:bg-stone-200 rounded-full text-stone-400 hover:text-stone-700">
                <EyeOff size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-100 leading-relaxed">
                💡 ساختار ورودی فایل اکسل شما باید مطابق فرمت دانلود شده قالب باشد. سیستم به طور هوشمند روابط درختی را بر اساس کدهای سلسله‌مراتبی مانند <code className="bg-white/80 px-1 py-0.5 rounded font-mono">01</code> و <code className="bg-white/80 px-1 py-0.5 rounded font-mono">01.01</code> پیوند می‌دهد.
              </div>

              <div 
                onClick={() => importFileRef.current?.click()}
                className="border-2 border-dashed border-[#e5ded0] hover:border-emerald-500 rounded-2xl p-6 text-center bg-[#faf8f4]/50 hover:bg-emerald-50/10 cursor-pointer transition-all space-y-2"
              >
                <Upload className="mx-auto text-stone-400" size={32} />
                {excelFile ? (
                  <p className="text-xs text-emerald-600 font-bold">فایل انتخاب شده: {excelFile.name}</p>
                ) : (
                  <p className="text-xs text-stone-600 font-bold">جهت انتخاب فایل اکسل، کلیک کنید یا فایل را اینجا رها کنید</p>
                )}
                <p className="text-[10px] text-stone-400 font-medium">فرمت‌های مجاز: .xlsx, .xls</p>
              </div>

              <input 
                type="file" 
                ref={importFileRef} 
                onChange={handleRealExcelUpload} 
                className="hidden" 
                accept=".xlsx, .xls"
              />

              {/* Import Preview Table */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-stone-400 font-bold block">پیش‌نمایش ردیف‌های کشف شده جهت ورود:</span>
                  <div className="border border-[#ece5d8] rounded-xl overflow-hidden max-h-[320px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-right text-[10px]">
                      <thead className="bg-stone-100 text-stone-700 font-black">
                        <tr>
                          <th className="p-2 font-mono">CBS Code</th>
                          <th className="p-2">عنوان فعالیت</th>
                          <th className="p-2 text-center">واحد</th>
                          <th className="p-2 text-center">مقدار</th>
                          <th className="p-2 text-left">وزن ٪</th>
                          <th className="p-2 text-left">بودجه (تومان)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-stone-600 font-bold">
                        {importPreview.map((row, i) => (
                          <tr key={i}>
                            <td className="p-2 font-mono">{row.code}</td>
                            <td className="p-2">{row.title}</td>
                            <td className="p-2 text-center text-stone-500">{row.unit || 'پروژه'}</td>
                            <td className="p-2 text-center text-stone-500">{row.quantity !== undefined ? row.quantity.toLocaleString('fa-IR') : '۱'}</td>
                            <td className="p-2 text-left">{row.weightPercent}%</td>
                            <td className="p-2 text-left">{row.budget.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col gap-1.5 bg-emerald-50/60 p-3 border border-emerald-100 rounded-2xl text-[10px] font-black text-emerald-800">
                    <div className="flex justify-between items-center">
                      <span>مجموع درصد وزنی فعالیت‌ها (فقط ردیف‌های اصلی/ریشه):</span>
                      <span>{calculateImportRootWeightsSum(importPreview).toFixed(2)}٪</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-emerald-200/50 pt-1.5">
                      <span>مجموع برآورد هزینه مبنا (فقط ردیف‌های اصلی/ریشه):</span>
                      <span>{calculateImportRootBudgetSum(importPreview).toLocaleString()} تومان</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#faf8f4] border-t border-[#ece5d8] flex justify-end gap-2">
              <button
                onClick={handleApplyImportedRows}
                disabled={importPreview.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                تایید نهایی و الحاق به درخت CBS پروژه
              </button>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVISION HISTORY DIALOG MODAL */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsRevisionModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-6 bg-[#faf8f4] border-b border-[#ece5d8] flex justify-between items-center">
              <h3 className="font-black text-stone-800 text-sm flex items-center gap-2">
                <History className="text-amber-600" size={18} />
                ثبت و بایگانی تاریخچه تجدیدنظر ساختار شکست (CBS Revision)
              </h3>
              <button onClick={() => setIsRevisionModalOpen(false)} className="p-1 hover:bg-stone-200 rounded-full text-stone-400">
                <EyeOff size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-500 font-bold block">شماره متمم / نسخه تجدیدنظر</label>
                  <input
                    type="text"
                    value={revVersion}
                    onChange={(e) => setRevVersion(e.target.value)}
                    className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800"
                    placeholder="مثال: V1.1"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-500 font-bold block">صادرکننده / تصویب‌کننده</label>
                  <input
                    type="text"
                    disabled
                    value="Mostafa.nasrollahnejad (کارشناس مسئول)"
                    className="w-full px-3 py-2 bg-stone-100 border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-500 font-bold block">شرح ابلاغیه تغییرات / علل تجدیدنظر</label>
                <textarea
                  rows={2}
                  value={revComment}
                  onChange={(e) => setRevComment(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e5ded0] rounded-xl text-xs font-bold text-stone-800 resize-none focus:outline-none"
                  placeholder="مثال: اعمال نقشه جدید دیسیپلین برق مصوب مشاور..."
                />
              </div>

              <div className="border-t border-[#ece5d8] pt-3 space-y-2">
                <span className="text-[10px] text-stone-400 font-black block">لیست نسخه‌های متمم قبلی مصوب:</span>
                <div className="space-y-2 max-h-[160px] overflow-y-auto">
                  {revisions.map((rev) => (
                    <div key={rev.id} className="flex items-center justify-between p-3 bg-[#faf8f4] rounded-2xl border border-[#ece5d8] text-xs font-bold">
                      <div className="space-y-0.5">
                        <span className="font-black text-stone-800">نسخه {rev.version} (مورخ {rev.date})</span>
                        <p className="text-[10px] text-stone-400 font-semibold">{rev.changes}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-stone-500 font-mono">تعداد: {rev.nodeCount} ردیف</span>
                        <button
                          onClick={() => handleRestoreRevision(rev)}
                          className="px-2.5 py-1 bg-stone-50 text-stone-900 hover:bg-blue-100 text-[10px] rounded-lg transition-colors cursor-pointer"
                        >
                          🔄 بازیابی نسخه
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#faf8f4] border-t border-[#ece5d8] flex justify-end gap-2">
              <button
                onClick={handleCreateRevision}
                className="px-5 py-2.5 bg-amber-600 hover:bg-stone-900 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                ثبت و ایجاد Snapshot نسخه جدید
              </button>
              <button
                onClick={() => setIsRevisionModalOpen(false)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm animate-fadeIn" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}></div>
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-scaleIn border border-[#ece5d8]">
            <div className="p-5 bg-[#faf8f4] border-b border-[#ece5d8] flex items-center gap-3">
              <span className={`p-2 rounded-xl flex items-center justify-center ${confirmDialog.isDanger ? 'bg-rose-50 text-rose-600' : 'bg-stone-50 text-amber-600'}`}>
                {confirmDialog.isDanger ? <Trash2 size={18} /> : <Info size={18} />}
              </span>
              <h3 className="font-black text-stone-800 text-sm">
                {confirmDialog.title}
              </h3>
            </div>

            <div className="p-6">
              <p className="text-xs text-stone-600 font-bold leading-relaxed text-right">
                {confirmDialog.message}
              </p>
            </div>

            <div className="p-4 bg-[#faf8f4] border-t border-[#ece5d8] flex justify-end gap-2">
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2.5 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all ${
                  confirmDialog.isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-stone-900'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
              {confirmDialog.cancelText && (
                <button
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl"
                >
                  {confirmDialog.cancelText}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
