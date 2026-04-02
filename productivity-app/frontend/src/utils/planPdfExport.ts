import jsPDF from 'jspdf';
import type { Goal, Session, JournalEntry } from '../db';
import type { GoalPlanData } from './goalPlan';

function slugifyFileName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let cur = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i]!;
    const test = `${cur} ${word}`;
    if (doc.getTextWidth(test) <= maxWidth) {
      cur = test;
    } else {
      lines.push(cur);
      cur = word;
    }
  }

  lines.push(cur);
  return lines;
}

function pickGoalTitle(goal: Goal): string {
  return Object.values(goal.data)[0] || 'Untitled';
}

function formatDateLabel(isoOrTs: string | number | null | undefined): string {
  if (isoOrTs == null) return '—';
  const d = typeof isoOrTs === 'number' ? new Date(isoOrTs) : new Date(isoOrTs);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 10);
}

export function exportGoalPlanPdf(args: {
  fileName: string;
  goal: Goal;
  plan: GoalPlanData | null;
  subGoals?: Goal[];
  journalAnswers?: Array<{
    date: string;
    q1?: string;
    q2?: string;
    q3?: string;
  }>;
  sessionSummary?: {
    total: number;
    completed: number;
    missed: number;
    pendingOrActive?: number;
  };
}) {
  const {
    fileName,
    goal,
    plan,
    subGoals = [],
    journalAnswers = [],
    sessionSummary,
  } = args;

  const goalTitle = pickGoalTitle(goal);
  const goalType = goal.goalType;
  const goalCategory = goal.category || 'health';
  const goalStatus = goal.status || 'active';
  const goalDate = goal.completedAt ?? goal.createdAt;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const marginY = 44;
  const maxWidth = pageWidth - marginX * 2;
  const lineHeight = 16;

  let y = marginY;
  const drawLines = (lines: string[], opts?: { fontSize?: number; fontStyle?: 'normal' | 'bold' }) => {
    const fontSize = opts?.fontSize ?? 11;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', opts?.fontStyle === 'bold' ? 'bold' : 'normal');

    for (const line of lines) {
      if (y > pageHeight - marginY) {
        doc.addPage();
        y = marginY;
      }
      doc.text(line, marginX, y);
      y += lineHeight;
    }
  };

  drawLines([goalTitle || 'Untitled'], { fontSize: 18, fontStyle: 'bold' });
  y += 4;

  drawLines(
    [`Goal Type: ${goalType}`, `Category: ${goalCategory}`, `Status: ${goalStatus}`, `Date: ${formatDateLabel(goalDate)}`],
    { fontSize: 12 }
  );
  y += 8;

  // Plan
  drawLines(['Plan'], { fontSize: 13, fontStyle: 'bold' });
  if (!plan || plan.items.length === 0) {
    y += lineHeight;
    drawLines(['No data'], { fontSize: 11 });
  } else {
    for (const item of plan.items) {
      const itemText = (item.text ?? '').trim();
      const line = `${item.label}: ${itemText || '—'}`;
      drawLines(wrapText(doc, line, maxWidth), { fontSize: 11 });
    }
  }

  // Sub-goals
  y += 8;
  drawLines(['Sub Goals'], { fontSize: 13, fontStyle: 'bold' });
  if (subGoals.length === 0) {
    drawLines(['No data'], { fontSize: 11 });
  } else {
    for (const g of subGoals) {
      const title = pickGoalTitle(g);
      const line = `${g.goalType}: ${title}`;
      drawLines(wrapText(doc, line, maxWidth), { fontSize: 11 });
    }
  }

  // Journal answers (answers only)
  y += 8;
  drawLines(['Journal Answers'], { fontSize: 13, fontStyle: 'bold' });
  if (journalAnswers.length === 0) {
    drawLines(['No data'], { fontSize: 11 });
  } else {
    for (const j of journalAnswers) {
      drawLines([`Date: ${j.date}`], { fontSize: 11, fontStyle: 'bold' });
      drawLines(
        [
          `Q1: ${(j.q1 ?? '').trim() || '—'}`,
          `Q2: ${(j.q2 ?? '').trim() || '—'}`,
          `Q3: ${(j.q3 ?? '').trim() || '—'}`,
        ],
        { fontSize: 11 }
      );
    }
  }

  // Session summary
  y += 8;
  drawLines(['Sessions Summary'], { fontSize: 13, fontStyle: 'bold' });
  if (!sessionSummary || sessionSummary.total === 0) {
    drawLines(['No data'], { fontSize: 11 });
  } else {
    drawLines(
      [
        `Total: ${sessionSummary.total}`,
        `Completed: ${sessionSummary.completed}`,
        `Missed: ${sessionSummary.missed}`,
        sessionSummary.pendingOrActive != null
          ? `Pending/Active: ${sessionSummary.pendingOrActive}`
          : '',
      ].filter(Boolean),
      { fontSize: 11 }
    );
  }

  const safeFileName = fileName.trim() || `summary-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(safeFileName);
}

