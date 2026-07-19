import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Exercise, RepetitionExercise, Step, TimeExercise } from '../types';
import { listExercises, saveExercise } from './exercises';
import { uid } from './ids';

// ────────────────────────────────────────────────────────────────────────────
// Helpers (kept self-contained so patches can evolve without touching seed.ts).
// ────────────────────────────────────────────────────────────────────────────

const newStep = (
  instruction: string,
  duration: number,
  internalCount: Step['internalCount'] = 'none'
): Step => ({
  id: uid(),
  instruction,
  duration,
  internalCount,
});

const repPyramid = (
  category: string,
  name: string,
  description: string,
  steps: Step[]
): RepetitionExercise => ({
  id: uid(),
  name,
  description,
  category,
  type: 'repetition',
  repetitions: 16,
  repCountingMode: 'pyramid8',
  steps,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const _ = (..._args: unknown[]) => undefined; // silence unused-variable lints if any

// Pattern helpers mirror those in seed.ts.
const patternA = (cat: string, name: string, description = '') =>
  repPyramid(cat, name, description, [
    newStep('monte', 1),
    newStep('retour', 1),
  ]);

const patternC = (cat: string, name: string, description = '') =>
  repPyramid(cat, name, description, [
    newStep('tiens', 3, 'linear'),
    newStep('retour', 1),
  ]);

const patternD = (cat: string, name: string, description = '') =>
  repPyramid(cat, name, description, [
    newStep('tiens le plus longtemps possible', 16, 'pyramid8'),
    newStep('retour', 1),
  ]);

const patternE = (cat: string, name: string, description = '') =>
  repPyramid(cat, name, description, [
    newStep('vers le haut', 8, 'linear'),
    newStep('vers le bas', 8, 'reverse'),
    newStep('retour', 1),
  ]);

// --- Generic time-based helpers (used for TRE and other patches) ---

const timeWithMode = (
  cat: string,
  name: string,
  description: string,
  seconds: number,
  countingMode: 'linear' | 'reverse' | 'silent'
): TimeExercise => ({
  id: uid(),
  name,
  description,
  category: cat,
  type: 'time',
  duration: seconds,
  pace: 1,
  countingMode,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const timeSilent = (cat: string, name: string, description: string, seconds: number) =>
  timeWithMode(cat, name, description, seconds, 'silent');

const timeReverse = (cat: string, name: string, description: string, seconds: number) =>
  timeWithMode(cat, name, description, seconds, 'reverse');

// --- Generic repetition helper (custom rep count, no pyramid) ---

const repCustom = (
  cat: string,
  name: string,
  description: string,
  steps: Step[],
  reps: number
): RepetitionExercise => ({
  id: uid(),
  name,
  description,
  category: cat,
  type: 'repetition',
  repetitions: reps,
  repCountingMode: 'linear',
  steps,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// ────────────────────────────────────────────────────────────────────────────
// Patch v1 : add the missing "côté droit (2e fois)" exercises in the Barre
// programme. They are inserted right after the existing "côté gauche (2e
// fois)" of the same family, so the workout flow becomes
// droite, gauche, gauche (2e), DROITE (2e), repos.
// ────────────────────────────────────────────────────────────────────────────

const PATCH_KEY = 'calisthenics.patch.bar-rightSecond.v1';

interface Insertion {
  afterName: string;
  exercise: Exercise;
}

function buildInsertions(): Insertion[] {
  return [
    {
      afterName: 'Bullette — barre à gauche (2e fois)',
      exercise: patternA(
        'bar',
        'Bullette — barre à droite (2e fois)',
        'Pieds pliés.'
      ),
    },
    {
      afterName: 'Bullette — barre à gauche, jambes tendues (2e fois)',
      exercise: patternA(
        'bar',
        'Bullette — barre à droite, jambes tendues (2e fois)',
        'Jambes droites.'
      ),
    },
    {
      afterName: 'Tractions — bras gauche plus haut (2e fois)',
      exercise: patternC(
        'bar',
        'Tractions — bras droit plus haut (2e fois)',
        'Tiens 3 secondes en haut.'
      ),
    },
    {
      afterName: 'Gainage — bras gauche plus haut (2e fois)',
      exercise: patternD(
        'bar',
        'Gainage — bras droit plus haut (2e fois)',
        'Hold le plus longtemps possible.'
      ),
    },
    {
      afterName: 'Crayon — bras gauche le long de la barre (2e fois)',
      exercise: patternD(
        'bar',
        'Crayon — bras droit le long de la barre (2e fois)',
        'Hold le plus longtemps possible.'
      ),
    },
    {
      afterName: 'Push-up — mollet gauche (2e fois)',
      exercise: patternE(
        'bar',
        'Push-up — mollet droit (2e fois)',
        'Cycle 8s montée + 8s descente.'
      ),
    },
    {
      afterName: 'V — bras gauche plié sur la barre (2e fois)',
      exercise: patternC(
        'bar',
        'V — bras droit plié sur la barre (2e fois)',
        'Tiens 3 secondes.'
      ),
    },
  ];
}

/** Insert `ex` right after the exercise named `afterName` (within same category). */
async function insertAfter(afterName: string, ex: Exercise): Promise<boolean> {
  const all = await listExercises();
  // Skip if an exercise with this name already exists in the same category.
  if (all.some((e) => e.name === ex.name && (e.category ?? 'mat') === ex.category)) {
    return false;
  }
  const target = all.find(
    (e) => e.name === afterName && (e.category ?? 'mat') === ex.category
  );
  if (!target) return false;
  // Find the exercise immediately after the target in the sorted list
  // (already sorted ascending by createdAt in listExercises).
  const idx = all.findIndex((e) => e.id === target.id);
  const next = all[idx + 1];
  const createdAt = next
    ? (target.createdAt + next.createdAt) / 2
    : target.createdAt + 1;
  await saveExercise({ ...ex, createdAt, updatedAt: createdAt });
  return true;
}

/** Categories whose programme was added after the original v6 seed. */
const POST_V6_CATEGORIES: ReadonlyArray<string> = [
  'front-splits',
  'postpartum',
  'arms',
  'pilates',
  'yoga',
  'face-yoga',
  'tre',
];

// Bumped to v2 when 'yoga' was added; bump again to ship more new categories.
const POST_V6_PATCH_KEY = 'calisthenics.patch.postV6Categories.v2';

/**
 * One-time refresh of the default emojis for bar/mat/splits — they used boring
 * Unicode symbols (—, ▢, ⤤) and we now ship prettier ones. Only updates the
 * emoji when the user still has the original default (so user customisations
 * are preserved).
 */
const EMOJI_REFRESH_KEY = 'calisthenics.patch.defaultEmojiRefresh.v1';
const EMOJI_REFRESH_RULES: ReadonlyArray<{
  id: string;
  oldEmojis: ReadonlyArray<string>;
  newEmoji: string;
}> = [
  { id: 'bar', oldEmojis: ['—', '-', ''], newEmoji: '💃' },
  { id: 'mat', oldEmojis: ['▢', '□', ''], newEmoji: '🪷' },
  { id: 'splits', oldEmojis: ['⤤', '↗', ''], newEmoji: '🦋' },
];

// ────────────────────────────────────────────────────────────────────────────
// Patch : full TRE programme (7 exercices décomposés) — séquence
// d'activation des vibrations / tremor du corps, traduite et développée
// à partir d'une vidéo de pratique.
// ────────────────────────────────────────────────────────────────────────────

const TRE_FULL_PATCH_KEY = 'calisthenics.patch.treFull.v1';

function buildTreFullExercises(): Exercise[] {
  return [
    // ===== Exercice 1 : Chaîne musculaire — transfert de poids =====
    repCustom(
      'tre',
      'Chaîne musculaire — transfert de poids',
      "Debout, pieds écartés largeur d'épaules, genoux tendus. 80% du poids alterné entre l'extérieur d'un pied et l'intérieur de l'autre. À la fin, reviens au centre, respire et évalue ce que ton corps ressent.",
      [
        newStep('côté droit, 3 respirations profondes', 24),
        newStep('côté gauche, 3 respirations profondes', 24),
      ],
      3
    ),

    // ===== Exercice 2 : Activation cuisses & biceps =====
    repCustom(
      'tre',
      'Activation cuisses & biceps — jambe droite',
      "Active le quadriceps de la jambe droite. Le poids du corps repose uniquement sur le pied qui prend appui. Continue jusqu'à 7/10 de fatigue musculaire.",
      [newStep('monte', 2, 'linear'), newStep('descends', 2, 'reverse')],
      10
    ),
    repCustom(
      'tre',
      'Activation cuisses & biceps — jambe gauche',
      'Idem, sur la jambe gauche.',
      [newStep('monte', 2, 'linear'), newStep('descends', 2, 'reverse')],
      10
    ),

    // ===== Exercice 3 : Squat sur une jambe contre le mur =====
    repCustom(
      'tre',
      'Squat sur une jambe contre le mur — droite',
      "Face au mur (assez près), soulève la jambe gauche. Avec la jambe droite, descends comme pour t'asseoir sur une chaise derrière toi. Le genou ne dépasse pas le pied. Vise 7/10 de fatigue.",
      [
        newStep('descends', 3, 'linear'),
        newStep('tiens', 2, 'linear'),
        newStep('remonte', 3, 'reverse'),
      ],
      10
    ),
    repCustom(
      'tre',
      'Squat sur une jambe contre le mur — gauche',
      "Idem, sur la jambe gauche (jambe droite soulevée).",
      [
        newStep('descends', 3, 'linear'),
        newStep('tiens', 2, 'linear'),
        newStep('remonte', 3, 'reverse'),
      ],
      10
    ),

    // ===== Exercice 4 : Étirement des adducteurs =====
    repCustom(
      'tre',
      'Étirement des adducteurs — 4 positions',
      "Pieds parallèles écartés, genoux légèrement fléchis. Relâche le haut du corps vers le sol, tête et nuque détendues. Touche le sol avec les mains si possible. 4 positions, 3 respirations profondes chacune. Remonte doucement à la fin pour ne pas crisper le dos.",
      [
        newStep('au centre, respire profondément 3 fois', 24),
        newStep('marche les pieds vers la gauche, respire 3 fois', 24),
        newStep('marche vers la droite, respire 3 fois', 24),
        newStep('reviens entre les jambes, respire 3 fois', 24),
      ],
      1
    ),

    // ===== Exercice 5 : Bascule du bassin avec rotation =====
    repCustom(
      'tre',
      'Bascule du bassin avec rotation',
      "Pieds écartés largeur d'épaules, genoux tendus. Mains au bas du dos ou sur les fesses, coudes resserrés pour ouvrir la cage thoracique. Bassin en rétroversion (pubis vers l'avant). Pousse le bassin pour le bloquer dans les jambes. L'impulsion de rotation vient du ventre, le buste et la tête suivent.",
      [
        newStep('face avant, bassin en rétroversion, respire 3 fois', 24),
        newStep('rotation côté droit, respire 3 fois', 24),
        newStep('rotation côté gauche, respire 3 fois', 24),
        newStep('retour face avant, respire 3 fois', 24),
      ],
      1
    ),

    // ===== Exercice 6 : Chaise contre le mur (4 min) + finition =====
    repCustom(
      'tre',
      'Chaise contre le mur — 4 minutes',
      "Dos contre le mur, descends en chaise (cuisses parallèles au sol, genoux à 90°). Tiens. Si tu atteins 7/10 de fatigue : remonte de 4 cm ou rapproche les pieds du mur. Tu peux faire 2 à 3 ajustements pendant les 4 minutes. La voix annonce chaque minute.",
      [newStep('tiens la chaise', 60)],
      4
    ),
    timeReverse(
      'tre',
      'Finition chaise — penche-toi en avant',
      "Pousse contre le mur avec une main et penche-toi vers l'avant. Tête et nuque relâchées.",
      30
    ),

    // ===== Exercice 7 : Séquence au sol — Position de la grenouille =====
    timeReverse(
      'tre',
      'Grenouille — bassin levé',
      "Allongée sur le dos en position grenouille (pieds joints, près du bassin, genoux ouverts). Soulève le bassin et tiens. Repose le bassin à la fin.",
      60
    ),
    timeReverse(
      'tre',
      'Grenouille — genoux levés 5 cm (étape 1)',
      "Écarte légèrement les pieds (alignés l'un avec l'autre). Lève les genoux de 5 cm pour activer la tension musculaire. Tiens.",
      60
    ),
    timeReverse(
      'tre',
      'Grenouille — genoux levés (étape 2)',
      "Lève les genoux d'un cran de plus (5 cm supplémentaires). Tiens.",
      60
    ),
    timeReverse(
      'tre',
      'Grenouille — genoux levés (étape 3)',
      "Écarte plus les pieds, lève encore les genoux de 5 cm. Tiens.",
      60
    ),
    timeSilent(
      'tre',
      'Vibrations pieds à plat — 15 min',
      "Pose les pieds à plat au sol et laisse le processus corporel se dérouler. À tout moment, tu peux étirer les jambes pour t'arrêter, ou poser pieds + mains au sol pour retrouver le calme. Reprends ensuite en pliant les genoux en position grenouille.",
      900
    ),
    timeSilent(
      'tre',
      'Repos final sur le dos — 5 min',
      "Étire les jambes et reste sur le dos. Tu peux rouler sur un côté ou sur le ventre selon ta préférence.",
      300
    ),
    timeReverse(
      'tre',
      'Retour assis (fin de séance)',
      "Roule sur un côté, utilise tes mains pour t'asseoir (évite d'appuyer sur le dos).",
      20
    ),
  ];
}

async function applyTreFullPatch(): Promise<void> {
  const seen = await AsyncStorage.getItem(TRE_FULL_PATCH_KEY);
  if (seen) return;
  const all = await listExercises();
  const existing = new Set(
    all.map((e) => `${e.category ?? 'mat'}::${e.name}`)
  );
  let stamp = Date.now();
  for (const ex of buildTreFullExercises()) {
    const key = `${ex.category}::${ex.name}`;
    if (existing.has(key)) continue;
    stamp += 1;
    await saveExercise({ ...ex, createdAt: stamp, updatedAt: stamp });
    existing.add(key);
  }
  await AsyncStorage.setItem(TRE_FULL_PATCH_KEY, '1');
}

async function refreshDefaultEmojis(): Promise<void> {
  const seen = await AsyncStorage.getItem(EMOJI_REFRESH_KEY);
  if (seen) return;
  const { listCategories, saveCategory } = await import('./categories');
  const cats = await listCategories();
  for (const rule of EMOJI_REFRESH_RULES) {
    const cat = cats.find((c) => c.id === rule.id);
    if (!cat) continue;
    const current = cat.emoji ?? '';
    if (rule.oldEmojis.includes(current)) {
      await saveCategory({ ...cat, emoji: rule.newEmoji });
    }
  }
  await AsyncStorage.setItem(EMOJI_REFRESH_KEY, '1');
}

export async function applyPatches(): Promise<void> {
  // The insertAfter helper already skips when an exercise with the same name
  // already exists, so this function is safe to call on every launch — we no
  // longer gate on `PATCH_KEY` (it would prevent recovery after a wipe).
  for (const { afterName, exercise } of buildInsertions()) {
    await insertAfter(afterName, exercise);
  }
  await AsyncStorage.setItem(PATCH_KEY, '1');

  // Inject the new categories' programmes for existing users (gated once
  // per user to avoid re-adding exos they may have intentionally removed).
  const seenPostV6 = await AsyncStorage.getItem(POST_V6_PATCH_KEY);
  if (!seenPostV6) {
    const { restoreSeedExercises } = await import('./seed');
    for (const catId of POST_V6_CATEGORIES) {
      await restoreSeedExercises(catId);
    }
    await AsyncStorage.setItem(POST_V6_PATCH_KEY, '1');
  }

  // Replace boring default emojis (—, ▢, ⤤) with the new pretty ones.
  await refreshDefaultEmojis();

  // Inject the full TRE programme (7 exercises décomposés).
  await applyTreFullPatch();
}
