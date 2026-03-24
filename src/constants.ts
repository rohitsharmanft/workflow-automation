import { Zap, Play, Cpu, GitBranch, Repeat, Mail, MessageSquare, Database, Globe, Infinity, Terminal, Search, Clock, MessageCircle, Users, Bell } from 'lucide-react';

export const TRIGGER_TYPES = [
  { 
    id: 'http-trigger', 
    label: 'Formulator Callback', 
    icon: Infinity, 
    description: 'Triggered when a formulator callback is received',
    category: 'Fynite'
  },
  { 
    id: 'teams-chat', 
    label: 'When a new chat message is added', 
    icon: MessageCircle, 
    description: 'Triggers when a new chat message is added to a personal or group chat.',
    category: 'Microsoft Teams'
  },
  { 
    id: 'teams-channel', 
    label: 'When a new message is added to a chat or channel', 
    icon: MessageSquare, 
    description: 'Triggers when a new message is posted to a specific channel.',
    category: 'Microsoft Teams'
  },
  { 
    id: 'teams-member-added', 
    label: 'When a new team member is added', 
    icon: Users, 
    description: 'Triggers when a new member joins a team.',
    category: 'Microsoft Teams'
  },
  { 
    id: 'teams-member-removed', 
    label: 'When a new team member is removed', 
    icon: Users, 
    description: 'Triggers when a member is removed from a team.',
    category: 'Microsoft Teams'
  },
  { 
    id: 'teams-mention', 
    label: 'When I am mentioned in a channel message', 
    icon: Bell, 
    description: 'Triggers when you are @mentioned in a channel.',
    category: 'Microsoft Teams'
  },
  { 
    id: 'schedule', 
    label: 'Recurrence', 
    icon: Clock, 
    description: 'Triggered on a scheduled interval (daily, weekly, etc.)',
    category: 'General'
  },
  { 
    id: 'webhook', 
    label: 'Webhook', 
    icon: Zap, 
    description: 'Triggered by an external HTTP webhook request',
    category: 'General'
  },
];

export const ACTION_TYPES = [
  { 
    id: 'http-action', 
    label: 'HTTP Request', 
    icon: Globe, 
    description: 'Make an outgoing HTTP call to any API',
    category: 'Fynite'
  },
  { 
    id: 'teams-send-message', 
    label: 'Send a message to a chat or channel', 
    icon: MessageSquare, 
    description: 'Post a message to a specific Teams channel or user.',
    category: 'Microsoft Teams'
  },
  { 
    id: 'teams-create-chat', 
    label: 'Create a chat', 
    icon: MessageCircle, 
    description: 'Start a new chat with one or more participants.',
    category: 'Microsoft Teams'
  },
  { 
    id: 'email', 
    label: 'Send Email', 
    icon: Mail, 
    description: 'Send an email notification via SMTP or Outlook',
    category: 'General'
  },
  { 
    id: 'slack', 
    label: 'Post to Slack', 
    icon: MessageSquare, 
    description: 'Send a message to a Slack channel or user',
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
  agent: Cpu,
  wait: Clock,
  condition: GitBranch,
  foreach: Repeat,
};
 