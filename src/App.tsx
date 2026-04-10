/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Plus, 
  Trash2, 
  Settings2, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  X,
  Zap,
  Play,
  Cpu,
  GitBranch,
  Repeat,
  ArrowRight,
  Maximize2,
  MoveHorizontal,
  MoreHorizontal,
  Map as MapIcon,
  Minus,
  Maximize,
  Download,
  Upload,
  Save,
  FilePlus,
  Send,
  GripHorizontal,
  Moon,
  Sun,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  MinusCircle,
  Split,
  Terminal,
  Variable
} from 'lucide-react';
import { BaseNode } from './components/nodes/BaseNode';
import { ConditionNode } from './components/nodes/ConditionNode';
import { ForEachNode } from './components/nodes/ForEachNode';
import { SwitchNode } from './components/nodes/SwitchNode';
import { AddButton as NodeAddButton } from './components/nodes/AddButton';
import { ConfigPanel } from './components/ConfigPanel';
import { motion, AnimatePresence } from 'motion/react';
import { WorkflowNode, Workflow, NodeType, TriggerType, ActionType, RunAfterCondition } from './types';
import { TRIGGER_TYPES, ACTION_TYPES, AI_AGENT_TYPES, NODE_ICONS } from './constants';

export default function App() {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Parameters');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [modalContext, setModalContext] = useState<{ 
    parentId: string | null; 
    prompt?: string; 
    pathId?: string; 
    pendingType?: NodeType;
  } | null>(null);

  const [isChangingTrigger, setIsChangingTrigger] = useState(false);
  const [changingNodeId, setChangingNodeId] = useState<string | null>(null);
  const [nodeMenuId, setNodeMenuId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<{ parentId: string | null; prompt?: string; pathId?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [expandedRunAfter, setExpandedRunAfter] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Zoom and Pan state
  const [zoom, setZoom] = useState(0.6);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showMinimap, setShowMinimap] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const migrateWorkflow = (data: any): Workflow => {
    if (!data) return {};
    
    // 1. Handle old tree structure (a single node with children/branches/paths)
    if (data.id && data.type && !data.start) {
      const flatMap: Workflow = {};
      const traverse = (node: any) => {
        if (!node || !node.id) return;
        const nodeType = node.type === 'ai-agent' ? 'agent' : node.type;
        const typeInfo = nodeType === 'trigger' 
          ? TRIGGER_TYPES.find(t => t.id === node.triggerKey)
          : nodeType === 'action' 
            ? ACTION_TYPES.find(a => a.id === node.actionKey)
            : null;
            
        const codeView = node.code_view || typeInfo?.code_view;
        let parameters = node.parameters || {};
        
        if (codeView) {
          if (!parameters.inputs) {
            parameters = { inputs: { ...parameters } };
          }
        } else if (parameters.inputs) {
          parameters = { ...parameters, ...parameters.inputs };
          delete parameters.inputs;
        }

        const newNode: WorkflowNode = {
          id: node.id,
          type: nodeType,
          label: node.label,
          to: [],
          triggerKey: node.triggerKey,
          actionKey: node.actionKey,
          prompt: node.prompt,
          skills: node.skills,
          markdown: node.markdown,
          customPosition: node.customPosition,
          size: node.size,
          code_view: codeView,
          parameters
        };

        // Handle children (sequential)
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach((child: any) => {
            newNode.to.push({ id: child.id });
            traverse(child);
          });
        }

        // Handle branches (condition)
        if (node.branches) {
          if (node.branches.true) {
            newNode.to.push({ id: node.branches.true.id, prompt: 'True' });
            traverse(node.branches.true);
          }
          if (node.branches.false) {
            newNode.to.push({ id: node.branches.false.id, prompt: 'False' });
            traverse(node.branches.false);
          }
        }

        // Handle paths (agent)
        if (node.paths && Array.isArray(node.paths)) {
          newNode.paths = node.paths.map((path: any) => {
            if (path.node) {
              traverse(path.node);
              return { id: path.id || uuidv4(), label: path.label, nodeId: path.node.id };
            }
            return { id: path.id || uuidv4(), label: path.label, nodeId: path.nodeId };
          });
        }

        // Handle loopBody (foreach)
        if (node.loopBody && Array.isArray(node.loopBody)) {
          node.loopBody.forEach((child: any) => {
            newNode.to.push({ id: child.id, prompt: 'loop' });
            traverse(child);
          });
        }

        flatMap[node.id] = newNode;
      };

      traverse(data);
      
      // Ensure 'start' node exists
      if (!flatMap['start'] && data.id) {
        const rootId = data.id;
        const rootNode = flatMap[rootId];
        if (rootNode) {
          delete flatMap[rootId];
          rootNode.id = 'start';
          flatMap['start'] = rootNode;
          
          Object.values(flatMap).forEach(n => {
            n.to.forEach(c => {
              if (c.id === rootId) c.id = 'start';
            });
          });
        }
      }
      return flatMap;
    }

    // 2. Handle flat map structure (Record<string, WorkflowNode>)
    if (typeof data === 'object' && !Array.isArray(data)) {
      const migrated: Workflow = {};
      Object.keys(data).forEach(id => {
        const node = data[id];
        if (!node || typeof node !== 'object' || !node.type) return;

        const nodeType = node.type === 'ai-agent' ? 'agent' : node.type;
        
        const typeInfo = nodeType === 'trigger' 
          ? TRIGGER_TYPES.find(t => t.id === node.triggerKey)
          : nodeType === 'action' 
            ? ACTION_TYPES.find(a => a.id === node.actionKey)
            : null;
            
        const codeView = node.code_view || typeInfo?.code_view;
        let parameters = node.parameters || {};
        
        if (codeView) {
          if (!parameters.inputs) {
            parameters = { inputs: { ...parameters } };
          }
        } else if (parameters.inputs) {
          parameters = { ...parameters, ...parameters.inputs };
          delete parameters.inputs;
        }

        migrated[id] = {
          ...node,
          id: node.id || id,
          type: nodeType,
          to: node.to || [],
          code_view: codeView,
          parameters
        };
        
        if ((nodeType === 'agent' || nodeType === 'trigger') && (!node.paths || node.paths.length === 0)) {
          migrated[id].paths = nodeType === 'trigger' 
            ? [{ id: uuidv4(), label: 'Path 1' }]
            : [{ id: uuidv4(), label: 'Path 1' }, { id: uuidv4(), label: 'Path 2' }];
        }
      });
      return migrated;
    }

    return data;
  };

  useEffect(() => {
    const saved = localStorage.getItem('saved_workflow');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWorkflow(migrateWorkflow(parsed));
      } catch (err) {
        console.error("Failed to load saved workflow", err);
      }
    }
  }, []);

  const downloadWorkflow = () => {
    if (!workflow) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workflow, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "workflow.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const uploadWorkflow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        setWorkflow(migrateWorkflow(parsed));
      } catch (err) {
        alert("Failed to parse workflow file.");
      }
    };
    reader.readAsText(file);
  };

  const saveWorkflow = () => {
    if (!workflow) return;
    localStorage.setItem('saved_workflow', JSON.stringify(workflow));
    alert("Workflow saved to local storage!");
  };

  const createNewWorkflow = () => {
    if (workflow && !confirm("Are you sure you want to create a new workflow? Unsaved changes will be lost.")) {
      return;
    }
    setWorkflow(null);
    setSelectedNodeId(null);
  };

  const publishWorkflow = () => {
    if (!workflow) return;
    alert("Workflow published successfully!");
  };
  
  const handleConnectToNode = (targetId: string) => {
    if (!connectingFrom || !workflow) return;
    
    const { parentId, prompt, pathId } = connectingFrom;
    const updatedWorkflow = { ...workflow };
    
    if (updatedWorkflow[parentId!]) {
      const parent = updatedWorkflow[parentId!];
      if (pathId && parent.paths) {
        const path = parent.paths.find(p => p.id === pathId);
        if (path) {
          path.nodeId = targetId;
        }
      } else {
        if (!parent.to) parent.to = [];
        if (!parent.to.some(c => c.id === targetId)) {
          parent.to.push({ id: targetId, prompt });
        }
      }
    }
    
    setWorkflow(updatedWorkflow);
    setConnectingFrom(null);
    setSelectedNodeId(null);
  };

  const jumpConnections = useMemo(() => {
    if (!workflow) return [];
    const connections: { fromId: string, toId: string, prompt?: string }[] = [];
    
    Object.values(workflow).forEach(node => {
      node.to?.forEach(conn => {
        // Filter out connections that are already rendered in the tree structure
        const isSequential = !conn.prompt;
        const isConditionBranch = (conn.prompt === 'True' || conn.prompt === 'False') && node.type === 'condition';
        const isLoopBody = conn.prompt === 'loop' && node.type === 'foreach';
        const isAgentPath = (node.type === 'agent' || node.type === 'trigger') && node.paths?.some(p => p.nodeId === conn.id);

        if (!isSequential && !isConditionBranch && !isLoopBody && !isAgentPath) {
          connections.push({ fromId: node.id, toId: conn.id, prompt: conn.prompt });
        }
      });
    });
    
    return connections;
  }, [workflow]);

  const JumpConnections = () => {
    const [coords, setCoords] = useState<{ from: { x: number, y: number }, to: { x: number, y: number } }[]>([]);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
      const updateCoords = () => {
        const newCoords = jumpConnections.map(conn => {
          const fromEl = nodeRefs.current[conn.fromId];
          const toEl = nodeRefs.current[conn.toId];
          const svg = svgRef.current;
          
          if (!fromEl || !toEl || !svg) return null;
          
          const fromRect = fromEl.getBoundingClientRect();
          const toRect = toEl.getBoundingClientRect();
          const svgRect = svg.getBoundingClientRect();
          
          return {
            from: {
              x: (fromRect.left + fromRect.width / 2 - svgRect.left) / zoom,
              y: (fromRect.top + fromRect.height / 2 - svgRect.top) / zoom
            },
            to: {
              x: (toRect.left + toRect.width / 2 - svgRect.left) / zoom,
              y: (toRect.top + toRect.height / 2 - svgRect.top) / zoom
            }
          };
        }).filter(Boolean) as { from: { x: number, y: number }, to: { x: number, y: number } }[];
        
        setCoords(newCoords);
      };

      updateCoords();
      window.addEventListener('resize', updateCoords);
      // We also need to update when position or zoom changes because getBoundingClientRect is absolute
      // and the SVG moves/scales.
      const timer = setTimeout(updateCoords, 100); // Small delay to ensure DOM is ready
      return () => {
        window.removeEventListener('resize', updateCoords);
        clearTimeout(timer);
      };
    }, [jumpConnections, zoom, position, workflow]);

    return (
      <svg 
        ref={svgRef}
        className="absolute inset-0 pointer-events-none overflow-visible" 
        style={{ zIndex: 0 }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
        </defs>
        {coords.map((c, i) => {
          const dx = c.to.x - c.from.x;
          const dy = c.to.y - c.from.y;
          const dr = Math.sqrt(dx * dx + dy * dy);
          
          const path = `M ${c.from.x} ${c.from.y} A ${dr} ${dr} 0 0 1 ${c.to.x} ${c.to.y}`;
          
          return (
            <motion.path
              key={i}
              d={path}
              stroke="#3b82f6"
              strokeWidth="3"
              fill="none"
              strokeDasharray="8 8"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          );
        })}
      </svg>
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left mouse button
    if (e.button !== 0) return;

    // Don't drag if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, select, [role="button"]')) {
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      
      const zoomSpeed = 0.001;
      const delta = -e.deltaY * zoomSpeed;
      const newZoom = Math.min(Math.max(zoom + delta, 0.2), 2);
      
      if (newZoom !== zoom) {
        // Zoom towards cursor logic
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          // Calculate the point in the canvas coordinate system
          const canvasMouseX = (mouseX - position.x - rect.width / 2) / zoom;
          const canvasMouseY = (mouseY - position.y - rect.height * 0.1) / zoom;
          
          // Calculate new position to keep the point under the cursor
          const newPosX = mouseX - (canvasMouseX * newZoom) - rect.width / 2;
          const newPosY = mouseY - (canvasMouseY * newZoom) - rect.height * 0.1;
          
          setZoom(newZoom);
          setPosition({ x: newPosX, y: newPosY });
        }
      }
    }
  }, [zoom, position]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);
 
  useEffect(() => {
    if (selectedNodeId) {
      setActiveTab('Parameters');
    }
  }, [selectedNodeId]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !workflow) return null;
    return workflow[selectedNodeId] || null;
  }, [workflow, selectedNodeId]);

  const getPrecedingNodes = useCallback((nodeId: string) => {
    if (!workflow) return [];
    return Object.values(workflow).filter(n => 
      n.to?.some(c => c.id === nodeId) || 
      n.paths?.some(p => p.nodeId === nodeId)
    );
  }, [workflow]);

  const isEligibleForRunAfter = useCallback((nodeId: string, customWorkflow?: Workflow) => {
    const targetWorkflow = customWorkflow || workflow;
    const node = targetWorkflow?.[nodeId];
    if (!node) return false;
    
    const eligibleTypes = ['action', 'condition', 'agent', 'switch'];
    if (!eligibleTypes.includes(node.type)) return false;

    // Check branch restrictions
    const checkBranchRestrictions = (id: string): boolean => {
      let foundParent: WorkflowNode | null = null;
      let isBranchPath = false;
      
      // We only restrict the IMMEDIATE first node of a branch (True/False or Switch Case)
      Object.values(targetWorkflow!).forEach(n => {
        // Check paths (Switch, Agent)
        if (n.paths?.some(p => p.nodeId === id)) {
          foundParent = n;
          isBranchPath = true;
        } 
        // Check 'to' connections (Condition branches)
        else {
          const connection = n.to?.find(c => c.id === id);
          if (connection) {
            foundParent = n;
            if (connection.prompt) {
              isBranchPath = true;
            }
          }
        }
      });
      
      if (foundParent) {
        // If this node is the direct start of a branch from a Condition or Switch, restrict it
        if (isBranchPath && (foundParent.type === 'condition' || foundParent.type === 'switch')) {
          return true;
        }
      }
      return false;
    };

    if (checkBranchRestrictions(nodeId)) return false;

    return true;
  }, [workflow]);

  const updateRunAfter = (nodeId: string, precedingId: string, conditions: RunAfterCondition[]) => {
    if (!workflow) return;
    const updatedWorkflow = { ...workflow };
    const node = updatedWorkflow[nodeId];
    if (node) {
      if (!node.runAfter) node.runAfter = {};
      if (conditions.length === 0) {
        delete node.runAfter[precedingId];
      } else {
        node.runAfter[precedingId] = conditions;
      }
      setWorkflow(updatedWorkflow);
    }
  };
  const addNode = (type: NodeType, subType?: string, overrideContext?: any) => {
    const context = overrideContext || modalContext;
    const nodeId = uuidv4();
    
    const getLabel = (type: NodeType, subType?: string) => {
      let baseLabel = '';
      if (type === 'trigger' && subType) {
        baseLabel = TRIGGER_TYPES.find(t => t.id === subType)?.label || type.toUpperCase();
      } else if (type === 'action' && subType) {
        baseLabel = ACTION_TYPES.find(a => a.id === subType)?.label || type.toUpperCase();
      } else if (type === 'agent') {
        baseLabel = 'AI AGENT';
      } else if (type === 'wait') {
        baseLabel = 'WAIT';
      } else if (type === 'condition') {
        baseLabel = 'CONDITION';
      } else if (type === 'foreach') {
        baseLabel = 'FOREACH';
      } else if (type === 'switch') {
        baseLabel = 'SWITCH';
      } else {
        baseLabel = type.toUpperCase();
      }

      if (!workflow) return baseLabel;

      // Find all existing labels that match the base label pattern
      // Exclude the node being changed if we are in change mode
      const existingLabels = Object.entries(workflow)
        .filter(([id]) => {
          if (isChangingTrigger && id === 'start') return false;
          if (changingNodeId && id === changingNodeId) return false;
          return true;
        })
        .map(([, n]) => n.label);
      
      // Check if the base label itself exists or if versions exist
      const sameBaseLabels = existingLabels.filter(l => 
        l === baseLabel || l.startsWith(`${baseLabel} v`)
      );

      if (sameBaseLabels.length === 0) return baseLabel;

      // Find the highest version number
      let maxVersion = 1;
      sameBaseLabels.forEach(label => {
        if (label === baseLabel) {
          maxVersion = Math.max(maxVersion, 1);
        } else {
          const match = label.match(new RegExp(`^${baseLabel} v(\\d+)$`));
          if (match) {
            maxVersion = Math.max(maxVersion, parseInt(match[1]));
          }
        }
      });

      // If the base label exists but no versioned ones, the first one was effectively v1
      // The user wants v1, v2, v3...
      // If we want the first one to be "Name v1", we need to handle that.
      // But usually people prefer "Name" then "Name v2".
      // Let's stick to the user's request: "v1 v2 or v3"
      
      return `${baseLabel} v${maxVersion + 1}`;
    };

    if (changingNodeId && workflow) {
      const updatedWorkflow = { ...workflow };
      if (updatedWorkflow[changingNodeId]) {
        const node = updatedWorkflow[changingNodeId];
        updatedWorkflow[changingNodeId] = {
          ...node,
          type,
          label: getLabel(type, subType),
        };
        
        // Clean up old specific keys
        delete updatedWorkflow[changingNodeId].triggerKey;
        delete updatedWorkflow[changingNodeId].actionKey;
        delete updatedWorkflow[changingNodeId].prompt;
        delete updatedWorkflow[changingNodeId].skills;
        
        if (type === 'trigger') updatedWorkflow[changingNodeId].triggerKey = subType;
        if (type === 'action') updatedWorkflow[changingNodeId].actionKey = subType;
        
        const typeInfo = type === 'trigger' 
          ? TRIGGER_TYPES.find(t => t.id === subType)
          : ACTION_TYPES.find(a => a.id === subType);

        if (typeInfo) {
          updatedWorkflow[changingNodeId].code_view = typeInfo.code_view;
        }

        // Initialize parameters
        if (typeInfo?.parameters) {
          const params: Record<string, any> = {};
          typeInfo.parameters.forEach((p: any) => {
            if (p.type === 'keyvalue') {
              params[p.id] = [{ key: '', value: '' }];
            } else {
              params[p.id] = '';
            }
          });

          if (typeInfo.code_view) {
            updatedWorkflow[changingNodeId].parameters = { inputs: params };
          } else {
            updatedWorkflow[changingNodeId].parameters = params;
          }
        }

        if (type === 'trigger' || type === 'agent') {
          updatedWorkflow[changingNodeId].paths = type === 'trigger'
            ? [{ id: uuidv4(), label: 'Path 1' }]
            : [{ id: uuidv4(), label: 'Path 1' }, { id: uuidv4(), label: 'Path 2' }];
        }
      }
      setWorkflow(updatedWorkflow);
      setChangingNodeId(null);
      setIsChangingTrigger(false);
      setIsModalOpen(false);
      return;
    }

    if (isChangingTrigger && workflow) {
      const updatedWorkflow = { ...workflow };
      if (updatedWorkflow['start']) {
        const node = updatedWorkflow['start'];
        node.type = type;
        node.triggerKey = subType;
        node.label = getLabel(type, subType);
        
        // Initialize parameters
        const typeInfo = TRIGGER_TYPES.find(t => t.id === subType);
        if (typeInfo) {
          node.code_view = typeInfo.code_view;
        }
        if (typeInfo?.parameters) {
          const params: Record<string, any> = {};
          typeInfo.parameters.forEach((p: any) => {
            if (p.type === 'keyvalue') {
              params[p.id] = [{ key: '', value: '' }];
            } else {
              params[p.id] = '';
            }
          });

          if (typeInfo.code_view) {
            node.parameters = { inputs: params };
          } else {
            node.parameters = params;
          }
        }

        if (!node.paths || node.paths.length === 0) {
          node.paths = [{ id: uuidv4(), label: 'Path 1' }];
        }
      }
      setWorkflow(updatedWorkflow);
      setIsChangingTrigger(false);
      setIsModalOpen(false);
      return;
    }

    const newNode: WorkflowNode = {
      id: nodeId,
      type,
      label: getLabel(type, subType),
      to: [],
    };

    if (type === 'action') {
      newNode.actionKey = subType;
      const typeInfo = ACTION_TYPES.find(a => a.id === subType);
      if (typeInfo) {
        newNode.code_view = typeInfo.code_view;
      }
      if (typeInfo?.parameters) {
        const params: Record<string, any> = {};
        typeInfo.parameters.forEach((p: any) => {
          if (p.type === 'keyvalue') {
            params[p.id] = [{ key: '', value: '' }];
          } else {
            params[p.id] = '';
          }
        });

        if (typeInfo.code_view) {
          newNode.parameters = { inputs: params };
        } else {
          newNode.parameters = params;
        }
      }
    } else if (type === 'agent' || type === 'trigger' || type === 'switch') {
      if (type === 'agent') {
        newNode.prompt = "You're a helpful AI agent...";
        newNode.skills = {};
        newNode.paths = [
          { id: uuidv4(), label: 'Path 1' },
          { id: uuidv4(), label: 'Path 2' }
        ];
      } else if (type === 'switch') {
        newNode.paths = [
          { id: uuidv4(), label: 'Case 1' },
          { id: uuidv4(), label: 'Default' }
        ];
      } else {
        newNode.paths = [
          { id: uuidv4(), label: 'Path 1' }
        ];
        if (type === 'trigger') {
          newNode.triggerKey = subType;
          const typeInfo = TRIGGER_TYPES.find(t => t.id === subType);
          if (typeInfo) {
            newNode.code_view = typeInfo.code_view;
          }
          if (typeInfo?.parameters) {
            const params: Record<string, any> = {};
            typeInfo.parameters.forEach((p: any) => {
              if (p.type === 'keyvalue') {
                params[p.id] = [{ key: '', value: '' }];
              } else {
                params[p.id] = '';
              }
            });

            if (typeInfo.code_view) {
              newNode.parameters = { inputs: params };
            } else {
              newNode.parameters = params;
            }
          }
        }
      }
    }

    if (!workflow) {
      setWorkflow({ start: { ...newNode, id: 'start', type: 'trigger' } });
    } else if (context) {
      const { parentId, prompt, pathId } = context;
      const updatedWorkflow = { ...workflow };
      updatedWorkflow[nodeId] = newNode;
      
      if (updatedWorkflow[parentId!]) {
        const parent = { ...updatedWorkflow[parentId!] };
        if (pathId && parent.paths) {
          parent.paths = parent.paths.map(p => 
            p.id === pathId ? { ...p, nodeId } : p
          );
        } else {
          parent.to = [...parent.to, { id: nodeId, prompt }];
        }
        updatedWorkflow[parentId!] = parent;

        // Initialize runAfter for the new node with 'success' from its parent
        if (isEligibleForRunAfter(nodeId, updatedWorkflow)) {
          newNode.runAfter = { [parentId!]: ['success'] };
        }
      }
      
      setWorkflow(updatedWorkflow);
    }

    setIsModalOpen(false);
    setModalContext(null);
  };

  const deleteNode = (id: string) => {
    if (!workflow) return;

    const updatedWorkflow = { ...workflow };
    delete updatedWorkflow[id];
    
    // Remove references to this node in other nodes' 'to' arrays or 'paths'
    Object.values(updatedWorkflow).forEach(node => {
      node.to = node.to.filter(c => c.id !== id);
      if (node.paths) {
        node.paths.forEach(p => {
          if (p.nodeId === id) delete p.nodeId;
        });
      }
    });

    if (id === 'start' || Object.keys(updatedWorkflow).length === 0) {
      setWorkflow(null);
    } else {
      setWorkflow(updatedWorkflow);
    }
    setSelectedNodeId(null);
  };

  const moveNode = (id: string, direction: 'up' | 'down') => {
    if (!workflow) return;
    const updatedWorkflow = { ...workflow };
    
    // Find parent of this node
    const parent = Object.values(updatedWorkflow).find(n => n.to.some(c => c.id === id));
    if (parent) {
      const index = parent.to.findIndex(c => c.id === id);
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < parent.to.length) {
        const [moved] = parent.to.splice(index, 1);
        parent.to.splice(newIndex, 0, moved);
        setWorkflow(updatedWorkflow);
      }
    }
  };

  const renderNode = (node: WorkflowNode, options: { isFirst?: boolean; hideLabel?: boolean; parentId?: string | null; prompt?: string; pathId?: string } = {}) => {
    if (!workflow || !node) return null;
    const { isFirst = false, hideLabel = false, parentId = null, prompt = undefined, pathId = undefined } = options;
    
    const isSelected = selectedNodeId === node.id;

    const nodeProps = {
      node,
      isSelected,
      connectingFrom,
      handleConnectToNode,
      setSelectedNodeId,
      setNodeMenuId,
      nodeMenuId,
      deleteNode,
      setChangingNodeId,
      setIsChangingTrigger,
      setModalContext,
      setIsModalOpen,
      workflow,
      renderNode,
      nodeRefs,
      activePopoverId,
      isDarkMode,
      setWorkflow,
      AddButton: (props: any) => (
        <NodeAddButton 
          {...props} 
          activePopoverId={activePopoverId}
          setActivePopoverId={setActivePopoverId}
          setModalContext={setModalContext}
          setIsModalOpen={setIsModalOpen}
          addNode={addNode}
        />
      )
    };

    const isAnyChildPopoverOpen = activePopoverId?.includes(node.id);

    return (
      <div 
        key={node.id} 
        ref={el => { 
          if (el) nodeRefs.current[node.id] = el;
          else delete nodeRefs.current[node.id];
        }}
        className={`flex flex-col items-center relative ${isAnyChildPopoverOpen ? 'z-50' : ''}`}
      >
        {/* Connection Line from above */}
        {!isFirst && !hideLabel && (
          <div className="flex flex-col items-center group/connection relative">
            <div className="h-20 connection-line-v" />
          </div>
        )}

        {isFirst && !hideLabel && (
          <div className="flex flex-col items-center mb-4">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Starts when</div>
          </div>
        )}

        {hideLabel && <div className="h-10 connection-line-v" />}

        {/* Node Card */}
        {node.type === 'condition' ? (
          <ConditionNode {...nodeProps} />
        ) : node.type === 'foreach' ? (
          <ForEachNode {...nodeProps} />
        ) : node.type === 'switch' ? (
          <SwitchNode {...nodeProps} />
        ) : (
          <BaseNode {...nodeProps} />
        )}

        {/* Agent/Trigger Paths */}
        {(node.type === 'agent' || node.type === 'trigger') && (
          <div className="flex flex-col items-center">
            <div className="h-10 connection-line-v" />
            <div className="flex justify-center relative group/paths">
              {(node.paths || []).map((path, idx) => {
                const pathNode = path.nodeId ? workflow[path.nodeId] : undefined;
                return (
                  <div key={path.id} className={`flex flex-col items-center relative transition-all min-w-[20rem] px-8 ${activePopoverId?.includes(path.id) ? 'z-[60]' : 'z-10 hover:z-40'}`}>
                    {/* Horizontal Line Segments to connect paths */}
                    {(node.paths || []).length > 1 && (
                      <div className="absolute top-0 left-0 right-0 flex">
                        <div className={`flex-1 border-t-2 border-slate-200 dark:border-slate-800 ${idx === 0 ? 'opacity-0' : ''}`} />
                        <div className={`flex-1 border-t-2 border-slate-200 dark:border-slate-800 ${idx === (node.paths || []).length - 1 ? 'opacity-0' : ''}`} />
                      </div>
                    )}
                    
                    <div className="h-10 connection-line-v opacity-50" />
                    <div className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-full shadow-sm">
                      {path.label}
                    </div>
                    {pathNode ? renderNode(pathNode, { isFirst: true, hideLabel: true, parentId: node.id, pathId: path.id }) : (
                      <nodeProps.AddButton parentId={node.id} pathId={path.id} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sequential Children */}
        {node.type !== 'agent' && node.type !== 'trigger' && node.to?.filter(c => !c.prompt).map(c => workflow[c.id]).filter(Boolean).map((child: any) => 
          renderNode(child, { parentId: node.id })
        )}

        {/* Add Button for sequential flow */}
        {node.type !== 'agent' && node.type !== 'trigger' && node.to?.filter(c => !c.prompt).length === 0 && (
          <nodeProps.AddButton parentId={node.id} />
        )}
      </div>
    );
  };

  const MinimapNode = ({ node }: { node: WorkflowNode }) => {
    if (!workflow) return null;
    const colorClass = node.type === 'trigger' ? 'bg-emerald-500' : 
                      node.type === 'condition' ? 'bg-indigo-500' :
                      node.type === 'switch' ? 'bg-indigo-500' :
                      node.type === 'foreach' ? 'bg-amber-500' :
                      node.type === 'agent' ? 'bg-fuchsia-500' :
                      node.type === 'wait' ? 'bg-amber-500' : 'bg-slate-400';

    const children = node.to?.filter(c => !c.prompt).map(c => workflow[c.id]).filter(Boolean) as WorkflowNode[];
    const trueBranch = node.to?.filter(c => c.prompt === 'True').map(c => workflow[c.id]).filter(Boolean) as WorkflowNode[];
    const falseBranch = node.to?.filter(c => c.prompt === 'False').map(c => workflow[c.id]).filter(Boolean) as WorkflowNode[];
    const loopBody = node.to?.filter(c => c.prompt === 'loop').map(c => workflow[c.id]).filter(Boolean) as WorkflowNode[];
    const switchPaths = (node.type === 'switch') ? node.paths?.map(p => p.nodeId ? workflow[p.nodeId] : null).filter(Boolean) as WorkflowNode[] : [];
    const agentPaths = (node.type === 'agent' || node.type === 'trigger') ? node.paths?.map(p => p.nodeId ? workflow[p.nodeId] : null).filter(Boolean) as WorkflowNode[] : [];

    return (
      <div className="flex flex-col items-center">
        <div className={`w-40 h-16 rounded-[10px] ${colorClass} shadow-sm mb-4`} />
        
        {node.type === 'condition' && (
          <div className="flex gap-12 mb-4">
            <div className="flex flex-col items-center">
              <div className="w-24 h-6 bg-emerald-500/20 border border-emerald-500/30 rounded-[10px] mb-2" />
              {trueBranch.map(child => <MinimapNode key={child.id} node={child} />)}
            </div>
            <div className="flex flex-col items-center">
              <div className="w-24 h-6 bg-rose-500/20 border border-rose-500/30 rounded-[10px] mb-2" />
              {falseBranch.map(child => <MinimapNode key={child.id} node={child} />)}
            </div>
          </div>
        )}

        {node.type === 'foreach' && (
          <div className="p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-[10px] mb-4 flex flex-col items-center">
            {loopBody.map(child => <MinimapNode key={child.id} node={child} />)}
          </div>
        )}

        {node.type === 'switch' && (
          <div className="flex gap-8 mb-4">
            {switchPaths.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-20 h-6 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[10px] mb-2" />
                <MinimapNode node={child} />
              </div>
            ))}
          </div>
        )}

        {(node.type === 'agent' || node.type === 'trigger') && (
          <div className="flex gap-8 mb-4">
            {agentPaths.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-20 h-6 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[10px] mb-2" />
                <MinimapNode node={child} />
              </div>
            ))}
          </div>
        )}

        {children.map(child => <MinimapNode key={child.id} node={child} />)}
      </div>
    );
  };

  const AddButton = ({ parentId, branch, pathId }: { 
    parentId: string | null; 
    branch?: 'true' | 'false' | 'loop'; 
    pathId?: string;
  }) => {
    const buttonId = `${parentId || 'root'}-${branch || 'main'}-${pathId || 'none'}`;
    const isOpen = activePopoverId === buttonId;

    const getPrompt = () => {
      if (branch === 'true') return 'True';
      if (branch === 'false') return 'False';
      if (branch === 'loop') return 'loop';
      return undefined;
    };

    return (
      <div className={`flex flex-col items-center relative ${isOpen ? 'z-[60]' : 'z-20'}`}>
        <div className="h-16 connection-line-v" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActivePopoverId(isOpen ? null : buttonId);
          }}
          className="w-8 h-8 flex-shrink-0 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-500 hover:border-blue-500 hover:scale-110 transition-all flex items-center justify-center shadow-sm group z-30"
        >
          <Plus size={16} className={`${isOpen ? 'rotate-45' : ''} transition-transform`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setActivePopoverId(null)} 
              />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-80 bg-white dark:bg-slate-900 rounded-[10px] shadow-2xl border border-slate-100 dark:border-slate-800 p-3 z-[100]"
              >
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      setModalContext({ parentId, prompt: getPrompt(), pathId, pendingType: 'action' });
                      setIsModalOpen(true);
                      setActivePopoverId(null);
                    }}
                    className="flex flex-col items-center gap-2 p-3 rounded-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group/item"
                  >
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[10px] group-hover/item:scale-110 transition-transform">
                      <Zap size={18} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Action</span>
                  </button>
                  <button 
                    onClick={() => {
                      addNode('condition', undefined, { parentId, prompt: getPrompt(), pathId });
                      setActivePopoverId(null);
                    }}
                    className="flex flex-col items-center gap-2 p-3 rounded-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group/item"
                  >
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[10px] group-hover/item:scale-110 transition-transform">
                      <GitBranch size={18} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Condition</span>
                  </button>
                  <button 
                    onClick={() => {
                      addNode('agent', undefined, { parentId, prompt: getPrompt(), pathId });
                      setActivePopoverId(null);
                    }}
                    className="flex flex-col items-center gap-2 p-3 rounded-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group/item"
                  >
                    <div className="p-2.5 bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 rounded-[10px] group-hover/item:scale-110 transition-transform">
                      <Cpu size={18} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">AI Agent</span>
                  </button>
                  <button 
                    onClick={() => {
                      addNode('wait', undefined, { parentId, prompt: getPrompt(), pathId });
                      setActivePopoverId(null);
                    }}
                    className="flex flex-col items-center gap-2 p-3 rounded-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group/item"
                  >
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-[10px] group-hover/item:scale-110 transition-transform">
                      <Clock size={18} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Wait</span>
                  </button>
                  <button 
                    onClick={() => {
                      addNode('foreach', undefined, { parentId, prompt: getPrompt(), pathId });
                      setActivePopoverId(null);
                    }}
                    className="flex flex-col items-center gap-2 p-3 rounded-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group/item"
                  >
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-[10px] group-hover/item:scale-110 transition-transform">
                      <Repeat size={18} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">For Each</span>
                  </button>
                  <button 
                    onClick={() => {
                      addNode('switch', undefined, { parentId, prompt: getPrompt(), pathId });
                      setActivePopoverId(null);
                    }}
                    className="flex flex-col items-center gap-2 p-3 rounded-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group/item"
                  >
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[10px] group-hover/item:scale-110 transition-transform">
                      <Split size={18} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Switch</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans relative transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      {/* Main Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative canvas-viewport cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${isDarkMode ? '#334155' : '#cbd5e1'} 1px, transparent 1px)`,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${position.x}px ${position.y}px`,
            opacity: isDarkMode ? 0.2 : 0.4
          }}
        />

        <div 
          className="absolute transition-transform duration-75 ease-out"
          style={{
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
            left: '50%',
            top: '50%',
            transformOrigin: 'center center'
          }}
        >
          {!workflow || !workflow['start'] ? (
            <div className="flex flex-col items-center justify-center text-center pointer-events-auto">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[10px] flex items-center justify-center mb-6 border border-indigo-100 dark:border-indigo-900/50">
                <Zap size={32} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 tracking-tight">Build your workflow</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs text-sm">Start by adding a trigger to define how your automation begins.</p>
              <button
                onClick={() => {
                  setModalContext({ parentId: null });
                  setIsModalOpen(true);
                }}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-[10px] text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
              >
                <Plus size={18} />
                Add Trigger
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center pointer-events-auto relative">
              <JumpConnections />
              {renderNode(workflow['start'], { isFirst: true })}
            </div>
          )}
        </div>

        {/* Zoom Controls Toolbar */}
        <div className="absolute bottom-8 left-8 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-1.5 flex items-center gap-1 z-50">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
          <button 
            onClick={() => {
              setZoom(0.6);
              setPosition({ x: 0, y: 0 });
            }}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 size={18} />
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
          <button 
            onClick={() => {
              setZoom(0.7);
              setPosition({ x: 0, y: 0 });
            }}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
            title="Fit to Screen"
          >
            <MoveHorizontal size={18} />
          </button>
          
          <div className="flex items-center gap-3 px-3">
            <input 
              type="range" 
              min="0.2" 
              max="2" 
              step="0.1" 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-600"
            />
            <span className="text-[11px] font-bold text-slate-400 w-8 text-center">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
          <button 
            onClick={() => setShowMinimap(!showMinimap)}
            className={`p-2 rounded-lg transition-colors ${showMinimap ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            title="Mini Map"
          >
            <MapIcon size={18} />
          </button>
        </div>

        {/* Mini Map Overlay */}
        <AnimatePresence>
          {showMinimap && workflow && (
            <motion.div
              drag
              dragMomentum={false}
              onMouseDown={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-24 left-8 w-64 h-40 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 p-2 cursor-move"
            >
              <div className="relative w-full h-full bg-slate-50/50 dark:bg-slate-800/50 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                {/* Simplified Workflow Preview */}
                <div className="absolute inset-0 flex flex-col items-center pt-4 scale-[0.15] origin-top">
                  <MinimapNode node={workflow['start']} />
                </div>
                
                {/* Viewport Indicator */}
                <div 
                  className="absolute border-2 border-blue-500 bg-blue-500/10 rounded pointer-events-none transition-all duration-75"
                  style={{
                    width: `${100 / zoom}%`,
                    height: `${100 / zoom}%`,
                    left: `${50 - (position.x / 10) / zoom}%`,
                    top: `${10 - (position.y / 10) / zoom}%`,
                    transform: 'translate(-50%, 0)'
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workflow Management Toolbar */}
        <motion.div 
          drag
          dragMomentum={false}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ x: '-50%' }}
          className="absolute bottom-8 left-1/2 bg-white dark:bg-slate-900 rounded-[10px] shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 flex items-center gap-1 z-50 cursor-default"
        >
          <div className="px-2 text-slate-300 dark:text-slate-700 cursor-grab active:cursor-grabbing">
            <GripHorizontal size={18} />
          </div>
          
          <div className="w-px h-6 bg-slate-100 dark:bg-slate-800 mx-1" />

          <button 
            onClick={createNewWorkflow}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 group"
            title="New Workflow"
          >
            <FilePlus size={16} className="group-hover:text-indigo-500" />
            <span className="text-[11px] font-bold pr-1">New</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 group"
            title="Upload JSON"
          >
            <Upload size={16} className="group-hover:text-indigo-500" />
            <span className="text-[11px] font-bold pr-1">Import</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={uploadWorkflow} 
              className="hidden" 
              accept=".json"
            />
          </button>

          <button 
            onClick={downloadWorkflow}
            disabled={!workflow}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 group disabled:opacity-30"
            title="Download JSON"
          >
            <Download size={16} className="group-hover:text-indigo-500" />
            <span className="text-[11px] font-bold pr-1">Export</span>
          </button>

          <div className="w-px h-6 bg-slate-100 dark:bg-slate-800 mx-1" />

          <button 
            onClick={saveWorkflow}
            disabled={!workflow}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 group disabled:opacity-30"
            title="Save Workflow"
          >
            <Save size={16} className="group-hover:text-indigo-500" />
            <span className="text-[11px] font-bold pr-1">Save</span>
          </button>

          <button 
            onClick={publishWorkflow}
            disabled={!workflow}
            className="px-4 py-2 bg-indigo-600 text-white rounded-[10px] font-bold text-[11px] hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-30"
          >
            <Send size={14} />
            Publish
          </button>
        </motion.div>
      </div>

      {/* Right Configuration Panel */}
      <AnimatePresence>
        <ConfigPanel 
          selectedNode={selectedNode}
          setSelectedNodeId={setSelectedNodeId}
          workflow={workflow}
          setWorkflow={setWorkflow}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isEligibleForRunAfter={isEligibleForRunAfter}
          expandedRunAfter={expandedRunAfter}
          setExpandedRunAfter={setExpandedRunAfter}
          getPrecedingNodes={getPrecedingNodes}
          expandedNodes={expandedNodes}
          setExpandedNodes={setExpandedNodes}
          updateRunAfter={updateRunAfter}
        />
      </AnimatePresence>

      {/* Node Selection Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setIsChangingTrigger(false);
                setChangingNodeId(null);
                setSearchQuery('');
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[10px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {!workflow || isChangingTrigger ? 'Choose a Trigger' : 'Choose an Action'}
                  </h2>
                  <button 
                    onClick={() => {
                      setIsModalOpen(false);
                      setIsChangingTrigger(false);
                      setChangingNodeId(null);
                      setSearchQuery('');
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search for triggers or actions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[10px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm shadow-sm placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto px-10 pb-10 space-y-8">
                {(!workflow || isChangingTrigger || (changingNodeId && workflow[changingNodeId]?.type === 'trigger')) ? (
                  // Group triggers by category
                  Object.entries(
                    TRIGGER_TYPES.reduce((acc, t) => {
                      if (searchQuery && !t.label.toLowerCase().includes(searchQuery.toLowerCase())) return acc;
                      const cat = t.category || 'Other';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(t);
                      return acc;
                    }, {} as Record<string, typeof TRIGGER_TYPES>)
                  ).map(([category, triggers]) => (
                    <div key={category} className="space-y-4">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{category}</span>
                        <ChevronUp size={16} className="text-slate-400" />
                      </div>
                      
                      <div className="space-y-2">
                        {triggers.map(t => (
                          <button
                            key={t.id}
                            onClick={() => {
                              addNode('trigger', t.id);
                              setSearchQuery('');
                            }}
                            className="flex items-center gap-4 w-full p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-teal-400/50 hover:bg-teal-50/30 transition-all text-left group"
                          >
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-teal-500 border border-slate-100 dark:border-slate-700 shadow-sm">
                              <t.icon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t.label}</h3>
                              {t.description && (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{t.description}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (modalContext?.pendingType === 'action' || (changingNodeId && workflow[changingNodeId]?.type === 'action')) ? (
                  // Group actions by category
                  Object.entries(
                    ACTION_TYPES.reduce((acc, a) => {
                      if (searchQuery && !a.label.toLowerCase().includes(searchQuery.toLowerCase())) return acc;
                      const cat = a.category || 'Other';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(a);
                      return acc;
                    }, {} as Record<string, typeof ACTION_TYPES>)
                  ).map(([category, actions]) => (
                    <div key={category} className="space-y-4">
                      <button 
                        onClick={() => {
                          setCollapsedCategories(prev => 
                            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
                          );
                        }}
                        className="flex items-center justify-between w-full text-lg font-bold text-slate-900 dark:text-slate-100 group"
                      >
                        <span>{category}</span>
                        <ChevronUp 
                          size={20} 
                          className={`text-slate-400 transition-transform duration-300 ${collapsedCategories.includes(category) ? 'rotate-180' : ''}`} 
                        />
                      </button>
                      
                      {!collapsedCategories.includes(category) && (
                        <div className="space-y-3">
                          {actions.map(a => (
                            <button
                              key={a.id}
                              onClick={() => {
                                addNode('action', a.id);
                                setSearchQuery('');
                              }}
                              className="flex items-center gap-5 w-full p-4 rounded-2xl border bg-slate-50/50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 hover:border-teal-400 hover:bg-teal-50/30 transition-all text-left group"
                            >
                              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <a.icon size={22} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{a.label}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">{a.description}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}