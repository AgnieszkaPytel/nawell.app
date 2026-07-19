import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Exercise,
  ExerciseCategory,
  RepetitionExercise,
  Step,
  TimeExercise,
} from '../types';
import { ensureDefaultCategories } from './categories';
import { listExercises, saveExercise } from './exercises';
import { uid } from './ids';

const SEED_KEY = 'calisthenics.seeded.v6';
const STORAGE_KEY = 'calisthenics.exercises.v1';

let order = 0;
const stamp = () => Date.now() + order++;

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

const repExercise = (
  category: ExerciseCategory,
  name: string,
  description: string,
  steps: Step[],
  opts?: { repetitions?: number; pyramid?: boolean }
): RepetitionExercise => {
  const t = stamp();
  return {
    id: uid(),
    name,
    description,
    category,
    type: 'repetition',
    repetitions: opts?.pyramid ? 16 : opts?.repetitions ?? 16,
    repCountingMode: opts?.pyramid === false ? 'linear' : 'pyramid8',
    steps,
    createdAt: t,
    updatedAt: t,
  };
};

const timeExercise = (
  category: ExerciseCategory,
  name: string,
  description: string,
  duration: number,
  opts?: { pace?: number; pyramid?: boolean; reverse?: boolean }
): TimeExercise => {
  const t = stamp();
  return {
    id: uid(),
    name,
    description,
    category,
    type: 'time',
    duration: opts?.pyramid ? 16 : duration,
    pace: opts?.pace ?? 1,
    countingMode: opts?.pyramid
      ? 'pyramid8'
      : opts?.reverse
      ? 'reverse'
      : 'linear',
    createdAt: t,
    updatedAt: t,
  };
};

// --- Pattern helpers (match the polish CSV structure) -----------------------

const patternA = (cat: ExerciseCategory, name: string, description = '') =>
  repExercise(
    cat,
    name,
    description,
    [newStep('monte', 1), newStep('retour', 1)],
    { pyramid: true }
  );

const patternB = (cat: ExerciseCategory, name: string, description = '') =>
  repExercise(
    cat,
    name,
    description,
    [newStep('monte sur deux temps', 2, 'linear'), newStep('retour', 1)],
    { pyramid: true }
  );

const patternC = (cat: ExerciseCategory, name: string, description = '') =>
  repExercise(
    cat,
    name,
    description,
    [newStep('tiens', 3, 'linear'), newStep('retour', 1)],
    { pyramid: true }
  );

const patternD = (cat: ExerciseCategory, name: string, description = '') =>
  repExercise(
    cat,
    name,
    description,
    [
      newStep('tiens le plus longtemps possible', 16, 'pyramid8'),
      newStep('retour', 1),
    ],
    { pyramid: true }
  );

const patternE = (cat: ExerciseCategory, name: string, description = '') =>
  repExercise(
    cat,
    name,
    description,
    [
      newStep('vers le haut', 8, 'linear'),
      newStep('vers le bas', 8, 'reverse'),
      newStep('retour', 1),
    ],
    { pyramid: true }
  );

const patternF = (cat: ExerciseCategory, name: string, description = '') =>
  timeExercise(cat, name, description, 16, { pyramid: true });

const rest = (cat: ExerciseCategory, label = 'Repos') =>
  timeExercise(cat, label, 'Récupère, respire.', 15, { reverse: true });

/** 15-second linear hold — used for stretching (étirements). */
const hold15 = (cat: ExerciseCategory, name: string, description: string) =>
  timeExercise(cat, name, description, 15);

// --- Full programme (translated from the polish CSV) ------------------------

