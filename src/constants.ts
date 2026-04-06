import { Zap, Play, Cpu, GitBranch, Repeat, Mail, MessageSquare, Database, Globe, Infinity, Terminal, Search, Clock, MessageCircle, Users, Bell, Split } from 'lucide-react';

export const TRIGGER_TYPES = [
  { 
    id: 'http-trigger', 
    label: 'Formulator Callback', 
    icon: Infinity, 
    description: 'Triggered when a formulator callback is received',
    category: 'Fynite',
    parameters: [
      { id: 'uri', label: 'URI', type: 'text', placeholder: 'https://api.example.com/callback', required: true },
      { id: 'method', label: 'Method', type: 'select', options: [
        { label: 'POST', value: 'POST' },
        { label: 'GET', value: 'GET' },
        { label: 'PUT', value: 'PUT' }
      ], required: true },
      { id: 'headers', label: 'Headers', type: 'keyvalue' },
      { id: 'queries', label: 'Queries', type: 'keyvalue' }
    ],
    code_view: "on_http_request(method='POST', path='/callback')"
  },
  { 
    id: 'teams-chat', 
    label: 'When a new chat message is added', 
    icon: MessageCircle, 
    description: 'Triggers when a new chat message is added to a personal or group chat.',
    category: 'Microsoft Teams',
    parameters: [
      { id: 'chatId', label: 'Chat ID', type: 'text', placeholder: 'Enter Chat ID or select from list' },
      { id: 'filter', label: 'Message Filter', type: 'text', placeholder: 'Optional keyword filter' }
    ],
    code_view: "on_teams_chat_message(chatId='...')"
  },
  { 
    id: 'teams-channel', 
    label: 'When a new message is added to a chat or channel', 
    icon: MessageSquare, 
    description: 'Triggers when a new message is posted to a specific channel.',
    category: 'Microsoft Teams',
    parameters: [
      { id: 'teamId', label: 'Team', type: 'text', placeholder: 'Select Team' },
      { id: 'channelId', label: 'Channel', type: 'text', placeholder: 'Select Channel' }
    ],
    code_view: "on_teams_channel_message(teamId='...', channelId='...')"
  },
  { 
    id: 'teams-member-added', 
    label: 'When a new team member is added', 
    icon: Users, 
    description: 'Triggers when a new member joins a team.',
    category: 'Microsoft Teams',
    parameters: [
      { id: 'teamId', label: 'Team', type: 'text', placeholder: 'Select Team' }
    ],
    code_view: ""
  },
  { 
    id: 'teams-member-removed', 
    label: 'When a new team member is removed', 
    icon: Users, 
    description: 'Triggers when a member is removed from a team.',
    category: 'Microsoft Teams',
    parameters: [
      { id: 'teamId', label: 'Team', type: 'text', placeholder: 'Select Team' }
    ],
    code_view: ""
  },
  { 
    id: 'teams-mention', 
    label: 'When I am mentioned in a channel message', 
    icon: Bell, 
    description: 'Triggers when you are @mentioned in a channel.',
    category: 'Microsoft Teams',
    parameters: [
      { id: 'teamId', label: 'Team', type: 'text', placeholder: 'Select Team' },
      { id: 'channelId', label: 'Channel', type: 'text', placeholder: 'Select Channel' }
    ],
    code_view: "on_teams_mention(teamId='...', channelId='...')"
  },
  { 
    id: 'schedule', 
    label: 'Recurrence', 
    icon: Clock, 
    description: 'Triggered on a scheduled interval (daily, weekly, etc.)',
    category: 'General',
    parameters: [
      { id: 'interval', label: 'Interval', type: 'select', options: [
        { label: 'Minute', value: 'minute' },
        { label: 'Hour', value: 'hour' },
        { label: 'Day', value: 'day' },
        { label: 'Week', value: 'week' }
      ], required: true },
      { id: 'frequency', label: 'Frequency', type: 'text', placeholder: '1', required: true }
    ],
    code_view: "every(1, 'hour')"
  },
  { 
    id: 'webhook', 
    label: 'Webhook', 
    icon: Zap, 
    description: 'Triggered by an external HTTP webhook request',
    category: 'General',
    parameters: [
      { id: 'path', label: 'Webhook Path', type: 'text', placeholder: 'my-webhook-endpoint' }
    ],
    code_view: "on_webhook(path='my-webhook')"
  },
];

export const ACTION_TYPES = [
  { 
    id: 'http-action', 
    label: 'HTTP Request', 
    icon: Globe, 
    description: 'Make an outgoing HTTP call to any API',
    category: 'Fynite',
    parameters: [
      { id: 'uri', label: 'URI', type: 'text', placeholder: 'https://api.example.com', required: true },
      { id: 'method', label: 'Method', type: 'select', options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' }
      ], required: true },
      { id: 'headers', label: 'Headers', type: 'keyvalue' },
      { id: 'queries', label: 'Queries', type: 'keyvalue' },
      { id: 'body', label: 'Body', type: 'json' },
      { id: 'cookie', label: 'Cookie', type: 'text', placeholder: 'Enter HTTP cookie' }
    ],
    code_view: "{ label: 'GET', value: 'GET' }"
  },
  { 
    id: 'teams-send-message', 
    label: 'Send a message to a chat or channel', 
    icon: MessageSquare, 
    description: 'Post a message to a specific Teams channel or user.',
    category: 'Microsoft Teams',
    parameters: [
      { id: 'recipientType', label: 'Post in', type: 'select', options: [
        { label: 'Channel', value: 'channel' },
        { label: 'Chat', value: 'chat' }
      ], required: true },
      { id: 'recipientId', label: 'Recipient', type: 'text', placeholder: 'Select Channel or Chat', required: true },
      { id: 'message', label: 'Message', type: 'textarea', placeholder: 'Type your message here...', required: true }
    ],
    code_view: "teams.send_message(to='...', message='...')"
  },
  { 
    id: 'teams-create-chat', 
    label: 'Create a chat', 
    icon: MessageCircle, 
    description: 'Start a new chat with one or more participants.',
    category: 'Microsoft Teams',
    parameters: [
      { id: 'members', label: 'Members', type: 'text', placeholder: 'user1@example.com, user2@example.com', required: true },
      { id: 'topic', label: 'Topic', type: 'text', placeholder: 'Chat Topic' }
    ],
    code_view: "teams.create_chat(members=['...'], topic='...')"
  },
  { 
    id: 'email', 
    label: 'Send Email', 
    icon: Mail, 
    description: 'Send an email notification via SMTP or Outlook',
    category: 'General',
    parameters: [
      { id: 'to', label: 'To', type: 'text', placeholder: 'recipient@example.com', required: true },
      { id: 'subject', label: 'Subject', type: 'text', placeholder: 'Email Subject', required: true },
      { id: 'body', label: 'Body', type: 'textarea', placeholder: 'Email content...', required: true }
    ],
    code_view: "email.send(to='...', subject='...', body='...')"
  },
  { 
    id: 'slack', 
    label: 'Post to Slack', 
    icon: MessageSquare, 
    description: 'Send a message to a Slack channel or user',
    category: 'General',
    parameters: [
      { id: 'channel', label: 'Channel', type: 'text', placeholder: '#general', required: true },
      { id: 'message', label: 'Message', type: 'textarea', placeholder: 'Type your message here...', required: true }
    ],
    code_view: ""
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
  switch: Split,
};
 