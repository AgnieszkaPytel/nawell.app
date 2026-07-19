import type {
  CountingMode,
  Exercise,
  ExerciseCategory,
  RepetitionExercise,
  Step,
  TimeExercise,
} from '../types';
import { uid } from './ids';

/**
 * CSV schema (one row per *step* for repetition exercises, one row per
 * exercise for time exercises). The parser groups rows by `name` + `category`
 * to assemble each exercise.
 *
 *  name | category | description | type
 *       | repetitions | repCountingMode      ← rep-only
 *       | duration | pace | countingMode     ← time-only
 *       | step_order | step_instruction | step_duration | step_count   ← rep-only
 */

export const CSV_HEADERS = [
  'name',
  'category',
  'description',
  'type',
  'repetitions',
  'repCountingMode',
  'duration',
  'pace',
  'countingMode',
  'step_order',
  'step_instruction',
  'step_duration',
  'step_count',
] as const;

const isCountingMode = (s: string): s is CountingMode =>
  s === 'linear' || s === 'reverse' || s === 'pyramid8';

const isStepCount = (s: string): s is Step['internalCount'] =>
  s === 'none' || isCountingMode(s);

// ── Parser ────────────────────────────────────────────────────────────────

/** RFC-4180-ish CSV parser: handles quoted fields, escaped quotes, commas inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export interface ImportResult {
  exercises: Exercise[];
  errors: string[];
}

export function parseExercisesCsv(text: string): ImportResult {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { exercises: [], errors: ['Fichier CSV vide.'] };
  }
  const header = rows[0].map((h) => h.trim());
  const idx = (col: string) => header.indexOf(col);

  const required = ['name', 'category', 'type'];
  const missing = required.filter((c) => idx(c) === -1);
  if (missing.length > 0) {
    return {
      exercises: [],
      errors: [`Colonnes manquantes : ${missing.join(', ')}`],
    };
  }

  const errors: string[] = [];
  // Group rows by exercise key (name + category)
  type Group = {
    rows: string[][];
    rowNumbers: number[];
  };
  const groups = new Map<string, Group>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = (row[idx('name')] ?? '').trim();
    const category = (row[idx('category')] ?? '').trim().toLowerCase();
    if (!name) continue;
    const key = `${category}::${name}`;
    if (!groups.has(key)) groups.set(key, { rows: [], rowNumbers: [] });
    groups.get(key)!.rows.push(row);
    groups.get(key)!.rowNumbers.push(i + 1);
  }

  const exercises: Exercise[] = [];
  let timestamp = Date.now();

  for (const [key, group] of groups.entries()) {
    const first = group.rows[0];
    const get = (col: string): string =>
      idx(col) === -1 ? '' : (first[idx(col)] ?? '').trim();

    const name = get('name');
    const rawCat = get('category').toLowerCase();
    const category: ExerciseCategory =
      rawCat === 'bar' ? 'bar' : 'mat';
    const description = get('description');
    const type = get('type').toLowerCase();
    const baseRow = group.rowNumbers[0];

    if (type !== 'time' && type !== 'repetition') {
      errors.push(
        `Ligne ${baseRow}: type invalide « ${type} » (attendu : time ou repetition).`
      );
      continue;
    }

    timestamp += 1;
    const base = {
      id: uid(),
      name,
      description,
      category,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (type === 'time') {
      const countingMode = get('countingMode');
      const cm: CountingMode = isCountingMode(countingMode)
        ? countingMode
        : 'linear';
      const duration =
        cm === 'pyramid8'
          ? 16
          : Math.max(1, parseInt(get('duration'), 10) || 1);
      const pace = Math.max(0.25, parseFloat(get('pace')) || 1);
      const ex: TimeExercise = {
        ...base,
        type: 'time',
        duration,
        pace,
        countingMode: cm,
      };
      exercises.push(ex);
      continue;
    }

    // Repetition exercise: build steps from each row.
    const repCountingMode = get('repCountingMode');
    const rcm: CountingMode = isCountingMode(repCountingMode)
      ? repCountingMode
      : 'linear';
    const repetitions =
      rcm === 'pyramid8'
        ? 16
        : Math.max(1, parseInt(get('repetitions'), 10) || 1);

    const stepRows = [...group.rows];
    stepRows.sort((a, b) => {
      const ai = idx('step_order');
      const av = ai === -1 ? 0 : parseInt(a[ai] ?? '0', 10) || 0;
      const bv = ai === -1 ? 0 : parseInt(b[ai] ?? '0', 10) || 0;
      return av - bv;
    });

    const steps: Step[] = [];
    for (const row of stepRows) {
      const instruction = (
        idx('step_instruction') === -1 ? '' : row[idx('step_instruction')] ?? ''
      ).trim();
      if (!instruction) continue;
      const duration = Math.max(
        1,
        parseInt(
          idx('step_duration') === -1 ? '0' : row[idx('step_duration')] ?? '0',
          10
        ) || 1
      );
      const stepCountRaw = (
        idx('step_count') === -1 ? '' : row[idx('step_count')] ?? ''
      ).trim();
      const internalCount: Step['internalCount'] = isStepCount(stepCountRaw)
        ? stepCountRaw
        : 'none';
      steps.push({ id: uid(), instruction, duration, internalCount });
    }

    if (steps.length === 0) {
      errors.push(
        `Ligne ${baseRow}: exercice « ${name} » de type repetition sans étape valide.`
      );
      continue;
    }

    const ex: RepetitionExercise = {
      ...base,
      type: 'repetition',
      repetitions,
      repCountingMode: rcm,
      steps,
    };
    exercises.push(ex);
  }

  return { exercises, errors };
}

// ── Serializer ────────────────────────────────────────────────────────────

function escapeField(v: string | number): string {
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function serializeExercisesCsv(exercises: Exercise[]): string {
  const lines: string[] = [];
  lines.push(CSV_HEADERS.join(','));

  for (const ex of exercises) {
    if (ex.type === 'time') {
      lines.push(
        [
          escapeField(ex.name),
          ex.category ?? 'mat',
          escapeField(ex.description ?? ''),
          'time',
          '',
          '',
          ex.duration,
          ex.pace,
          ex.countingMode ?? 'linear',
          '',
          '',
          '',
          '',
        ].join(',')
      );
    } else {
      ex.steps.forEach((step, i) => {
        lines.push(
          [
            escapeField(ex.name),
            ex.category ?? 'mat',
            escapeField(ex.description ?? ''),
            'repetition',
            ex.repetitions,
            ex.repCountingMode ?? 'linear',
            '',
            '',
            '',
            i + 1,
            escapeField(step.instruction),
            step.duration,
            step.internalCount,
          ].join(',')
        );
      });
    }
  }
  return lines.join('\n');
}

// ── Template ──────────────────────────────────────────────────────────────

export function templateCsv(): string {
  const header = CSV_HEADERS.join(',');
  const examples = [
    // Repetition example with 2 steps
    [
      'Squat',
      'mat',
      'Fessiers et quadriceps. Dos neutre.',
      'repetition',
      '16',
      'pyramid8',
      '',
      '',
      '',
      '1',
      'descends',
      '1',
      'none',
    ].join(','),
    [
      'Squat',
      'mat',
      'Fessiers et quadriceps. Dos neutre.',
      'repetition',
      '16',
      'pyramid8',
      '',
      '',
      '',
      '2',
      'tiens',
      '3',
      'linear',
    ].join(','),
    // Time example
    [
      'Planche au sol',
      'mat',
      'Gainage central.',
      'time',
      '',
      '',
      '16',
      '1',
      'pyramid8',
      '',
      '',
      '',
      '',
    ].join(','),
  ];
  return [header, ...examples].join('\n');
}
