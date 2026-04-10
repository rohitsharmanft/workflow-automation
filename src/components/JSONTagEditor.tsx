import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Workflow } from '../types';

interface JSONTagEditorProps {
  value: string;
  onChange: (val: string) => void;
  workflow: Workflow;
  placeholder?: string;
}

export const JSONTagEditor: React.FC<JSONTagEditorProps> = ({ value, onChange, workflow, placeholder }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [cursorIndex, setCursorIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const availableVariables = useMemo(() => {
    if (!workflow) return [];
    const vars: any[] = [];
    
    Object.values(workflow).forEach((node: any) => {
      // Add the node itself as a variable
      vars.push({
        id: node.id,
        label: node.label,
        type: node.type
      });

      // Add specific outputs for certain node types
      if (node.type === 'trigger' || node.type === 'http-trigger') {
        vars.push({ id: `${node.id}-body`, label: `${node.label}.body`, type: 'variable' });
        vars.push({ id: `${node.id}-headers`, label: `${node.label}.headers`, type: 'variable' });
        // Add a shortcut for the main trigger if it's the start node
        if (node.id === 'start') {
          vars.push({ id: 'body-shortcut', label: 'body{}', type: 'variable' });
          vars.push({ id: 'headers-shortcut', label: 'headers{}', type: 'variable' });
          vars.push({ id: 'body-simple', label: 'body', type: 'variable' });
          vars.push({ id: 'headers-simple', label: 'headers', type: 'variable' });
          vars.push({ id: 'query-simple', label: 'query', type: 'variable' });
        }
      }
      if (node.type === 'agent') {
        vars.push({ id: `${node.id}-output`, label: `${node.label}.output`, type: 'variable' });
      }
    });
    
    return vars;
  }, [workflow]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '@') {
      const { selectionStart } = e.currentTarget;
      setCursorIndex(selectionStart);
      setShowPicker(true);
      setSearch('');
    }
    
    if (showPicker) {
      if (e.key === 'Escape') {
        setShowPicker(false);
      }
      if (e.key === 'Enter' && search) {
        const filtered = availableVariables.filter(v => v.label.toLowerCase().includes(search.toLowerCase()));
        if (filtered.length > 0) {
          handleSelect(filtered[0]);
          e.preventDefault();
        }
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    
    if (showPicker) {
      const textSinceAt = val.substring(cursorIndex + 1, e.target.selectionStart);
      if (textSinceAt.includes(' ') || textSinceAt.includes('\n')) {
        setShowPicker(false);
      } else {
        setSearch(textSinceAt);
      }
    }
  };

  const handleSelect = (variable: any) => {
    const before = value.substring(0, cursorIndex);
    const after = value.substring(textareaRef.current?.selectionStart || cursorIndex + 1);
    const newValue = `${before}@${variable.label}${after}`;
    onChange(newValue);
    setShowPicker(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = before.length + variable.label.length + 1;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  return (
    <div className="relative group w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 transition-all overflow-hidden">
      <textarea 
        ref={textareaRef}
        placeholder={placeholder || '{\n  "key": "value"\n}'}
        value={value || ''}
        onKeyDown={handleKeyDown}
        onChange={handleInput}
        spellCheck="false"
        className="w-full h-48 px-4 py-3 bg-transparent border-none outline-none text-sm font-mono leading-relaxed text-slate-900 dark:text-slate-100 caret-blue-500 dark:caret-blue-400 relative z-10 selection:bg-blue-500/30 resize-none"
      />

      <AnimatePresence>
        {showPicker && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-20 left-4 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto"
            style={{ top: '100%', marginTop: '8px' }}
          >
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Variable</span>
            </div>
            {availableVariables.filter(v => v.label.toLowerCase().includes(search.toLowerCase())).map(v => (
              <button
                key={v.id}
                onClick={() => handleSelect(v)}
                className="w-full px-4 py-2 text-left text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors"
              >
                <div className="w-5 h-5 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <span className="italic text-[10px] font-bold">fx</span>
                </div>
                {v.label}
              </button>
            ))}
            {availableVariables.filter(v => v.label.toLowerCase().includes(search.toLowerCase())).length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400 italic">No variables found</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