const PROGRAMME: Exercise[] = [
  // ===== Barre =====
  patternA('bar', 'Bullette — barre à droite', 'Pieds pliés, tirage côté droit.'),
  patternA('bar', 'Bullette — barre à gauche', 'Pieds pliés, tirage côté gauche.'),
  patternA('bar', 'Bullette — barre à gauche (2e fois)', 'Pieds pliés.'),
  rest('bar'),
  patternA('bar', 'Bullette — barre à droite, jambes tendues', 'Jambes droites.'),
  patternA('bar', 'Bullette — barre à gauche, jambes tendues', 'Jambes droites.'),
  patternA('bar', 'Bullette — barre à gauche, jambes tendues (2e fois)', ''),
  rest('bar'),
  patternC('bar', 'Tractions — bras droit plus haut', 'Tiens 3 secondes en haut.'),
  patternC('bar', 'Tractions — bras gauche plus haut', 'Tiens 3 secondes en haut.'),
  patternC('bar', 'Tractions — bras gauche plus haut (2e fois)', ''),
  rest('bar'),
  patternD('bar', 'Gainage — bras droit plus haut', 'Hold le plus longtemps possible.'),
  patternD('bar', 'Gainage — bras gauche plus haut', 'Hold le plus longtemps possible.'),
  patternD('bar', 'Gainage — bras gauche plus haut (2e fois)', ''),
  rest('bar'),
  patternD(
    'bar',
    'Crayon — bras droit tendu le long de la barre',
    'Hold le plus longtemps possible.'
  ),
  patternD(
    'bar',
    'Crayon — bras gauche tendu le long de la barre',
    'Hold le plus longtemps possible.'
  ),
  patternD('bar', 'Crayon — bras gauche le long de la barre (2e fois)', ''),
  rest('bar'),
  patternE('bar', 'Push-up — mollet droit', 'Cycle 8s montée + 8s descente.'),
  patternE('bar', 'Push-up — mollet gauche', 'Cycle 8s montée + 8s descente.'),
  patternE('bar', 'Push-up — mollet gauche (2e fois)', ''),
  rest('bar'),
  patternC('bar', 'V — bras droit plié sur la barre', 'Tiens 3 secondes.'),
  patternC('bar', 'V — bras gauche plié sur la barre', 'Tiens 3 secondes.'),
  patternC('bar', 'V — bras gauche plié sur la barre (2e fois)', ''),
  rest('bar'),
  timeExercise(
    'bar',
    'Grimper au plafond',
    'Grimpe le long de la barre en alternant mains et pieds, librement.',
    30,
    { reverse: true }
  ),
  rest('bar'),

  // ===== Tapis =====
  timeExercise('mat', 'Prépare le tapis', 'Installe ta tapis pour la suite.', 5, {
    reverse: true,
  }),
  patternA('mat', 'Pompes', 'Pompes classiques, mouvement contrôlé.'),
  rest('mat'),
  patternF('mat', 'Planche au sol', 'Gainage central.'),
  patternF('mat', 'Planche au sol — côté droit', 'Gainage latéral droit.'),
  patternF('mat', 'Planche au sol — côté gauche', 'Gainage latéral gauche.'),
  rest('mat'),
  patternF('mat', 'Superman au sol', 'Allongée sur le ventre, lève bras et jambes.'),
  rest('mat'),
  patternA('mat', 'Squats', 'Descends droit, dos neutre.'),
  rest('mat'),
  patternA(
    'mat',
    'Quatre pattes — jambe droite pliée vers le dos',
    'Aligne la cuisse avec le dos.'
  ),
  patternA(
    'mat',
    'Quatre pattes — jambe gauche pliée vers le dos',
    'Aligne la cuisse avec le dos.'
  ),
  patternB(
    'mat',
    'Quatre pattes — jambe droite pliée, sur deux temps',
    'Aligne la cuisse avec le dos en deux temps.'
  ),
  patternB(
    'mat',
    'Quatre pattes — jambe gauche pliée, sur deux temps',
    'Aligne la cuisse avec le dos en deux temps.'
  ),
  patternA(
    'mat',
    'Quatre pattes — cuisse droite alignée, lève haut',
    'Cuisse en ligne avec le dos, lève la jambe vers le ciel.'
  ),
  patternA(
    'mat',
    'Quatre pattes — cuisse gauche alignée, lève haut',
    'Cuisse en ligne avec le dos, lève la jambe vers le ciel.'
  ),
  patternB(
    'mat',
    'Quatre pattes — cuisse droite alignée, lève haut sur deux temps',
    ''
  ),
  patternB(
    'mat',
    'Quatre pattes — cuisse gauche alignée, lève haut sur deux temps',
    ''
  ),

  patternA(
    'mat',
    'Côté gauche — lève jambe droite tendue',
    'Allongée sur le côté gauche, jambe droite tendue le long du corps.'
  ),
  patternB('mat', 'Côté gauche — lève jambe droite tendue, sur deux temps', ''),
  patternA(
    'mat',
    'Côté droit — lève jambe gauche tendue',
    'Allongée sur le côté droit, jambe gauche tendue le long du corps.'
  ),
  patternB('mat', 'Côté droit — lève jambe gauche tendue, sur deux temps', ''),
  patternA(
    'mat',
    'Côté gauche — lève jambe gauche tendue',
    'Allongée sur le côté gauche, jambe gauche dessus tendue.'
  ),
  patternB('mat', 'Côté gauche — lève jambe gauche tendue, sur deux temps', ''),
  patternA(
    'mat',
    'Côté droit — lève jambe droite tendue',
    'Allongée sur le côté droit, jambe droite dessus tendue.'
  ),
  patternB('mat', 'Côté droit — lève jambe droite tendue, sur deux temps', ''),

  // ===== Écart latéral (Szpagat boczny) — tous des holds 15s linéaires =====
  hold15('splits', 'Position du papillon', 'Pieds joints, genoux ouverts.'),
  hold15(
    'splits',
    'Papillon — pose-toi sur la jambe gauche',
    'Jambe droite pliée genou au sol, pied droit contre la cuisse gauche, jambe gauche tendue. Pose le buste sur la jambe gauche.'
  ),
  hold15(
    'splits',
    'Papillon — pose-toi sur la jambe droite',
    'Jambe gauche pliée genou au sol, pied gauche contre la cuisse droite, jambe droite tendue. Pose le buste sur la jambe droite.'
  ),
  hold15(
    'splits',
    'Pose-toi sur les deux jambes',
    'Les deux jambes tendues écartées, pose le buste vers le sol.'
  ),
  hold15(
    'splits',
    'Étirement quadriceps droit assis',
    'Jambe gauche pliée genou vers le haut, jambe droite pliée en travers, pied droit sur la cuisse gauche.'
  ),
  hold15(
    'splits',
    'Étirement quadriceps gauche assis',
    'Jambe droite pliée genou vers le haut, jambe gauche pliée en travers, pied gauche sur la cuisse droite.'
  ),

  hold15(
    'splits',
    'Fente — jambe droite devant, mains poussent',
    'Lève-toi, fente jambe droite devant à angle droit, jambe gauche tendue loin derrière, mains poussent les hanches vers le bas.'
  ),
  hold15(
    'splits',
    'Fente droite — buste sur la jambe avant',
    'Jambe droite tendue devant, jambe gauche pliée à angle droit derrière, pose-toi sur la jambe droite.'
  ),
  hold15(
    'splits',
    'Fente — jambe droite devant, reprise',
    'Reprends la fente jambe droite devant, mains poussent les hanches vers le bas.'
  ),
  hold15(
    'splits',
    'Fente — jambe gauche devant, mains poussent',
    'Lève-toi, fente jambe gauche devant à angle droit, jambe droite tendue loin derrière, mains poussent les hanches vers le bas.'
  ),
  hold15(
    'splits',
    'Fente gauche — buste sur la jambe avant',
    'Jambe gauche tendue devant, jambe droite pliée à angle droit derrière, pose-toi sur la jambe gauche.'
  ),
  hold15(
    'splits',
    'Fente — jambe gauche devant, reprise',
    'Reprends la fente jambe gauche devant, mains poussent les hanches vers le bas.'
  ),

  hold15(
    'splits',
    'Fente gauche devant, jambe droite sur les orteils',
    'Fente jambe gauche devant à angle droit, jambe droite tendue derrière sur les orteils, mains poussent les hanches vers le bas.'
  ),
  hold15(
    'splits',
    'Fente droite devant, jambe gauche sur les orteils',
    'Fente jambe droite devant à angle droit, jambe gauche tendue derrière sur les orteils, mains poussent les hanches vers le bas.'
  ),
  hold15('splits', 'Fente gauche sur les orteils — 2', 'Reprise.'),
  hold15('splits', 'Fente droite sur les orteils — 2', 'Reprise.'),
  hold15('splits', 'Fente gauche sur les orteils — 3', 'Reprise.'),
  hold15('splits', 'Fente droite sur les orteils — 3', 'Reprise.'),
  hold15('splits', 'Fente gauche sur les orteils — 4', 'Reprise.'),
  hold15('splits', 'Fente droite sur les orteils — 4', 'Reprise.'),

  hold15(
    'splits',
    'Pyramide — pose-toi sur la jambe droite',
    'Position de la pyramide, pose-toi sur la jambe droite.'
  ),
  hold15(
    'splits',
    'Pyramide — pose-toi sur la jambe gauche',
    'Position de la pyramide, pose-toi sur la jambe gauche.'
  ),

  hold15(
    'splits',
    'Pigeon — jambe droite devant',
    'Position du pigeon, jambe droite pliée devant.'
  ),
  hold15(
    'splits',
    'Pigeon — jambe gauche devant',
    'Position du pigeon, jambe gauche pliée devant.'
  ),

  // 6× alternance droite/gauche sur blocs de yoga
  hold15('splits', 'Grand écart jambe droite devant, sur blocs (1)', 'Sur des blocs de yoga.'),
  hold15('splits', 'Grand écart jambe gauche devant, sur blocs (1)', 'Sur des blocs de yoga.'),
  hold15('splits', 'Grand écart jambe droite devant, sur blocs (2)', 'Sur des blocs de yoga.'),
  hold15('splits', 'Grand écart jambe gauche devant, sur blocs (2)', 'Sur des blocs de yoga.'),
  hold15('splits', 'Grand écart jambe droite devant, sur blocs (3)', 'Sur des blocs de yoga.'),
  hold15('splits', 'Grand écart jambe gauche devant, sur blocs (3)', 'Sur des blocs de yoga.'),
  hold15('splits', 'Grand écart jambe droite devant, sur blocs (4)', 'Sur des blocs de yoga.'),
  hold15('splits', 'Grand écart jambe gauche devant, sur blocs (4)', 'Sur des blocs de yoga.'),
  hold15('splits', 'Grand écart jambe droite devant, sur blocs (5)', 'Sur des blocs de yoga.'),
  hold15('splits', 'Grand écart jambe gauche devant, sur blocs (5)', 'Sur des blocs de yoga.'),
  hold15('splits', 'Grand écart jambe droite devant, sur blocs (6)', 'Sur des blocs de yoga.'),
  hold15('splits', 'Grand écart jambe gauche devant, sur blocs (6)', 'Sur des blocs de yoga.'),

  // 6× alternance droite/gauche sans blocs
  hold15('splits', 'Grand écart jambe droite devant (1)', 'Sans blocs.'),
  hold15('splits', 'Grand écart jambe gauche devant (1)', 'Sans blocs.'),
  hold15('splits', 'Grand écart jambe droite devant (2)', 'Sans blocs.'),
  hold15('splits', 'Grand écart jambe gauche devant (2)', 'Sans blocs.'),
  hold15('splits', 'Grand écart jambe droite devant (3)', 'Sans blocs.'),
  hold15('splits', 'Grand écart jambe gauche devant (3)', 'Sans blocs.'),
  hold15('splits', 'Grand écart jambe droite devant (4)', 'Sans blocs.'),
  hold15('splits', 'Grand écart jambe gauche devant (4)', 'Sans blocs.'),
  hold15('splits', 'Grand écart jambe droite devant (5)', 'Sans blocs.'),
  hold15('splits', 'Grand écart jambe gauche devant (5)', 'Sans blocs.'),
  hold15('splits', 'Grand écart jambe droite devant (6)', 'Sans blocs.'),

  // ===== Écart facial (front splits) — holds 30s/60s =====
  hold('front-splits', 'Fente avant gauche, hanche poussée', 30, 'Lève-toi, fente jambe gauche devant à angle droit, jambe droite tendue derrière, mains poussent les hanches vers le bas.'),
  hold('front-splits', 'Fente avant droite, hanche poussée', 30, 'Lève-toi, fente jambe droite devant à angle droit, jambe gauche tendue derrière, mains poussent les hanches vers le bas.'),
  hold('front-splits', 'Étirement ischio jambe gauche', 30, 'Jambe gauche tendue devant, jambe droite pliée derrière, pose le buste sur la jambe gauche.'),
  hold('front-splits', 'Étirement ischio jambe droite', 30, 'Jambe droite tendue devant, jambe gauche pliée derrière, pose le buste sur la jambe droite.'),
  hold('front-splits', 'Demi-grand écart facial gauche', 60, 'Descends progressivement vers le sol, jambe gauche devant.'),
  hold('front-splits', 'Demi-grand écart facial droite', 60, 'Descends progressivement vers le sol, jambe droite devant.'),
  hold('front-splits', 'Grand écart facial sur blocs (gauche)', 60, 'Sur des blocs de yoga, jambe gauche devant.'),
  hold('front-splits', 'Grand écart facial sur blocs (droite)', 60, 'Sur des blocs de yoga, jambe droite devant.'),
  hold('front-splits', 'Grand écart facial sans blocs (gauche)', 60, 'Sans blocs.'),
  hold('front-splits', 'Grand écart facial sans blocs (droite)', 60, 'Sans blocs.'),

  // ===== Post-partum — rééducation douce =====
  timeExercise('postpartum', 'Respiration abdominale', 'Allongée sur le dos, inspire en gonflant le ventre, expire en le creusant.', 60),
  repExercise(
    'postpartum',
    'Contraction du périnée',
    'Contracte 3s, relâche 3s. Position assise ou allongée.',
    [newStep('contracte', 3, 'linear'), newStep('relâche', 3)],
    { repetitions: 8, pyramid: false }
  ),
  repExercise(
    'postpartum',
    'Pont du bassin',
    'Allongée dos au sol, pieds à plat, soulève le bassin et tiens.',
    [newStep('monte', 1), newStep('tiens', 3, 'linear'), newStep('descends', 1)],
    { repetitions: 8, pyramid: false }
  ),
  repExercise(
    'postpartum',
    'Chat-vache (Cat-Cow)',
    'À quatre pattes, alterne dos rond (chat) et dos creux (vache).',
    [newStep('dos rond', 3, 'linear'), newStep('dos creux', 3, 'linear')],
    { repetitions: 8, pyramid: false }
  ),
  repExercise(
    'postpartum',
    'Bird-dog côté droit',
    'À quatre pattes, tends le bras droit et la jambe gauche en même temps.',
    [newStep('tends', 1), newStep('tiens', 3, 'linear'), newStep('retour', 1)],
    { repetitions: 6, pyramid: false }
  ),
  repExercise(
    'postpartum',
    'Bird-dog côté gauche',
    'À quatre pattes, tends le bras gauche et la jambe droite en même temps.',
    [newStep('tends', 1), newStep('tiens', 3, 'linear'), newStep('retour', 1)],
    { repetitions: 6, pyramid: false }
  ),
  timeExercise('postpartum', 'Hypopressif (faux-respiration)', 'Expire tout l’air, suspends la respiration et rentre le ventre vers le haut.', 20),
  timeExercise('postpartum', 'Repos final', 'Allongée, jambes pliées, respire calmement.', 60, { reverse: true }),

  // ===== Bras — ouverture & renforcement =====
  timeExercise('arms', 'Cercles d’épaules avant', 'Bras tendus le long du corps, fais de grands cercles vers l’avant.', 20),
  timeExercise('arms', 'Cercles d’épaules arrière', 'Bras tendus, grands cercles vers l’arrière.', 20),
  timeExercise('arms', 'Ouverture de poitrine', 'Mains croisées dans le dos, bombe le torse, regarde le ciel.', 30),
  timeExercise('arms', 'Étirement bras au-dessus de la tête', 'Bras tendus vers le haut, attrape un poignet et tire doucement.', 30),
  repExercise(
    'arms',
    'Pompes murales',
    'Face au mur, mains à hauteur d’épaules, descends la poitrine vers le mur.',
    [newStep('descends', 2, 'linear'), newStep('remonte', 2, 'reverse')],
    { repetitions: 10, pyramid: false }
  ),
  repExercise(
    'arms',
    'Élévations latérales',
    'Bras le long du corps, lève-les latéralement à hauteur d’épaules.',
    [newStep('monte', 2, 'linear'), newStep('descends', 2, 'reverse')],
    { repetitions: 12, pyramid: false }
  ),
  repExercise(
    'arms',
    'Plank shoulder taps',
    'En planche haute, touche alternativement chaque épaule avec la main opposée.',
    [newStep('épaule droite', 1), newStep('épaule gauche', 1)],
    { repetitions: 10, pyramid: false }
  ),
  repExercise(
    'arms',
    'Triceps dips',
    'Assise sur une chaise, mains au bord, descends et remonte avec les bras.',
    [newStep('descends', 2, 'linear'), newStep('remonte', 2, 'reverse')],
    { repetitions: 10, pyramid: false }
  ),

  // ===== Pilates — focus core =====
  repExercise(
    'pilates',
    'The Hundred (les Cent)',
    'Allongée, jambes en table, tête et épaules levées, bras tendus pulsent.',
    [newStep('inspire', 5, 'linear'), newStep('expire', 5, 'linear')],
    { repetitions: 10, pyramid: false }
  ),
  repExercise(
    'pilates',
    'Roll up',
    'Allongée bras tendus derrière la tête, déroule la colonne vertèbre par vertèbre.',
    [newStep('monte', 4, 'linear'), newStep('descends', 4, 'reverse')],
    { repetitions: 6, pyramid: false }
  ),
  repExercise(
    'pilates',
    'Single leg stretch',
    'Allongée, ramène alternativement chaque genou vers la poitrine.',
    [newStep('jambe droite', 2, 'linear'), newStep('jambe gauche', 2, 'linear')],
    { repetitions: 10, pyramid: false }
  ),
  repExercise(
    'pilates',
    'Double leg stretch',
    'Allongée, tends bras et jambes, puis ramène-les en boule.',
    [newStep('tends', 2, 'linear'), newStep('ramène', 2, 'reverse')],
    { repetitions: 8, pyramid: false }
  ),
  repExercise(
    'pilates',
    'Criss-cross (bicyclette)',
    'Sur le dos, alterne coude-genou opposés.',
    [newStep('droite', 1), newStep('gauche', 1)],
    { repetitions: 12, pyramid: false }
  ),
  repExercise(
    'pilates',
    'Spine stretch forward',
    'Assise jambes tendues, déroule le buste vers l’avant en arrondissant le dos.',
    [newStep('avant', 4, 'linear'), newStep('retour', 2, 'reverse')],
    { repetitions: 6, pyramid: false }
  ),
  repExercise(
    'pilates',
    'Single leg circle droite',
    'Allongée, dessine de grands cercles avec la jambe droite tendue.',
    [newStep('cercle', 4, 'linear')],
    { repetitions: 8, pyramid: false }
  ),
  repExercise(
    'pilates',
    'Single leg circle gauche',
    'Allongée, dessine de grands cercles avec la jambe gauche tendue.',
    [newStep('cercle', 4, 'linear')],
    { repetitions: 8, pyramid: false }
  ),

  // ===== Yoga du visage =====
  timeExercise('face-yoga', 'Sourire en V', 'Doigts au coin des lèvres, sourire large, doigts résistent doucement.', 30),
  repExercise(
    'face-yoga',
    'Pose du lion',
    'Inspire, ouvre la bouche, sors la langue, écarquille les yeux, expire fort.',
    [newStep('ouvre', 5, 'linear'), newStep('détends', 2)],
    { repetitions: 5, pyramid: false }
  ),
  timeExercise('face-yoga', 'Étirement du cou côté droit', 'Penche doucement la tête vers l’épaule droite, regarde devant.', 30),
  timeExercise('face-yoga', 'Étirement du cou côté gauche', 'Penche doucement la tête vers l’épaule gauche, regarde devant.', 30),
  timeExercise('face-yoga', 'Massage des tempes', 'Fais de petits cercles avec les majeurs sur les tempes.', 30),
  repExercise(
    'face-yoga',
    'Picotements (Œil de poisson)',
    'Ferme et ouvre rapidement les yeux pour stimuler le contour.',
    [newStep('ferme', 1), newStep('ouvre', 1)],
    { repetitions: 10, pyramid: false }
  ),
  repExercise(
    'face-yoga',
    'Sourcils relevés',
    'Lève les sourcils le plus haut possible, maintiens, puis détends.',
    [newStep('lève', 2, 'linear'), newStep('détends', 2)],
    { repetitions: 10, pyramid: false }
  ),
  timeExercise('face-yoga', 'Joues gonflées', 'Gonfle les joues d’air et fais passer l’air d’un côté à l’autre.', 20),
  timeExercise('face-yoga', 'Massage du cuir chevelu', 'Du bout des doigts, masse le cuir chevelu en cercles.', 30),

  // ===== TRE (Tension & Trauma Releasing Exercises) =====
  timeExercise('tre', 'Pieds en pointe', 'Debout, pieds parallèles, monte sur la pointe des pieds le plus haut possible.', 30),
  timeExercise('tre', 'Wall sit', 'Dos contre un mur, descends en chaise jusqu’à 90°, tiens.', 60),
  timeExercise('tre', 'Pelvis levé', 'Allongée sur le dos, pieds à plat, soulève le bassin et tiens.', 60),
  timeExercise('tre', 'Papillon allongé', 'Sur le dos, plante des pieds collées, genoux qui tombent vers les côtés.', 90),
  timeExercise('tre', 'Trembling release', 'Position confortable, laisse le corps trembler librement. N’essaie pas de contrôler.', 90, { reverse: true }),
  timeExercise('tre', 'Savasana', 'Allongée, bras le long du corps, paumes vers le ciel. Respire et observe.', 120, { reverse: true }),

  // ===== Yoga =====
  timeExercise('yoga', 'Salutation au soleil — Tadasana', 'Debout, pieds joints, mains en prière au cœur, respire.', 30),
  hold('yoga', 'Chien tête en bas (Adho Mukha Svanasana)', 60, 'Forme un V inversé, mains à plat, talons vers le sol.'),
  hold('yoga', 'Position de l’enfant (Balasana)', 60, 'À genoux, gros orteils joints, fesses sur les talons, front au sol, bras tendus devant.'),
  hold('yoga', 'Cobra (Bhujangasana)', 30, 'Allongée sur le ventre, mains sous les épaules, étire le buste vers le haut.'),
  hold('yoga', 'Guerrier 1 droite (Virabhadrasana I)', 30, 'Fente jambe droite devant, bras vers le ciel, regarde devant.'),
  hold('yoga', 'Guerrier 1 gauche (Virabhadrasana I)', 30, 'Fente jambe gauche devant, bras vers le ciel, regarde devant.'),
  hold('yoga', 'Guerrier 2 droite (Virabhadrasana II)', 30, 'Fente jambe droite, bras tendus à l’horizontale, regarde la main avant.'),
  hold('yoga', 'Guerrier 2 gauche (Virabhadrasana II)', 30, 'Fente jambe gauche, bras tendus à l’horizontale, regarde la main avant.'),
  hold('yoga', 'Triangle droite (Trikonasana)', 30, 'Jambes écartées, pied droit ouvert, main droite vers le tibia, main gauche vers le ciel.'),
  hold('yoga', 'Triangle gauche (Trikonasana)', 30, 'Jambes écartées, pied gauche ouvert, main gauche vers le tibia, main droite vers le ciel.'),
  hold('yoga', 'Pince debout (Uttanasana)', 60, 'Debout, plie en deux, mains vers le sol, relâche la nuque.'),
  hold('yoga', 'Pose du chameau (Ustrasana)', 30, 'À genoux, mains sur les talons, ouvre la poitrine vers le ciel.'),
  hold('yoga', 'Torsion assise droite (Ardha Matsyendrasana)', 30, 'Assise jambe gauche tendue, jambe droite croisée, torsion vers la droite.'),
  hold('yoga', 'Torsion assise gauche (Ardha Matsyendrasana)', 30, 'Assise jambe droite tendue, jambe gauche croisée, torsion vers la gauche.'),
  timeExercise('yoga', 'Savasana final', 'Allongée, bras le long du corps, paumes vers le ciel, relâche tout.', 180, { reverse: true }),
];

