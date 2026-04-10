import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, GitBranch, Cpu, Clock, Repeat, Split } from 'lucide-react';

interface AddButtonProps {
  parentId: string | null;
  branch?: 'true' | 'false' | 'loop';
  pathId?: string;
  activePopoverId: string | null;
  setActivePopoverId: (id: string | null) => void;
  setModalContext: (ctx: any) => void;
  setIsModalOpen: (val: boolean) => void;
  addNode: (type: any, subType?: any, context?: any) => void;
}

export const AddButton: React.FC<AddButtonProps> = ({ 
  parentId, branch, pathId, activePopoverId, setActivePopoverId, 
  setModalContext, setIsModalOpen, addNode 
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
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[10px] group-hover/item:scale-110 transition-transform">
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
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[10px] group-hover/item:scale-110 transition-transform">
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
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[10px] group-hover/item:scale-110 transition-transform">
                    <Repeat size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Loop</span>
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
