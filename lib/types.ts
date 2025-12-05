// Temporary type definitions for AI SDK v5 compatibility

export interface Attachment {
  name?: string;
  contentType?: string;
  url: string;
}

export interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: any;
  state: 'partial-call' | 'call' | 'result';
  result?: any;
}
