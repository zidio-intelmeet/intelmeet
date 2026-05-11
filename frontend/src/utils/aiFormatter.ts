/**
 * AI Response Formatting Utilities
 * Formats AI-generated summaries, action items, and other responses
 */

export function formatSummary(text: string): string {
  if (!text) return '';
  
  // Clean up markdown formatting
  return text
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/`/g, '') // Remove code markers
    .trim();
}

export function parseActionItems(text: string): Array<{ title: string; priority?: string }> {
  if (!text) return [];

  const items: Array<{ title: string; priority?: string }> = [];
  
  // Split by common separators (-, •, *, etc.)
  const lines = text.split(/[\n•\-\*]/);

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      // Extract priority if mentioned
      const priorityMatch = trimmed.match(/\(high|medium|low\)/i);
      const priority = priorityMatch ? priorityMatch[0].toLowerCase() : undefined;
      const title = trimmed.replace(/\(high|medium|low\)/i, '').trim();

      if (title) {
        items.push({ title, priority });
      }
    }
  });

  return items;
}

export function extractDecisions(text: string): string[] {
  if (!text) return [];

  const decisions: string[] = [];
  const decisionPatterns = [
    /decision:\s*(.+?)(?=\n|$)/gi,
    /decided:\s*(.+?)(?=\n|$)/gi,
    /agreed to\s*(.+?)(?=\n|$)/gi,
  ];

  decisionPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      decisions.push(match[1].trim());
    }
  });

  return decisions;
}

export function generateMeetingSummaryTitle(text: string): string {
  if (!text) return 'Untitled Meeting';

  // Get first meaningful sentence
  const sentences = text.split(/[.!?]+/);
  const firstSentence = sentences[0]?.trim();

  if (firstSentence && firstSentence.length > 5) {
    // Limit to 60 chars
    return firstSentence.length > 60
      ? firstSentence.substring(0, 60) + '...'
      : firstSentence;
  }

  return 'Meeting Summary';
}

export function extractKeyPoints(text: string): string[] {
  if (!text) return [];

  const points: string[] = [];
  const lines = text.split('\n');

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.length > 10 && (trimmed.startsWith('-') || trimmed.startsWith('•'))) {
      points.push(trimmed.replace(/^[-•]\s*/, ''));
    }
  });

  return points;
}

export function formatForDisplay(text: string): string {
  return text
    .replace(/\n\n+/g, '\n\n') // Normalize multiple newlines
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
