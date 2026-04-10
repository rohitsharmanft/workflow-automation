export type NodeType = 'trigger' | 'action' | 'agent' | 'wait' | 'condition' | 'foreach' | 'note' | 'switch';

export interface Connection {
  id: string;
  prompt?: string;
}

export type RunAfterCondition = 'success' | 'timedOut' | 'skipped' | 'failed';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  to: Connection[];
  paths?: { id: string; label: string; nodeId?: string }[];
  triggerKey?: string;
  actionKey?: string;
  prompt?: string;
  skills?: Record<string, { id: string; name: string; icon: string }>;
  markdown?: string;
  customPosition?: { refId: string; x: number; y: number };
  size?: { width: number; height: number };
  duration?: number;
  parameters?: Record<string, any>;
  code_view?: string;
  runAfter?: Record<string, RunAfterCondition[]>;
}

export type Workflow = Record<string, WorkflowNode>;

export type TriggerType = 'http' | 'schedule' | 'webhook';
export type ActionType = 'email' | 'slack' | 'database' | 'api';
export type AIAgentType = 'summarizer' | 'classifier' | 'translator'; 