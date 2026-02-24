export type NodeType = 'trigger' | 'action' | 'ai-agent' | 'condition' | 'foreach';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  config: Record<string, any>;
  children?: WorkflowNode[]; // For sequential flow
  branches?: {
    true: WorkflowNode[];
    false: WorkflowNode[];
  }; // For Condition
  paths?: {
    id: string;
    label: string;
    nodes: WorkflowNode[];
  }[]; // For AI Agent multi-branching
  loopBody?: WorkflowNode[]; // For Foreach
  goToId?: string; // For connecting to an existing node
  links?: string[]; // Array of target node IDs for arbitrary connections
}

export interface Workflow {
  id: string;
  name: string;
  trigger: WorkflowNode | null;
}

export type TriggerType = 'http' | 'schedule' | 'webhook';
export type ActionType = 'email' | 'slack' | 'database' | 'api';
export type AIAgentType = 'summarizer' | 'classifier' | 'translator';
