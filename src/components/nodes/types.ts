import { Workflow, WorkflowNode, RunAfterCondition } from '../../types';

export interface NodeProps {
  node: WorkflowNode;
  isSelected: boolean;
  connectingFrom: { parentId: string | null; prompt?: string; pathId?: string } | null;
  handleConnectToNode: (id: string) => void;
  setSelectedNodeId: (id: string) => void;
  setNodeMenuId: (id: string | null) => void;
  nodeMenuId: string | null;
  deleteNode: (id: string) => void;
  setChangingNodeId: (id: string | null) => void;
  setIsChangingTrigger: (val: boolean) => void;
  setModalContext: (ctx: any) => void;
  setIsModalOpen: (val: boolean) => void;
  workflow: Workflow;
  renderNode: (node: WorkflowNode, options?: any) => React.ReactNode;
  nodeRefs: React.MutableRefObject<Record<string, HTMLDivElement>>;
  activePopoverId: string | null;
  isDarkMode: boolean;
  setWorkflow: (wf: Workflow) => void;
  AddButton: (props: { parentId: string | null; branch?: 'true' | 'false' | 'loop'; pathId?: string }) => React.ReactNode;
}
