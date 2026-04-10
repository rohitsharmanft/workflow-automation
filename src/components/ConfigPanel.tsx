import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Play, Settings2, Terminal, AlertCircle, Trash2, Plus, 
  ChevronUp, ChevronDown, ChevronRight, CheckCircle2, Clock, MinusCircle 
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowNode, Workflow, RunAfterCondition } from '../types';
import { TRIGGER_TYPES, ACTION_TYPES, NODE_ICONS } from '../constants';
import { JSONTagEditor } from './JSONTagEditor';

interface ConfigPanelProps {
  selectedNode: WorkflowNode | null;
  setSelectedNodeId: (id: string | null) => void;
  workflow: Workflow;
  setWorkflow: (wf: Workflow) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isEligibleForRunAfter: (id: string) => boolean;
  expandedRunAfter: boolean;
  setExpandedRunAfter: (val: boolean) => void;
  getPrecedingNodes: (id: string) => WorkflowNode[];
  expandedNodes: Record<string, boolean>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  updateRunAfter: (nodeId: string, preNodeId: string, conditions: RunAfterCondition[]) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  selectedNode,
  setSelectedNodeId,
  workflow,
  setWorkflow,
  activeTab,
  setActiveTab,
  isEligibleForRunAfter,
  expandedRunAfter,
  setExpandedRunAfter,
  getPrecedingNodes,
  expandedNodes,
  setExpandedNodes,
  updateRunAfter
}) => {
  if (!selectedNode) return null;

  return (
    <motion.div
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-10 flex flex-col"
    >
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
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

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 gap-6">
        {['Parameters', 'Settings', 'Code View', 'About'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-4 text-[11px] font-bold uppercase tracking-wider transition-all relative ${
              activeTab === tab 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"
              />
            )}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-auto p-6 space-y-8">
        {activeTab === 'Parameters' && (
          <div className="space-y-8">
            {/* Name always as first position */}
            <section>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Name</label>
              <input 
                type="text" 
                value={selectedNode.label}
                onChange={(e) => {
                  const updatedWorkflow = JSON.parse(JSON.stringify(workflow));
                  const node = updatedWorkflow[selectedNode.id];
                  if (node) node.label = e.target.value;
                  setWorkflow(updatedWorkflow);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[10px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium dark:text-slate-200"
              />
            </section>

            {/* AI Agent Prompt (if applicable) */}
            {selectedNode.type === 'agent' && (
              <section className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">AI Agent Prompt</label>
                  <textarea 
                    className="w-full h-40 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[10px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm leading-relaxed dark:text-slate-200"
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
              </section>
            )}

            {/* Condition Expression */}
            {selectedNode.type === 'condition' && (
              <section className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Condition Expression</label>
                  <JSONTagEditor 
                    value={selectedNode.parameters?.expression || ''}
                    onChange={(val: any) => {
                      if (!workflow) return;
                      const updatedWorkflow = { ...workflow };
                      const node = { ...updatedWorkflow[selectedNode.id] };
                      node.parameters = { ...(node.parameters || {}), expression: val };
                      updatedWorkflow[selectedNode.id] = node;
                      setWorkflow(updatedWorkflow);
                    }}
                    workflow={workflow}
                    placeholder="e.g. @trigger.body.amount > 100"
                  />
                </div>
              </section>
            )}

            {/* Foreach Collection */}
            {selectedNode.type === 'foreach' && (
              <section className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Collection to iterate</label>
                  <JSONTagEditor 
                    value={selectedNode.parameters?.collection || ''}
                    onChange={(val: any) => {
                      if (!workflow) return;
                      const updatedWorkflow = { ...workflow };
                      const node = { ...updatedWorkflow[selectedNode.id] };
                      node.parameters = { ...(node.parameters || {}), collection: val };
                      updatedWorkflow[selectedNode.id] = node;
                      setWorkflow(updatedWorkflow);
                    }}
                    workflow={workflow}
                    placeholder="e.g. @trigger.body.items"
                  />
                </div>
              </section>
            )}

            {/* Switch Expression */}
            {selectedNode.type === 'switch' && (
              <section className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Expression to evaluate</label>
                  <JSONTagEditor 
                    value={selectedNode.parameters?.expression || ''}
                    onChange={(val: any) => {
                      if (!workflow) return;
                      const updatedWorkflow = { ...workflow };
                      const node = { ...updatedWorkflow[selectedNode.id] };
                      node.parameters = { ...(node.parameters || {}), expression: val };
                      updatedWorkflow[selectedNode.id] = node;
                      setWorkflow(updatedWorkflow);
                    }}
                    workflow={workflow}
                    placeholder="e.g. @trigger.body.type"
                  />
                </div>
              </section>
            )}

            {/* Wait Duration (if applicable) */}
            {selectedNode.type === 'wait' && (
              <section>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Wait Duration (seconds)</label>
                <input 
                  type="number" 
                  value={selectedNode.duration || 60}
                  onChange={(e) => {
                    const updatedWorkflow = { ...workflow };
                    if (updatedWorkflow[selectedNode.id]) {
                      updatedWorkflow[selectedNode.id].duration = parseInt(e.target.value) || 0;
                      setWorkflow(updatedWorkflow);
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[10px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium dark:text-slate-200"
                />
              </section>
            )}

            {/* Dynamic Parameters for Triggers and Actions */}
            {(selectedNode.type === 'trigger' || selectedNode.type === 'action') && (() => {
              const typeInfo = selectedNode.type === 'trigger' 
                ? TRIGGER_TYPES.find(t => t.id === selectedNode.triggerKey)
                : ACTION_TYPES.find(a => a.id === selectedNode.actionKey);
              
              if (!typeInfo?.parameters) return null;

              return (
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Parameters</label>
                  </div>
                  
                  <div className="space-y-6">
                    {typeInfo.parameters.map((param: any) => {
                      const hasCodeView = !!(selectedNode.code_view || typeInfo?.code_view);
                      const value = hasCodeView
                        ? selectedNode.parameters?.inputs?.[param.id]
                        : selectedNode.parameters?.[param.id];
                      
                      const updateParam = (val: any) => {
                        if (!workflow || !selectedNode) return;
                        const updatedWorkflow = { ...workflow };
                        const node = { ...updatedWorkflow[selectedNode.id] };
                        if (node) {
                          const nodeHasCodeView = !!(node.code_view || typeInfo?.code_view);
                          const parameters = { ...(node.parameters || {}) };
                          
                          if (nodeHasCodeView) {
                            const inputs = { ...(parameters.inputs || {}) };
                            inputs[param.id] = val;
                            parameters.inputs = inputs;
                          } else {
                            parameters[param.id] = val;
                          }
                          
                          node.parameters = parameters;
                          updatedWorkflow[selectedNode.id] = node;
                          setWorkflow(updatedWorkflow);
                        }
                      };

                      return (
                        <div key={param.id} className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            {param.label}
                            {param.required && <span className="text-red-500">*</span>}
                          </label>

                          {param.type === 'text' && (
                            <input 
                              type="text"
                              placeholder={param.placeholder}
                              value={value || ''}
                              onChange={(e) => updateParam(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[10px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium dark:text-slate-200"
                            />
                          )}

                          {param.type === 'textarea' && (
                            <textarea 
                              placeholder={param.placeholder}
                              value={value || ''}
                              onChange={(e) => updateParam(e.target.value)}
                              className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[10px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm leading-relaxed dark:text-slate-200"
                            />
                          )}

                          {param.type === 'select' && (
                            <div className="relative">
                              <select 
                                value={value || ''}
                                onChange={(e) => updateParam(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[10px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium dark:text-slate-200 appearance-none pr-10"
                              >
                                <option value="" disabled>Select {param.label}</option>
                                {param.options.map((opt: any) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronUp className="rotate-180" size={16} />
                              </div>
                            </div>
                          )}

                          {param.type === 'keyvalue' && (
                            <div className="space-y-3">
                              {(value || [{ key: '', value: '' }]).map((kv: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input 
                                    type="text"
                                    placeholder="Enter key"
                                    value={kv.key}
                                    onChange={(e) => {
                                      const newList = [...(value || [{ key: '', value: '' }])];
                                      newList[idx] = { ...newList[idx], key: e.target.value };
                                      updateParam(newList);
                                    }}
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-slate-200"
                                  />
                                  <input 
                                    type="text"
                                    placeholder="Enter value"
                                    value={kv.value}
                                    onChange={(e) => {
                                      const newList = [...(value || [{ key: '', value: '' }])];
                                      newList[idx] = { ...newList[idx], value: e.target.value };
                                      updateParam(newList);
                                    }}
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-slate-200"
                                  />
                                  <button 
                                    onClick={() => {
                                      const newList = (value || [{ key: '', value: '' }]).filter((_: any, i: number) => i !== idx);
                                      updateParam(newList.length ? newList : [{ key: '', value: '' }]);
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-500"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                              <button 
                                onClick={() => updateParam([...(value || [{ key: '', value: '' }]), { key: '', value: '' }])}
                                className="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1"
                              >
                                <Plus size={10} /> Add field
                              </button>
                            </div>
                          )}

                          {param.type === 'json' && (
                            <JSONTagEditor 
                              value={value}
                              onChange={updateParam}
                              workflow={workflow}
                              placeholder={param.placeholder}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}

            {/* Exit Conditions / Paths (always last position) */}
            {(selectedNode.type === 'agent' || selectedNode.type === 'trigger' || selectedNode.type === 'switch') && (
              <section className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                    {selectedNode.type === 'switch' ? 'CASES' : 'EXIT CONDITIONS / PATHS'}
                  </label>
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
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[10px] text-xs dark:text-slate-200"
                          placeholder={selectedNode.type === 'switch' ? `Case ${idx + 1}` : `Path ${idx + 1}`}
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
                        label: selectedNode.type === 'switch' ? `Case ${node.paths.length + 1}` : `Path ${node.paths.length + 1}` 
                      });
                      setWorkflow(updatedWorkflow);
                    }
                  }}
                  className="w-full py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-[10px] text-xs font-bold text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> {selectedNode.type === 'switch' ? 'Add case' : 'Add path'}
                </button>
              </section>
            )}
          </div>
        )}

        {activeTab === 'Settings' && (
          <div className="space-y-8">
            {isEligibleForRunAfter(selectedNode.id) ? (
              <section className="space-y-4">
                <button 
                  onClick={() => setExpandedRunAfter(!expandedRunAfter)}
                  className="flex items-center justify-between w-full text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {expandedRunAfter ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Run after
                  </div>
                </button>

                {expandedRunAfter && (
                  <div className="space-y-4 pl-2">
                    <div className="space-y-3">
                      {getPrecedingNodes(selectedNode.id).map(preNode => (
                        <div key={preNode.id} className="space-y-2">
                          <button 
                            onClick={() => setExpandedNodes(prev => ({ ...prev, [preNode.id]: !prev[preNode.id] }))}
                            className="flex items-center gap-3 w-full p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group"
                          >
                            <div className={`transition-transform ${expandedNodes[preNode.id] ? 'rotate-0' : '-rotate-90'}`}>
                              <ChevronDown size={14} className="text-slate-400" />
                            </div>
                            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-100 dark:border-indigo-800/50">
                              {React.createElement(NODE_ICONS[preNode.type] || Play, { size: 14 })}
                            </div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{preNode.label}</span>
                          </button>

                          {expandedNodes[preNode.id] && (
                            <div className="pl-10 space-y-2">
                              {[
                                { id: 'success', label: 'Is successful', icon: CheckCircle2, color: 'text-emerald-500' },
                                { id: 'timedOut', label: 'Has timed out', icon: Clock, color: 'text-orange-500' },
                                { id: 'skipped', label: 'Is skipped', icon: MinusCircle, color: 'text-slate-400' },
                                { id: 'failed', label: 'Has failed', icon: AlertCircle, color: 'text-rose-500' }
                              ].map(condition => {
                                const isChecked = selectedNode.runAfter?.[preNode.id] 
                                  ? selectedNode.runAfter[preNode.id].includes(condition.id as RunAfterCondition)
                                  : condition.id === 'success';
                                
                                return (
                                  <label key={condition.id} className="flex items-center gap-3 group cursor-pointer">
                                    <div className="relative flex items-center justify-center">
                                      <input 
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const current = selectedNode.runAfter?.[preNode.id] || (selectedNode.runAfter?.[preNode.id] === undefined ? ['success'] : []);
                                          let next;
                                          if (e.target.checked) {
                                            next = [...current, condition.id as RunAfterCondition];
                                          } else {
                                            next = current.filter(c => c !== condition.id);
                                          }
                                          updateRunAfter(selectedNode.id, preNode.id, next);
                                        }}
                                        className="peer appearance-none w-4 h-4 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 checked:bg-indigo-500 checked:border-indigo-500 transition-all cursor-pointer"
                                      />
                                      <CheckCircle2 size={10} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                                    </div>
                                    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${isChecked ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 group-hover:text-slate-500'}`}>
                                      <condition.icon size={14} className={condition.color} />
                                      {condition.label}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <Settings2 size={24} />
                </div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">Settings</h3>
                <p className="text-[10px] text-slate-400 max-w-[160px]">Run after options are not available for this node type or position.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Code View' && (() => {
          const typeInfo = selectedNode.type === 'trigger' 
            ? TRIGGER_TYPES.find(t => t.id === selectedNode.triggerKey)
            : ACTION_TYPES.find(a => a.id === selectedNode.actionKey);
          
          const code = typeInfo?.code_view || selectedNode.code_view;

          if (code) {
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Code Representation</label>
                  <button 
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    Copy Code
                  </button>
                </div>
                <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-inner overflow-x-auto">
                  <pre className="text-sm font-mono text-blue-400 leading-relaxed whitespace-pre-wrap">
                    <code>{code}</code>
                  </pre>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  This is a read-only preview of the underlying code for this {selectedNode.type}.
                </p>
              </div>
            );
          }

          return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-300">
                <Terminal size={32} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">Code View</h3>
              <p className="text-xs text-slate-400 max-w-[200px]">No code representation available for this node type.</p>
            </div>
          );
        })()}

        {activeTab === 'About' && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-300">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">{activeTab}</h3>
            <p className="text-xs text-slate-400 max-w-[200px]">This feature is currently under development.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