/** Generic linear hold of `seconds` seconds (no reps, no pyramid). */
function hold(
  cat: ExerciseCategory,
  name: string,
  seconds: number,
  description: string
) {
  return timeExercise(cat, name, description, seconds);
}

export async function seedIfEmpty(): Promise<void> {
  await ensureDefaultCategories();
  const already = await AsyncStorage.getItem(SEED_KEY);
  if (!already) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    for (const ex of PROGRAMME) {
      await saveExercise(ex);
    }
    await AsyncStorage.setItem(SEED_KEY, '1');
  }
  // Apply incremental patches (idempotent, safe to call on every launch).
  const { applyPatches } = await import('./patches');
  await applyPatches();
  void listExercises;
}

/**
 * Re-inject the original programme exercises for a given category (or all
 * categories if `categoryId` is omitted). Existing exercises are preserved —
 * only those whose name+category isn't already present are added. Returns the
 * number of exercises actually inserted.
 *
 * Useful when the user accidentally wipes a category's content.
 */
export async function restoreSeedExercises(
  categoryId?: string
): Promise<number> {
  await ensureDefaultCategories();
  const existing = await listExercises();
  const existingKeys = new Set(
    existing.map((e) => `${e.category ?? 'mat'}::${e.name}`)
  );
  let added = 0;
  for (const ex of PROGRAMME) {
    if (categoryId && ex.category !== categoryId) continue;
    const key = `${ex.category}::${ex.name}`;
    if (existingKeys.has(key)) continue;
    await saveExercise({
      ...ex,
      id: uid(),
    });
    existingKeys.add(key);
    added += 1;
  }
  // NOTE: we intentionally do NOT call applyPatches() here — that would create
  // an infinite recursion with the post-v6 patch which itself calls
  // restoreSeedExercises. Patches are applied automatically on the next launch.
  return added;
}

/** Whether a categoryId has a built-in seed programme available. */
export function hasSeedProgramme(categoryId: string): boolean {
  return PROGRAMME.some((ex) => ex.category === categoryId);
}
