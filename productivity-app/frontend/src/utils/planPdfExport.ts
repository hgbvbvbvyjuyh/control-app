import jsPDF from 'jspdf';
import type { Goal } from '../db';
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

export function exportGoalPlanPdf(args: {
  goalTitle: string;
  goalType: Goal['goalType'];
  plan: GoalPlanData | null;
  subGoals?: Goal[];
}) {
  const { goalTitle, goalType, plan, subGoals = [] } = args;

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

  drawLines([`Goal Type: ${goalType}`], { fontSize: 12 });
  y += 8;

  drawLines(['Plan'], { fontSize: 13, fontStyle: 'bold' });
  if (plan) {
    const planLines: string[] = [];
    for (const item of plan.items) {
      const itemText = (item.text ?? '').trim();
      planLines.push(`${item.label}: ${itemText || '—'}`);
    }

    // Render each item line, wrapping long text as needed.
    for (const pLine of planLines) {
      const wrapped = wrapText(doc, pLine, maxWidth);
      drawLines(wrapped, { fontSize: 11 });
    }
  } else {
    drawLines(['No plan saved for this goal.'], { fontSize: 11 });
  }

  if (subGoals.length > 0) {
    y += 8;
    drawLines(['Sub Goals'], { fontSize: 13, fontStyle: 'bold' });
    const sgLines = subGoals.map(g => {
      const title = Object.values(g.data)[0] || 'Untitled';
      return `${g.goalType}: ${title}`;
    });

    for (const line of sgLines) {
      drawLines(wrapText(doc, line, maxWidth), { fontSize: 11 });
    }
  }

  const filename = `plan-${slugifyFileName(goalTitle || 'untitled')}.pdf`;
  doc.save(filename);
}

