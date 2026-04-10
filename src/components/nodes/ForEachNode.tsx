import React from 'react';
import { motion } from 'framer-motion';
import { Repeat, Trash2, ChevronUp, Play } from 'lucide-react';
import { NodeProps } from './types';

export const ForEachNode: React.FC<NodeProps> = (props) => {
  const { 
    node, isSelected, connectingFrom, handleConnectToNode, setSelectedNodeId,
    deleteNode, workflow, renderNode, activePopoverId, AddButton
  } = props;

  const loopBody = node.to?.filter(c => c.prompt === 'loop').map(c => workflow[c.id]).filter(Boolean);

  return (
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
        relative group flex flex-col w-fit min-w-[32rem] rounded-[10px] border transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-sm hover:shadow-md
        ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800'}
      `}
    >
      {/* Header Bar */}
      <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between rounded-t-[9px]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Repeat size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Loop</span>
            <span className="text-sm font-semibold">For each item</span>
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
      <div className="p-10 pt-8 bg-white dark:bg-slate-900 flex flex-col items-center relative backdrop-blur-sm">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-gradient-to-b from-amber-500/50 to-transparent" />
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-8 border border-amber-100 dark:border-amber-900/50">
          <Play size={10} fill="currentColor" />
          Loop Start
        </div>
        
        <div className={`w-fit min-w-full border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 rounded-[10px] p-8 shadow-inner min-h-[200px] flex flex-col items-center relative transition-all ${activePopoverId?.includes(`${node.id}-loop`) ? 'z-[60]' : 'hover:z-40'}`}>
          {loopBody?.map((child, idx) => renderNode(child, { isFirst: idx === 0, hideLabel: idx === 0, parentId: node.id, prompt: 'loop' }))}
          {(!loopBody || loopBody.length === 0) && (
            <AddButton parentId={node.id} branch="loop" />
          )}
        </div>

        <div className="mt-8 inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200 dark:border-slate-700">
          Loop End
        </div>
      </div>
    </motion.div>
  );
};
