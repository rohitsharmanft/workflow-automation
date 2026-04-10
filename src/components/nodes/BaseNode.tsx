import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Settings2, Trash2 } from 'lucide-react';
import { NodeProps } from './types';
import { NODE_ICONS } from '../../constants';

export const BaseNode: React.FC<NodeProps> = (props) => {
  const { 
    node, isSelected, connectingFrom, handleConnectToNode, setSelectedNodeId,
    setNodeMenuId, nodeMenuId, deleteNode, setChangingNodeId, setIsChangingTrigger,
    setModalContext, setIsModalOpen, nodeRefs
  } = props;

  const Icon = NODE_ICONS[node.type] || (() => null);

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
        relative group flex items-center gap-4 p-4 rounded-[10px] border transition-all cursor-pointer w-80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md
        ${node.type === 'agent' ? 'ai-agent-gradient' : ''}
        ${isSelected 
          ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}
      `}
    >
      <div className={`p-2.5 rounded-[8px] ${
        isSelected 
          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
          : node.type === 'trigger' 
            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            : node.type === 'agent'
              ? 'bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400'
              : node.type === 'wait'
                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
      }`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${
          node.type === 'trigger' ? 'text-emerald-600 dark:text-emerald-400' : 
          node.type === 'agent' ? 'text-fuchsia-600 dark:text-fuchsia-400' : 
          node.type === 'wait' ? 'text-amber-600 dark:text-amber-400' : 
          'text-slate-500 dark:text-slate-400'
        }`}>{node.type === 'agent' ? 'AI Agent' : node.type}</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{node.label}</p>
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
  );
};
