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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkflowNode, Workflow, NodeType, TriggerType, ActionType } from './types';
import { TRIGGER_TYPES, ACTION_TYPES, AI_AGENT_TYPES, NODE_ICONS } from './constants';

export default function App() {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [modalContext, setModalContext] = useState<{ 
    parentId: string | null; 
    prompt?: string; 
    pathId?: string; 
    pendingType?: NodeType;
    insertBetween?: { childId: string };
  } | null>(null);

  const [isChangingTrigger, setIsChangingTrigger] = useState(false);
  const [changingNodeId, setChangingNodeId] = useState<string | null>(null);
  const [nodeMenuId, setNodeMenuId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<{ parentId: string | null; prompt?: string; pathId?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);

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
    
    // If it's already a flat map (Record<string, WorkflowNode>)
    if (typeof data === 'object' && !Array.isArray(data) && (data.start || Object.keys(data).length > 0)) {
      const migrated: Workflow = {};
      Object.keys(data).forEach(id => {
        const node = data[id];
        migrated[id] = {
          ...node,
          type: node.type === 'ai-agent' ? 'agent' : node.type,
          to: node.to || []
        };
      });
      return migrated;
    }

    // If it's the old tree structure (a single node)
    if (data.id && data.type) {
      const flatMap: Workflow = {};
      const traverse = (node: any) => {
        const newNode: WorkflowNode = {
          id: node.id,
          type: node.type === 'ai-agent' ? 'agent' : node.type,
          label: node.label,
          to: [],
          triggerKey: node.triggerKey,
          actionKey: node.actionKey,
          prompt: node.prompt,
          skills: node.skills,
          markdown: node.markdown,
          customPosition: node.customPosition,
          size: node.size
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
        delete flatMap[rootId];
        rootNode.id = 'start';
        flatMap['start'] = rootNode;
        
        Object.values(flatMap).forEach(n => {
          n.to.forEach(c => {
            if (c.id === rootId) c.id = 'start';
          });
        });
      }
      return flatMap;
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
        if (path) path.nodeId = targetId;
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
        const isAgentPath = node.type === 'agent' && node.paths?.some(p => p.nodeId === conn.id);

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
 
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !workflow) return null;
    return workflow[selectedNodeId] || null;
  }, [workflow, selectedNodeId]);

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
      } else if (type === 'condition') {
        baseLabel = 'CONDITION';
      } else if (type === 'foreach') {
        baseLabel = 'FOREACH';
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
        if (type === 'agent') {
          updatedWorkflow[changingNodeId].paths = [
            { id: uuidv4(), label: 'Path 1' },
            { id: uuidv4(), label: 'Path 2' }
          ];
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
        updatedWorkflow['start'].type = type;
        updatedWorkflow['start'].triggerKey = subType;
        updatedWorkflow['start'].label = getLabel(type, subType);
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
    } else if (type === 'agent') {
      newNode.prompt = "You're a helpful AI agent...";
      newNode.skills = {};
      newNode.paths = [
        { id: uuidv4(), label: 'Path 1' },
        { id: uuidv4(), label: 'Path 2' }
      ];
    }

    if (!workflow) {
      setWorkflow({ start: { ...newNode, id: 'start', type: 'trigger' } });
    } else if (context) {
      const { parentId, prompt, pathId, insertBetween } = context;
      const updatedWorkflow = { ...workflow };
      updatedWorkflow[nodeId] = newNode;
      
      if (updatedWorkflow[parentId!]) {
        const parent = updatedWorkflow[parentId!];
        if (pathId && parent.paths) {
          const path = parent.paths.find(p => p.id === pathId);
          if (path) {
            if (insertBetween) {
              newNode.to = [{ id: insertBetween.childId }];
            }
            path.nodeId = nodeId;
          }
        } else {
          if (!parent.to) parent.to = [];
          if (insertBetween) {
            const connIdx = parent.to.findIndex(c => c.id === insertBetween.childId && (c.prompt === prompt || (!c.prompt && !prompt)));
            if (connIdx !== -1) {
              newNode.to = [{ id: insertBetween.childId }];
              parent.to[connIdx].id = nodeId;
            } else {
              // Fallback if connection not found
              parent.to.push({ id: nodeId, prompt });
            }
          } else {
            parent.to.push({ id: nodeId, prompt });
          }
        }
      }
      
      setWorkflow(updatedWorkflow);
    }

    setIsModalOpen(false);
    setModalContext(null);
  };

  const deleteNode = (id: string) => {
    if (!workflow) return;
    if (id === 'start') {
      setWorkflow(null);
      setSelectedNodeId(null);
      return;
    }

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

    setWorkflow(updatedWorkflow);
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
    if (!workflow) return null;
    const { isFirst = false, hideLabel = false, parentId = null, prompt = undefined, pathId = undefined } = options;
    const Icon = NODE_ICONS[node.type] || Play;
    const isSelected = selectedNodeId === node.id;

    const children = node.to?.filter(c => !c.prompt).map(c => workflow[c.id]).filter(Boolean) as WorkflowNode[];
    const trueBranch = node.to?.filter(c => c.prompt === 'True').map(c => workflow[c.id]).filter(Boolean) as WorkflowNode[];
    const falseBranch = node.to?.filter(c => c.prompt === 'False').map(c => workflow[c.id]).filter(Boolean) as WorkflowNode[];
    const loopBody = node.to?.filter(c => c.prompt === 'loop').map(c => workflow[c.id]).filter(Boolean) as WorkflowNode[];
    const agentPaths = node.paths?.map(p => ({
      ...p,
      node: p.nodeId ? workflow[p.nodeId] : undefined
    })) || [];

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
            
            {parentId && (
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/connection:opacity-100 transition-opacity z-30 group-hover/connection:z-50 ${activePopoverId?.includes(`-${node.id}`) ? 'opacity-100 z-[60]' : ''}`}>
                <AddButton 
                  parentId={parentId} 
                  branch={prompt === 'True' ? 'true' : prompt === 'False' ? 'false' : prompt === 'loop' ? 'loop' : undefined}
                  pathId={pathId}
                  insertBetween={{ childId: node.id }}
                  variant="insert"
                />
              </div>
            )}
          </div>
        )}

        {isFirst && !hideLabel && (
          <div className="flex flex-col items-center mb-4">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Starts when</div>
          </div>
        )}

        {hideLabel && <div className="h-10 connection-line-v" />}

        {/* Node Card */}
        {node.type !== 'foreach' && node.type !== 'condition' ? (
          <motion.div
            layoutId={node.id}
            onClick={(e) => {
              e.stopPropagation();
              if (connectingFrom) {
                if (node.type !== 'trigger') {
                  handleConnectToNode(node.id);
                }
                return;
              }
              setSelectedNodeId(node.id);
            }}
            className={`
              relative group flex items-center gap-5 p-4 rounded-[2rem] border-2 transition-all cursor-pointer w-80 bg-white dark:bg-slate-900 shadow-xl
              ${node.type === 'agent' ? 'ai-agent-gradient' : ''}
              ${isSelected 
                ? 'border-indigo-500 ring-4 ring-indigo-500/10' 
                : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}
              ${connectingFrom && node.type !== 'trigger' ? 'ring-4 ring-blue-500/50 border-blue-500 animate-pulse' : ''}
            `}
          >
            <div className={`p-3.5 rounded-2xl shadow-sm ${
              isSelected 
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                : node.type === 'trigger' 
                  ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                  : node.type === 'agent'
                    ? 'bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              <Icon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${
                node.type === 'trigger' ? 'text-teal-500' : 
                node.type === 'agent' ? 'text-fuchsia-500' : 
                'text-slate-400'
              }`}>{node.type === 'agent' ? 'AI-AGENT' : node.type}</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{node.label}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setNodeMenuId(nodeMenuId === node.id ? null : node.id);
                  }}
                  className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                  <MoreHorizontal size={18} />
                </button>
                
                <AnimatePresence>
                  {nodeMenuId === node.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setNodeMenuId(null); }} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-100 dark:border-slate-800 py-1 z-50 overflow-hidden"
                      >
                        {(node.type === 'trigger' || node.type === 'action') && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setChangingNodeId(node.id);
                              if (node.type === 'trigger') {
                                setIsChangingTrigger(true);
                              } else {
                                setModalContext({ parentId: null, pendingType: 'action' });
                              }
                              setIsModalOpen(true);
                              setNodeMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                          >
                            <Settings2 size={12} />
                            Change {node.type === 'trigger' ? 'Trigger' : 'Action'}
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNode(node.id);
                            setNodeMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={12} />
                          Delete Node
                        </button>

                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ) : node.type === 'foreach' ? (
          <motion.div
            layoutId={node.id}
            onClick={(e) => {
              e.stopPropagation();
              if (connectingFrom) {
                if (node.type !== 'trigger') {
                  handleConnectToNode(node.id);
                }
                return;
              }
              setSelectedNodeId(node.id);
            }}
            className={`
              relative group flex flex-col w-fit min-w-[32rem] rounded-[2.5rem] border-2 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-2xl
              ${isSelected ? 'border-amber-500 ring-4 ring-amber-500/10' : 'border-slate-100 dark:border-slate-800'}
              ${connectingFrom ? 'ring-4 ring-blue-500/50 border-blue-500 animate-pulse' : ''}
            `}
          >
            {/* Header Bar */}
            <div className="bg-amber-500 text-white px-8 py-5 flex items-center justify-between rounded-t-[2.4rem]">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm shadow-sm">
                  <Repeat size={22} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Loop</span>
                  <span className="text-base font-bold">For each item</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
                <div className="w-px h-6 bg-white/20 mx-1" />
                <ChevronUp size={20} className="opacity-60" />
              </div>
            </div>
            
            {/* Loop Body Container */}
            <div className="p-10 pt-8 bg-slate-50/30 dark:bg-slate-900/30 flex flex-col items-center relative backdrop-blur-sm">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-gradient-to-b from-amber-500/50 to-transparent" />
              
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-8 border border-amber-100 dark:border-amber-900/50">
                <Play size={10} fill="currentColor" />
                Loop Start
              </div>
              
              <div className={`w-fit min-w-full border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 rounded-[3rem] p-8 shadow-inner min-h-[200px] flex flex-col items-center relative transition-all ${activePopoverId?.includes(`${node.id}-loop`) ? 'z-[60]' : 'hover:z-40'}`}>
                {loopBody.map((child, idx) => renderNode(child, { isFirst: idx === 0, hideLabel: idx === 0, parentId: node.id, prompt: 'loop' }))}
                {(!loopBody || loopBody.length === 0) && (
                  <AddButton parentId={node.id} branch="loop" />
                )}
              </div>

              <div className="mt-8 inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200 dark:border-slate-700">
                Loop End
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center relative">
            {/* Condition Header Card */}
            <motion.div
              layoutId={node.id}
              onClick={(e) => {
                e.stopPropagation();
                if (connectingFrom) {
                  if (node.type !== 'trigger') {
                    handleConnectToNode(node.id);
                  }
                  return;
                }
                setSelectedNodeId(node.id);
              }}
              className={`
                relative z-30 flex items-center justify-between w-80 h-24 px-6 bg-white dark:bg-slate-900 rounded-[2rem] border-2 transition-all cursor-pointer shadow-2xl
                ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-100 dark:border-slate-800'}
                ${connectingFrom ? 'ring-4 ring-blue-500/50 border-blue-500 animate-pulse' : ''}
              `}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-sm">
                  <GitBranch size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-1">Condition</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100 truncate max-w-[180px]">{node.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <MoreHorizontal size={18} />
                </div>
              </div>
            </motion.div>

            {/* Main Container */}
            <div className="relative -mt-12 pt-28 pb-12 px-8 border border-slate-200 dark:border-slate-800 rounded-[4rem] bg-white dark:bg-slate-900/30 flex gap-12 w-fit min-w-[36rem] z-10 backdrop-blur-sm">
              
              {/* Curved SVG Lines */}
              <svg className="absolute top-0 left-0 w-full h-28 pointer-events-none overflow-visible">
                <path 
                  d={`M ${50}% 48 C ${50}% 80, ${25}% 80, ${25}% 112`} 
                  fill="none" 
                  stroke={isDarkMode ? '#3b82f6' : '#024bf7'} 
                  strokeWidth="2" 
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
                <path 
                  d={`M ${50}% 48 C ${50}% 80, ${75}% 80, ${75}% 112`} 
                  fill="none" 
                  stroke={isDarkMode ? '#3b82f6' : '#024bf7'} 
                  strokeWidth="2" 
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
              </svg>

              {/* True Branch */}
              <div className={`flex-1 flex flex-col items-center relative transition-all ${activePopoverId?.includes(`${node.id}-true`) ? 'z-[60]' : 'z-20 hover:z-40'}`}>
                <div className="bg-emerald-500 text-white px-10 py-3 rounded-full text-[12px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg shadow-emerald-500/20 mb-4 transform -translate-y-2">
                  True <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                </div>
                <div className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 rounded-[3rem] p-6 shadow-inner min-h-[200px] flex flex-col items-center">
                   {trueBranch.map((child, idx) => renderNode(child, { isFirst: idx === 0, hideLabel: idx === 0, parentId: node.id, prompt: 'True' }))}
                   {(!trueBranch || trueBranch.length === 0) && (
                     <AddButton parentId={node.id} branch="true" />
                   )}
                </div>
              </div>

              {/* False Branch */}
              <div className={`flex-1 flex flex-col items-center relative transition-all ${activePopoverId?.includes(`${node.id}-false`) ? 'z-[60]' : 'z-20 hover:z-40'}`}>
                <div className="bg-rose-500 text-white px-10 py-3 rounded-full text-[12px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg shadow-rose-500/20 mb-4 transform -translate-y-2">
                  False <div className="w-1.5 h-1.5 bg-white rounded-full opacity-60" />
                </div>
                <div className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 rounded-[3rem] p-6 shadow-inner min-h-[200px] flex flex-col items-center">
                   {falseBranch.map((child, idx) => renderNode(child, { isFirst: idx === 0, hideLabel: idx === 0, parentId: node.id, prompt: 'False' }))}
                   {(!falseBranch || falseBranch.length === 0) && (
                     <AddButton parentId={node.id} branch="false" />
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agent Paths */}
        {node.type === 'agent' && (
          <div className="flex flex-col items-center">
            <div className="h-10 connection-line-v" />
            <div className="flex justify-center relative">
              {agentPaths.map((path, idx) => (
                <div key={path.id} className={`flex flex-col items-center relative transition-all min-w-[20rem] px-8 ${activePopoverId?.includes(path.id) ? 'z-[60]' : 'z-10 hover:z-40'}`}>
                  {/* Horizontal Line Segments to connect paths */}
                  {agentPaths.length > 1 && (
                    <div className="absolute top-0 left-0 right-0 flex">
                      <div className={`flex-1 border-t-2 border-dashed border-[#024bf7] dark:border-[#3b82f6] ${idx === 0 ? 'opacity-0' : ''}`} />
                      <div className={`flex-1 border-t-2 border-dashed border-[#024bf7] dark:border-[#3b82f6] ${idx === agentPaths.length - 1 ? 'opacity-0' : ''}`} />
                    </div>
                  )}
                  
                  <div className="h-10 connection-line-v opacity-50" />
                  <div className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-full shadow-sm">
                    {path.label}
                  </div>
                  <div className="h-20 connection-line-v" />
                  {path.node ? renderNode(path.node, { isFirst: true, hideLabel: true, parentId: node.id, pathId: path.id }) : (
                    <AddButton parentId={node.id} pathId={path.id} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sequential Children */}
        {children.map((child, idx) => renderNode(child, { isFirst: false, parentId: node.id }))}
        
        {/* Add Button for next sequential node - only if this is the end of the chain */}
        {children.length === 0 && (
          <AddButton parentId={node.id} />
        )}
      </div>
    );
  };

  const MinimapNode = ({ node }: { node: WorkflowNode }) => {
    if (!workflow) return null;
    const colorClass = node.type === 'trigger' ? 'bg-indigo-500' : 
                      node.type === 'condition' ? 'bg-slate-700' :
                      node.type === 'foreach' ? 'bg-[#4a76a8]' :
                      node.type === 'agent' ? 'bg-pink-500' : 'bg-blue-500';

    const children = node.to?.filter(c => !c.prompt).map(c => workflow[c.id]).filter(Boolean) as WorkflowNode[];
    const trueBranch = node.to?.filter(c => c.prompt === 'True').map(c => workflow[c.id]).filter(Boolean) as WorkflowNode[];
    const falseBranch = node.to?.filter(c => c.prompt === 'False').map(c => workflow[c.id]).filter(Boolean) as WorkflowNode[];
    const loopBody = node.to?.filter(c => c.prompt === 'loop').map(c => workflow[c.id]).filter(Boolean) as WorkflowNode[];
    const agentPaths = node.paths?.map(p => p.nodeId ? workflow[p.nodeId] : null).filter(Boolean) as WorkflowNode[];

    return (
      <div className="flex flex-col items-center">
        <div className={`w-40 h-16 rounded-lg ${colorClass} shadow-sm mb-4`} />
        
        {node.type === 'condition' && (
          <div className="flex gap-20 mb-4">
            <div className="flex flex-col items-center">
              <div className="w-32 h-8 bg-green-500 rounded-md mb-2" />
              {trueBranch.map(child => <MinimapNode key={child.id} node={child} />)}
            </div>
            <div className="flex flex-col items-center">
              <div className="w-32 h-8 bg-red-500 rounded-md mb-2" />
              {falseBranch.map(child => <MinimapNode key={child.id} node={child} />)}
            </div>
          </div>
        )}

        {node.type === 'foreach' && (
          <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl mb-4 flex flex-col items-center">
            {loopBody.map(child => <MinimapNode key={child.id} node={child} />)}
          </div>
        )}

        {node.type === 'agent' && (
          <div className="flex gap-12 mb-4">
            {agentPaths.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-24 h-6 bg-slate-300 rounded-md mb-2" />
                <MinimapNode node={child} />
              </div>
            ))}
          </div>
        )}

        {children.map(child => <MinimapNode key={child.id} node={child} />)}
      </div>
    );
  };

  const AddButton = ({ parentId, branch, pathId, insertBetween, variant = 'append' }: { 
    parentId: string | null; 
    branch?: 'true' | 'false' | 'loop'; 
    pathId?: string;
    insertBetween?: { childId: string };
    variant?: 'append' | 'insert';
  }) => {
    const buttonId = `${parentId || 'root'}-${branch || 'main'}-${pathId || 'none'}-${insertBetween?.childId || 'none'}`;
    const isOpen = activePopoverId === buttonId;

    const getPrompt = () => {
      if (branch === 'true') return 'True';
      if (branch === 'false') return 'False';
      if (branch === 'loop') return 'loop';
      return undefined;
    };

    return (
      <div className={`flex flex-col items-center relative ${isOpen ? 'z-[60]' : 'z-20'}`}>
        {variant === 'append' && <div className="h-16 connection-line-v" />}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActivePopoverId(isOpen ? null : buttonId);
          }}
          className="w-10 h-10 flex-shrink-0 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-blue-500 hover:border-blue-500 hover:scale-110 transition-all flex items-center justify-center shadow-md group z-30"
        >
          <Plus size={20} className={`${isOpen ? 'rotate-45' : ''} transition-transform`} />
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
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-[100] overflow-hidden"
              >
                <button 
                  onClick={() => {
                    setModalContext({ parentId, prompt: getPrompt(), pathId, pendingType: 'action', insertBetween });
                    setIsModalOpen(true);
                    setActivePopoverId(null);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 flex items-center justify-center">
                    <Play size={16} />
                  </div>
                  <span className="font-medium">Perform an action</span>
                </button>
                <button 
                  onClick={() => {
                    addNode('condition', undefined, { parentId, prompt: getPrompt(), pathId, insertBetween });
                    setActivePopoverId(null);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
                    <GitBranch size={16} />
                  </div>
                  <span className="font-medium">Condition</span>
                </button>
                <button 
                  onClick={() => {
                    addNode('agent', undefined, { parentId, prompt: getPrompt(), pathId, insertBetween });
                    setActivePopoverId(null);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-900/30 text-pink-500 dark:text-pink-400 flex items-center justify-center">
                    <Cpu size={16} />
                  </div>
                  <span className="font-medium">Enter AI agent</span>
                </button>
                <button 
                  onClick={() => {
                    addNode('foreach', undefined, { parentId, prompt: getPrompt(), pathId, insertBetween });
                    setActivePopoverId(null);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 flex items-center justify-center">
                    <Repeat size={16} />
                  </div>
                  <span className="font-medium">Foreach loop</span>
                </button>

              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans relative transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      {/* Connecting Mode Banner */}
      <AnimatePresence>
        {connectingFrom && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4"
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">Connecting Mode</span>
              <span className="text-sm font-medium">Select an Action, AI Agent, or Condition to connect to</span>
            </div>
            <button 
              onClick={() => setConnectingFrom(null)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
          {!workflow ? (
            <div className="flex flex-col items-center justify-center text-center pointer-events-auto">
              <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <Zap size={40} />
              </div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Build your workflow</h1>
              <p className="text-slate-500 mb-8 max-w-xs">Start by adding a trigger to define how your automation begins.</p>
              <button
                onClick={() => {
                  setModalContext({ parentId: null });
                  setIsModalOpen(true);
                }}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
              >
                <Plus size={20} />
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
          className="absolute bottom-8 left-1/2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 flex items-center gap-1 z-50 cursor-default"
        >
          <div className="px-2 text-slate-300 dark:text-slate-700 cursor-grab active:cursor-grabbing">
            <GripHorizontal size={20} />
          </div>
          
          <div className="w-px h-6 bg-slate-100 dark:bg-slate-800 mx-1" />

          <button 
            onClick={createNewWorkflow}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 group"
            title="New Workflow"
          >
            <FilePlus size={18} className="group-hover:text-blue-500" />
            <span className="text-xs font-bold pr-1">New</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 group"
            title="Upload JSON"
          >
            <Upload size={18} className="group-hover:text-blue-500" />
            <span className="text-xs font-bold pr-1">Import</span>
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
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 group disabled:opacity-30"
            title="Download JSON"
          >
            <Download size={18} className="group-hover:text-blue-500" />
            <span className="text-xs font-bold pr-1">Export</span>
          </button>

          <div className="w-px h-6 bg-slate-100 dark:bg-slate-800 mx-1" />

          <button 
            onClick={saveWorkflow}
            disabled={!workflow}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 group disabled:opacity-30"
            title="Save Workflow"
          >
            <Save size={18} className="group-hover:text-blue-500" />
            <span className="text-xs font-bold pr-1">Save</span>
          </button>

          <button 
            onClick={publishWorkflow}
            disabled={!workflow}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-30 disabled:shadow-none"
          >
            <Send size={16} />
            Publish
          </button>
        </motion.div>
      </div>

      {/* Right Configuration Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-10 flex flex-col"
          >
            <div className="p-6 border-bottom border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                  {React.createElement(NODE_ICONS[selectedNode.type] || Play, { size: 20 })}
                </div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100">Configure {selectedNode.type}</h2>
              </div>
              <button 
                onClick={() => setSelectedNodeId(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 space-y-8">
              <section>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Name</label>
                <input 
                  type="text" 
                  value={selectedNode.label}
                  onChange={(e) => {
                    const updatedWorkflow = JSON.parse(JSON.stringify(workflow));
                    const node = updatedWorkflow[selectedNode.id];
                    if (node) node.label = e.target.value;
                    setWorkflow(updatedWorkflow);
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium dark:text-slate-200"
                />
              </section>

              {selectedNode.type === 'agent' && (
                <section className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">AI AGENT PROMPT</label>
                    <textarea 
                      className="w-full h-40 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm leading-relaxed dark:text-slate-200"
                      placeholder="You're a support agent resolving customer queries..."
                      value={selectedNode.prompt || ''}
                      onChange={(e) => {
                        const updatedWorkflow = { ...workflow };
                        if (updatedWorkflow[selectedNode.id]) {
                          updatedWorkflow[selectedNode.id].prompt = e.target.value;
                          setWorkflow(updatedWorkflow);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">EXIT CONDITIONS / PATHS</label>
                    <div className="space-y-3">
                      {selectedNode.paths?.map((path, idx) => (
                        <div key={path.id} className="flex items-center gap-2">
                          <input 
                            type="text"
                            value={path.label}
                            onChange={(e) => {
                              const updatedWorkflow = { ...workflow };
                              const node = updatedWorkflow[selectedNode.id];
                              if (node && node.paths) {
                                const p = node.paths.find(p => p.id === path.id);
                                if (p) p.label = e.target.value;
                                setWorkflow(updatedWorkflow);
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-slate-200"
                            placeholder={`Path ${idx + 1}`}
                          />
                          <button 
                            onClick={() => {
                              const updatedWorkflow = { ...workflow };
                              const node = updatedWorkflow[selectedNode.id];
                              if (node && node.paths) {
                                node.paths = node.paths.filter(p => p.id !== path.id);
                                setWorkflow(updatedWorkflow);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const updatedWorkflow = { ...workflow };
                      const node = updatedWorkflow[selectedNode.id];
                      if (node) {
                        if (!node.paths) node.paths = [];
                        node.paths.push({ 
                          id: uuidv4(), 
                          label: `Path ${node.paths.length + 1}` 
                        });
                        setWorkflow(updatedWorkflow);
                      }
                    }}
                    className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> Add path
                  </button>
                </section>
              )}

             
            </div>
          </motion.div>
        )}
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-[2px] border-teal-400/40"
            >
              <div className="p-10 pb-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {!workflow || isChangingTrigger ? 'Choose a Trigger' : 'Choose a Action'}
                  </h2>
                  <button 
                    onClick={() => {
                      setIsModalOpen(false);
                      setIsChangingTrigger(false);
                      setChangingNodeId(null);
                      setSearchQuery('');
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 outline-none transition-all text-sm shadow-sm placeholder:text-slate-400"
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