import React from 'react';
import { motion } from 'framer-motion';
import { Split, Trash2, X, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NodeProps } from './types';

export const SwitchNode: React.FC<NodeProps> = (props) => {
  const { 
    node, isSelected, connectingFrom, handleConnectToNode, setSelectedNodeId,
    deleteNode, workflow, renderNode, activePopoverId, isDarkMode, AddButton, setWorkflow
  } = props;

  const switchPaths = node.paths?.map(p => ({
    ...p,
    node: p.nodeId ? workflow[p.nodeId] : undefined
  })) || [];

  return (
    <div className="flex flex-col items-center relative group/switch-node">
      {/* Switch Header Card */}
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
          relative z-30 flex items-center justify-between w-80 h-20 px-5 bg-white dark:bg-slate-900 rounded-[10px] border transition-all cursor-pointer shadow-sm hover:shadow-md
          ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
            <Split size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5">Switch</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">{node.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(node.id);
            }}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </motion.div>

      {/* Main Container */}
      <div className="relative -mt-10 pt-24 pb-10 px-8 border border-slate-200 dark:border-slate-800 rounded-[10px] bg-white dark:bg-slate-900 flex gap-12 w-fit min-w-[36rem] z-10 backdrop-blur-sm">
        
        {/* Dynamic SVG Lines */}
        <svg className="absolute top-0 left-0 w-full h-24 pointer-events-none overflow-visible">
          {switchPaths.map((_, idx) => {
            const xPos = ((idx + 0.5) / switchPaths.length) * 100;
            return (
              <path 
                key={idx}
                d={`M 50% 40 L 50% 60 L ${xPos}% 60 L ${xPos}% 96`} 
                fill="none" 
                stroke={isDarkMode ? '#334155' : '#cbd5e1'} 
                strokeWidth="2" 
                strokeLinecap="round"
                className="connection-line"
              />
            );
          })}
        </svg>

        {/* Switch Cases */}
        {switchPaths.map((path, idx) => (
          <div key={path.id} className={`flex-1 flex flex-col items-center relative transition-all ${activePopoverId?.includes(path.id) ? 'z-[60]' : 'z-20 hover:z-40'}`}>
            <div className="group/case relative flex flex-col items-center w-full">
              <div className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg mb-6 transform -translate-y-1 transition-all ${path.label === 'Default' ? 'bg-slate-500 text-white shadow-slate-500/20' : 'bg-indigo-500 text-white shadow-indigo-500/20'}`}>
                {path.label}
                {path.label !== 'Default' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!workflow) return;
                      const updatedWorkflow = { ...workflow };
                      const n = updatedWorkflow[node.id];
                      if (n.paths) {
                        n.paths = n.paths.filter(p => p.id !== path.id);
                      }
                      setWorkflow(updatedWorkflow);
                    }}
                    className="ml-2 opacity-0 group-hover/case:opacity-100 p-1 hover:bg-white/20 rounded-full transition-all"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              
              <div className="w-full border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[10px] p-6 shadow-inner min-h-[200px] flex flex-col items-center">
                 {path.node ? renderNode(path.node, { isFirst: true, hideLabel: true, parentId: node.id, pathId: path.id }) : (
                   <AddButton parentId={node.id} pathId={path.id} />
                 )}
              </div>

              {/* Add Case Button between cases */}
              {idx < switchPaths.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!workflow) return;
                    const updatedWorkflow = { ...workflow };
                    const n = updatedWorkflow[node.id];
                    if (n.paths) {
                      const newCaseId = uuidv4();
                      const caseCount = n.paths.filter(p => p.label.startsWith('Case')).length;
                      const newPath = { id: newCaseId, label: `Case ${caseCount + 1}` };
                      n.paths.splice(idx + 1, 0, newPath);
                    }
                    setWorkflow(updatedWorkflow);
                  }}
                  className="absolute top-1/2 -right-6 translate-x-1/2 z-30 w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center text-indigo-500 hover:scale-110 transition-all shadow-md opacity-0 group-hover/switch-node:opacity-100"
                  title="Add Case"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add Case Button at the bottom of the container */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover/switch-node:opacity-100 transition-opacity">
            <button
            onClick={(e) => {
              e.stopPropagation();
              if (!workflow) return;
              const updatedWorkflow = { ...workflow };
              const n = updatedWorkflow[node.id];
              if (n.paths) {
                const newCaseId = uuidv4();
                const caseCount = n.paths.filter(p => p.label.startsWith('Case')).length;
                const newPath = { id: newCaseId, label: `Case ${caseCount + 1}` };
                const defaultIdx = n.paths.findIndex(p => p.label === 'Default');
                if (defaultIdx !== -1) {
                  n.paths.splice(defaultIdx, 0, newPath);
                } else {
                  n.paths.push(newPath);
                }
              }
              setWorkflow(updatedWorkflow);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all shadow-lg"
          >
            <Plus size={12} />
            Add Case
          </button>
        </div>
      </div>
    </div>
  );
};
