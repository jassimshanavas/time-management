import type { LiveUpdateNode, JournalThread } from '@/types';

export const getReflectionsOnly = (notes: string): string => {
  if (!notes) return '';
  const marker = '### Chronos Session Log';
  const idx = notes.indexOf(marker);
  if (idx !== -1) {
    return notes.substring(0, idx).trim();
  }
  return notes.trim();
};

export const compileUpdatesToMarkdown = (updates: LiveUpdateNode[], threads?: JournalThread[]): string => {
  // Group updates by threadId
  const threadMap: Record<string, LiveUpdateNode[]> = {};
  const unthreadedNodes: LiveUpdateNode[] = [];

  updates.forEach((node) => {
    if (node.threadId && threads?.some((t) => t.id === node.threadId)) {
      if (!threadMap[node.threadId]) {
        threadMap[node.threadId] = [];
      }
      threadMap[node.threadId].push(node);
    } else {
      unthreadedNodes.push(node);
    }
  });

  let markdown = '### Chronos Session Log\n';

  // 1. Render threaded sections
  if (threads && threads.length > 0) {
    threads.forEach((thread) => {
      const nodes = threadMap[thread.id] || [];
      if (nodes.length === 0) return;

      markdown += `\n**Thread: ${thread.name} (${thread.status})**\n`;
      nodes.forEach((node) => {
        const indentSpaces = '  '.repeat(node.indent || 0);
        const badge = `\`[${node.elapsedTime}]\``;
        const phaseBadge = node.phase ? `\`[phase:${node.phase}]\`` : '';
        const bullet = node.type === 'todo' ? (node.completed ? '- [x]' : '- [ ]') : '-';
        markdown += `${indentSpaces}${bullet} ${badge}${phaseBadge ? ' ' + phaseBadge : ''} ${node.text}\n`;
      });
    });
  }

  // 2. Render unthreaded section
  if (unthreadedNodes.length > 0) {
    markdown += `\n**General / Unthreaded Work**\n`;
    unthreadedNodes.forEach((node) => {
      const indentSpaces = '  '.repeat(node.indent || 0);
      const badge = `\`[${node.elapsedTime}]\``;
      const phaseBadge = node.phase ? `\`[phase:${node.phase}]\`` : '';
      const bullet = node.type === 'todo' ? (node.completed ? '- [x]' : '- [ ]') : '-';
      markdown += `${indentSpaces}${bullet} ${badge}${phaseBadge ? ' ' + phaseBadge : ''} ${node.text}\n`;
    });
  }

  return markdown;
};
