import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Trash2 } from 'lucide-react';
import { NodeProps } from './types';

export const ConditionNode: React.FC<NodeProps> = (props) => {
  const { 
    node, isSelected, connectingFrom, handleConnectToNode, setSelectedNodeId,
    deleteNode, workflow, renderNode, activePopoverId, isDarkMode, AddButton
  } = props;

  const trueBranch = node.to?.filter(c => c.prompt === 'True').map(c => workflow[c.id]).filter(Boolean);
  const falseBranch = node.to?.filter(c => c.prompt === 'False').map(c => workflow[c.id]).filter(Boolean);

  return (
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
          relative z-30 flex items-center justify-between w-80 h-20 px-5 bg-white dark:bg-slate-900 rounded-[10px] border transition-all cursor-pointer shadow-sm hover:shadow-md
          ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
            <GitBranch size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5">Condition</span>
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
        
        {/* Orthogonal SVG Lines */}
        <svg className="absolute top-0 left-0 w-full h-24 pointer-events-none overflow-visible">
          <path 
            d={`M 50% 40 L 50% 60 L 25% 60 L 25% 96`} 
            fill="none" 
            stroke={isDarkMode ? '#334155' : '#cbd5e1'} 
            strokeWidth="2" 
            strokeLinecap="round"
            className="connection-line"
          />
          <path 
            d={`M 50% 40 L 50% 60 L 75% 60 L 75% 96`} 
            fill="none" 
            stroke={isDarkMode ? '#334155' : '#cbd5e1'} 
            strokeWidth="2" 
            strokeLinecap="round"
            className="connection-line"
          />
        </svg>

        {/* True Branch */}
        <div className={`flex-1 flex flex-col items-center relative transition-all ${activePopoverId?.includes(`${node.id}-true`) ? 'z-[60]' : 'z-20 hover:z-40'}`}>
          <div className="bg-emerald-500 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 mb-6 transform -translate-y-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            True
          </div>
          <div className="w-full border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[10px] p-6 shadow-inner min-h-[200px] flex flex-col items-center">
             {trueBranch?.map((child, idx) => renderNode(child, { isFirst: idx === 0, hideLabel: idx === 0, parentId: node.id, prompt: 'True' }))}
             {(!trueBranch || trueBranch.length === 0) && (
               <AddButton parentId={node.id} branch="true" />
             )}
          </div>
        </div>

        {/* False Branch */}
        <div className={`flex-1 flex flex-col items-center relative transition-all ${activePopoverId?.includes(`${node.id}-false`) ? 'z-[60]' : 'z-20 hover:z-40'}`}>
          <div className="bg-rose-500 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-500/20 mb-6 transform -translate-y-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full opacity-60" />
            False
          </div>
          <div className="w-full border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[10px] p-6 shadow-inner min-h-[200px] flex flex-col items-center">
             {falseBranch?.map((child, idx) => renderNode(child, { isFirst: idx === 0, hideLabel: idx === 0, parentId: node.id, prompt: 'False' }))}
             {(!falseBranch || falseBranch.length === 0) && (
               <AddButton parentId={node.id} branch="false" />
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
