import { Zap, Play, Cpu, GitBranch, Repeat, Mail, MessageSquare, Database, Globe, Infinity, Terminal, Search, Clock } from 'lucide-react';

export const TRIGGER_TYPES = [
  { 
    id: 'http-trigger', 
    label: 'HTTP', 
    icon: Infinity, 
    description: 'Triggered by a formulator callback',
    category: 'Fynite'
  },
  { 
    id: 'agent-data', 
    label: 'Agent Data', 
    icon: Infinity, 
    description: 'Triggered by agent data updates',
    category: 'Fynite'
  },
  { 
    id: 'callback-api', 
    label: 'Callback API', 
    icon: Infinity, 
    description: 'Triggered by callback API',
    category: 'Fynite'
  },
  { 
    id: 'query-redshift', 
    label: 'Query Redshift', 
    icon: Infinity, 
    description: 'Triggered by redshift query',
    category: 'Fynite'
  },
  { 
    id: 'http-received', 
    label: 'When a HTTP request is received', 
    icon: Infinity, 
    description: 'Triggered when a HTTP request is received',
    category: 'Fynite'
  },
  { 
    id: 'webhooks-io', 
    label: 'Create In and Out Webhooks', 
    icon: Infinity, 
    description: 'Triggered by webhooks',
    category: 'Fynite'
  },
  { 
    id: 'teams-chat', 
    label: 'When a new chat message is added', 
    icon: MessageSquare, 
    description: 'Triggers when a new issue is created.',
    category: 'Microsoft Teams'
  },
  { 
    id: 'teams-channel', 
    label: 'When a new message is added to a chat or channel', 
    icon: MessageSquare, 
    description: 'Triggers when a new issue is created.',
    category: 'Microsoft Teams'
  },
  { 
    id: 'teams-member-added', 
    label: 'When a new team member is added', 
    icon: MessageSquare, 
    description: 'Triggers when a new issue is created.',
    category: 'Microsoft Teams'
  },
  { 
    id: 'schedule', 
    label: 'Recurrence', 
    icon: Clock, 
    description: 'Triggered on a scheduled interval',
    category: 'General'
  },
  { 
    id: 'webhook', 
    label: 'Webhook', 
    icon: Zap, 
    description: 'Triggered by an external webhook',
    category: 'General'
  },
];

export const ACTION_TYPES = [
  { 
    id: 'http-action', 
    label: 'HTTP', 
    icon: Infinity, 
    description: 'Make an outgoing HTTP call',
    category: 'Fynite'
  },
  { 
    id: 'agent-data-action', 
    label: 'Agent Data', 
    icon: Infinity, 
    description: 'Process agent data',
    category: 'Fynite'
  },
  { 
    id: 'callback-api-action', 
    label: 'Callback API', 
    icon: Infinity, 
    description: 'Call a callback API',
    category: 'Fynite'
  },
  { 
    id: 'query-redshift-action', 
    label: 'Query Redshift', 
    icon: Infinity, 
    description: 'Execute a Redshift query',
    category: 'Fynite'
  },
  { 
    id: 'teams-chat-action', 
    label: 'When a new chat message is added', 
    icon: MessageSquare, 
    description: 'Triggers when a new issue is created.',
    category: 'Microsoft Teams'
  },
  { 
    id: 'teams-channel-action', 
    label: 'When a new message is added to a chat or channel', 
    icon: MessageSquare, 
    description: 'Triggers when a new issue is created.',
    category: 'Microsoft Teams'
  },
  { 
    id: 'email', 
    label: 'Send Email', 
    icon: Mail, 
    description: 'Send an email via SMTP',
    category: 'General'
  },
  { 
    id: 'slack', 
    label: 'Post to Slack', 
    icon: MessageSquare, 
    description: 'Send a message to a Slack channel',
    category: 'General'
  },
];

export const AI_AGENT_TYPES = [
  { id: 'summarizer', label: 'Summarizer', icon: Cpu, description: 'Summarize long text using AI' },
  { id: 'classifier', label: 'Classifier', icon: Cpu, description: 'Categorize text into predefined labels' },
  { id: 'translator', label: 'Translator', icon: Cpu, description: 'Translate text between languages' },
];

export const NODE_ICONS: Record<string, any> = {
  trigger: Zap,
  action: Play,
  'ai-agent': Cpu,
  condition: GitBranch,
  foreach: Repeat,
};
