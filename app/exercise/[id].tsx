import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { useCategories } from '../../src/hooks/useCategories';
import { useCustomModes } from '../../src/hooks/useCustomModes';
import {
  deleteExercise,
  getExercise,
  saveExercise,
  uid,
} from '../../src/storage';
import { radius, spacing, useTheme, useThemedStyles } from '../../src/theme';
import type {
  CountingMode,
  CustomCountingMode,
  Exercise,
  ExerciseCategory,
  RepetitionExercise,
  Step,
  TimeExercise,
} from '../../src/types';

// Category options are now loaded dynamically via useCategories().

type StepCountMode = 'none' | CountingMode;

type DurationUnit = 'sec' | 'min';

type FormState = {
  id: string;
  name: string;
  description: string;
  category: ExerciseCategory;
  type: 'time' | 'repetition';
  // === Time mode (new) ===
  totalDuration: string;       // user input number
  durationUnit: DurationUnit;  // sec or min
  voiceIntervalSec: number;    // gap between counts (1, 2, 5, 10, 30, 60, 300)
  countingMode: CountingMode;  // 'linear' | 'reverse' | 'silent' | 'pyramid8' | <custom id>
  // === Repetition mode ===
  repetitions: string;
  repCountingMode: CountingMode;
  steps: Step[];
};

const emptyStep = (): Step => ({
  id: uid(),
  instruction: '',
  duration: 1,
  internalCount: 'none',
});

const initialState = (category: ExerciseCategory = 'mat'): FormState => ({
  id: uid(),
  name: '',
  description: '',
  category,
  type: 'repetition',
  totalDuration: '20',
  durationUnit: 'sec',
  voiceIntervalSec: 1,
  countingMode: 'linear',
  repetitions: '5',
  repCountingMode: 'linear',
  steps: [emptyStep()],
});

// Frequency presets for the voice (in seconds between each count).
const VOICE_INTERVAL_OPTIONS: ReadonlyArray<{
  value: number;
  label: string;
}> = [
  { value: 1, label: 'Chaque seconde' },
  { value: 2, label: 'Toutes les 2 sec' },
  { value: 5, label: 'Toutes les 5 sec' },
  { value: 10, label: 'Toutes les 10 sec' },
  { value: 30, label: 'Toutes les 30 sec' },
  { value: 60, label: 'Chaque minute' },
  { value: 300, label: 'Toutes les 5 min' },
];

const DURATION_UNIT_OPTIONS: ReadonlyArray<{
  value: DurationUnit;
  label: string;
}> = [
  { value: 'sec', label: 'sec' },
  { value: 'min', label: 'min' },
];

/** Round an arbitrary interval (sec) to the closest preset value. */
function nearestVoicePreset(intervalSec: number): number {
  const presets = VOICE_INTERVAL_OPTIONS.map((o) => o.value);
  return presets.reduce(
    (best, p) =>
      Math.abs(p - intervalSec) < Math.abs(best - intervalSec) ? p : best,
    presets[0]
  );
}

const BUILTIN_REP_OPTIONS: ReadonlyArray<{ value: CountingMode; label: string }> = [
  { value: 'linear', label: '1 → N' },
  { value: 'pyramid8', label: 'Pyramide 1→8→8→1' },
];

const BUILTIN_TIME_OPTIONS: ReadonlyArray<{ value: CountingMode; label: string }> = [
  { value: 'linear', label: '1, 2, 3… (monte)' },
  { value: 'reverse', label: 'N, N-1… 1 (descend)' },
  { value: 'pyramid8', label: 'Pyramide 1→8→8→1' },
  { value: 'silent', label: '🔇 Silencieux' },
];

const BUILTIN_STEP_OPTIONS: ReadonlyArray<{ value: StepCountMode; label: string }> = [
  { value: 'none', label: 'Aucun' },
  { value: 'linear', label: '1 → N' },
  { value: 'reverse', label: 'N → 1' },
  { value: 'pyramid8', label: 'Pyramide 1→8→8→1' },
];

const customAsOption = (m: CustomCountingMode) => ({
  value: m.id,
  label: `★ ${m.name} (${m.labels.length})`,
});

export default function ExerciseEditor() {
  const { id, category } = useLocalSearchParams<{
    id: string;
    category?: ExerciseCategory;
  }>();
  const isNew = id === 'new';
  const { colors } = useTheme();
  const { modes: customModes } = useCustomModes();
  const { categories } = useCategories();
  const [form, setForm] = useState<FormState>(() =>
    initialState(typeof category === 'string' && category.length > 0 ? category : 'mat')
  );
  const [loaded, setLoaded] = useState(isNew);

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.emoji ? `${c.emoji} ${c.name}` : c.name,
  }));

  const repCountOptions = [
    ...BUILTIN_REP_OPTIONS,
    ...customModes.map(customAsOption),
  ];
  const timeCountOptions = [
    ...BUILTIN_TIME_OPTIONS,
    ...customModes.map(customAsOption),
  ];
  const stepCountOptions: ReadonlyArray<{ value: StepCountMode; label: string }> = [
    ...BUILTIN_STEP_OPTIONS,
    ...customModes.map(customAsOption),
  ];

  const isCustomMode = (id: string): boolean =>
    customModes.some((m) => m.id === id);
  const isFixedLengthRep = (mode: CountingMode): boolean =>
    mode === 'pyramid8' || isCustomMode(mode);
  const isFixedLengthTime = (mode: CountingMode): boolean =>
    mode === 'pyramid8' || isCustomMode(mode);
  const customLength = (mode: CountingMode): number => {
    const m = customModes.find((m) => m.id === mode);
    return m ? m.labels.length : 16;
  };

  const styles = useThemedStyles((c) =>
    StyleSheet.create({
      container: { flex: 1, backgroundColor: c.bg },
      label: { color: c.textMuted, fontSize: 13, fontWeight: '500' },
      inlineLabel: { color: c.textMuted, fontSize: 13 },
      input: {
        backgroundColor: c.surface,
        color: c.text,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderWidth: 1,
        borderColor: c.border,
        fontSize: 15,
      },
      typeSwitch: {
        flexDirection: 'row',
        backgroundColor: c.surface,
        borderRadius: radius.md,
        padding: 4,
        borderWidth: 1,
        borderColor: c.border,
      },
      typeOption: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: radius.sm,
      },
      typeOptionActive: { backgroundColor: c.accent },
      typeOptionText: { color: c.textMuted, fontWeight: '600' },
      typeOptionTextActive: { color: c.accentText },
      pickerRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
      },
      pickerChip: {
        paddingVertical: spacing.sm - 2,
        paddingHorizontal: spacing.md - 2,
        borderRadius: radius.sm,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
      },
      pickerChipActive: {
        backgroundColor: c.accentDim,
        borderColor: c.accent,
      },
      pickerChipText: { color: c.textMuted, fontSize: 13, fontWeight: '500' },
      pickerChipTextActive: { color: c.text, fontWeight: '600' },
      hint: {
        backgroundColor: c.surfaceAlt,
        borderRadius: radius.sm,
        padding: spacing.sm + 2,
        borderWidth: 1,
        borderColor: c.border,
      },
      hintText: { color: c.textMuted, fontSize: 12, lineHeight: 17 },
      stepCard: {
        backgroundColor: c.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: c.border,
        gap: spacing.sm,
      },
      stepHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      stepIndex: { color: c.text, fontWeight: '600' },
      iconBtn: {
        width: 32,
        height: 32,
        borderRadius: radius.sm,
        backgroundColor: c.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
      },
      iconBtnText: { color: c.text, fontSize: 16, fontWeight: '600' },
    })
  );

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const ex = await getExercise(id!);
      if (!ex) {
        router.back();
        return;
      }
      // Convert the stored {duration, pace, countingMode} into the new
      // {totalDuration, durationUnit, voiceIntervalSec} form fields.
      let totalDuration = '20';
      let durationUnit: DurationUnit = 'sec';
      let voiceIntervalSec = 1;
      if (ex.type === 'time') {
        const mode = ex.countingMode ?? 'linear';
        let realSec: number;
        if (mode === 'silent') {
          realSec = ex.duration;
          voiceIntervalSec = 1; // unused but keep a sensible default
        } else if (mode === 'pyramid8') {
          realSec = 16;
          voiceIntervalSec = 1;
        } else {
          const intervalSec = ex.pace > 0 ? 1 / ex.pace : 1;
          voiceIntervalSec = nearestVoicePreset(intervalSec);
          realSec = ex.duration * voiceIntervalSec;
        }
        if (realSec >= 120 && realSec % 60 === 0) {
          durationUnit = 'min';
          totalDuration = String(Math.round(realSec / 60));
        } else {
          durationUnit = 'sec';
          totalDuration = String(Math.round(realSec));
        }
      }

      setForm({
        id: ex.id,
        name: ex.name,
        description: ex.description,
        category: ex.category ?? 'mat',
        type: ex.type,
        totalDuration,
        durationUnit,
        voiceIntervalSec,
        countingMode: ex.type === 'time' ? ex.countingMode ?? 'linear' : 'linear',
        repetitions: ex.type === 'repetition' ? String(ex.repetitions) : '16',
        repCountingMode:
          ex.type === 'repetition' ? ex.repCountingMode ?? 'linear' : 'linear',
        steps: ex.type === 'repetition' ? ex.steps : [emptyStep()],
      });
      setLoaded(true);
    })();
  }, [id, isNew]);

  if (!loaded) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.textMuted, padding: spacing.lg }}>
          Chargement…
        </Text>
      </View>
    );
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateStep = (idx: number, patch: Partial<Step>) =>
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));

  const addStep = () =>
    setForm((f) => ({ ...f, steps: [...f.steps, emptyStep()] }));

  const removeStep = (idx: number) =>
    setForm((f) => ({
      ...f,
      steps: f.steps.length > 1 ? f.steps.filter((_, i) => i !== idx) : f.steps,
    }));

  const moveStep = (idx: number, dir: -1 | 1) =>
    setForm((f) => {
      const target = idx + dir;
      if (target < 0 || target >= f.steps.length) return f;
      const next = [...f.steps];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...f, steps: next };
    });

  const onSave = async () => {
    if (!form.name.trim()) return;
    const base = {
      id: form.id,
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    let exercise: Exercise;
    if (form.type === 'time') {
      const realSec = Math.max(
        1,
        (parseInt(form.totalDuration, 10) || 1) *
          (form.durationUnit === 'min' ? 60 : 1)
      );
      const mode = form.countingMode;
      let duration: number;
      let pace: number;
      if (mode === 'silent') {
        // duration stores REAL seconds for silent mode
        duration = realSec;
        pace = 1;
      } else if (mode === 'pyramid8') {
        duration = 16;
        pace = 1;
      } else if (isCustomMode(mode)) {
        const len = customLength(mode);
        const intervalSec = Math.max(0.25, realSec / len);
        duration = len;
        pace = 1 / intervalSec;
      } else {
        // linear or reverse
        const interval = Math.max(0.25, form.voiceIntervalSec);
        duration = Math.max(1, Math.round(realSec / interval));
        pace = 1 / interval;
      }
      const time: TimeExercise = {
        ...base,
        type: 'time',
        duration,
        pace,
        countingMode: mode,
      };
      exercise = time;
    } else {
      const fixed = isFixedLengthRep(form.repCountingMode);
      const rep: RepetitionExercise = {
        ...base,
        type: 'repetition',
        repetitions: fixed
          ? form.repCountingMode === 'pyramid8'
            ? 16
            : customLength(form.repCountingMode)
          : Math.max(1, parseInt(form.repetitions, 10) || 1),
        repCountingMode: form.repCountingMode,
        steps: form.steps
          .filter((s) => s.instruction.trim())
          .map((s) => ({
            ...s,
            instruction: s.instruction.trim(),
            duration: Math.max(1, s.duration || 1),
          })),
      };
      if (rep.steps.length === 0) return;
      exercise = rep;
    }
    await saveExercise(exercise);
    router.back();
  };

  const onDelete = async () => {
    if (isNew) return;
    await deleteExercise(form.id);
    router.back();
  };

  const repCountingFixed = isFixedLengthRep(form.repCountingMode);
  const timeCountingFixed = isFixedLengthTime(form.countingMode);
  const isSilent = form.countingMode === 'silent';
  const currentRepCustom = customModes.find((m) => m.id === form.repCountingMode);
  const currentTimeCustom = customModes.find((m) => m.id === form.countingMode);

  // Compute display total time (for the live hint under the duration field).
  const realSec =
    Math.max(0, parseInt(form.totalDuration || '0', 10) || 0) *
    (form.durationUnit === 'min' ? 60 : 1);
  const displayTotal =
    realSec < 60
      ? `${realSec}s`
      : realSec % 60 === 0
      ? `${Math.floor(realSec / 60)} min`
      : `${Math.floor(realSec / 60)} min ${realSec % 60}s`;

  // --- Inline themed helpers (use the closed-over `styles` and `colors`) ---

  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );

  const Hint = ({ text }: { text: string }) => (
    <View style={styles.hint}>
      <Text style={styles.hintText}>{text}</Text>
    </View>
  );

  const TypeOption = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={[styles.typeOption, active && styles.typeOptionActive]}
    >
      <Text
        style={[styles.typeOptionText, active && styles.typeOptionTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );

  function PickerInline<T extends string | number>({
    options,
    value,
    onChange,
  }: {
    options: ReadonlyArray<{ value: T; label: string }>;
    value: T;
    onChange: (v: T) => void;
  }) {
    return (
      <View style={styles.pickerRow}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.pickerChip,
              opt.value === value && styles.pickerChipActive,
            ]}
          >
            <Text
              style={[
                styles.pickerChipText,
                opt.value === value && styles.pickerChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  const IconBtn = ({
    label,
    onPress,
    disabled,
  }: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.iconBtn, disabled && { opacity: 0.3 }]}
    >
      <Text style={styles.iconBtnText}>{label}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        >
          <Field label="Nom">
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => update('name', v)}
              placeholder="ex. Squat"
              placeholderTextColor={colors.textMuted}
            />
          </Field>

          <Field label="Description">
            <TextInput
              style={[styles.input, { height: 72 }]}
              value={form.description}
              onChangeText={(v) => update('description', v)}
              multiline
              placeholder="Notes, variantes, posture…"
              placeholderTextColor={colors.textMuted}
            />
          </Field>

          <Field label="Catégorie">
            <PickerInline
              options={categoryOptions}
              value={form.category}
              onChange={(v) => update('category', v)}
            />
          </Field>

          <Field label="Type">
            <View style={styles.typeSwitch}>
              <TypeOption
                label="Répétitions"
                active={form.type === 'repetition'}
                onPress={() => update('type', 'repetition')}
              />
              <TypeOption
                label="Temps"
                active={form.type === 'time'}
                onPress={() => update('type', 'time')}
              />
            </View>
          </Field>

          {form.type === 'time' ? (
            <>
              <Field label="Mode de comptage vocal">
                <PickerInline
                  options={timeCountOptions}
                  value={form.countingMode}
                  onChange={(v) => update('countingMode', v)}
                />
              </Field>

              {/* Duration input — visible for linear/reverse/silent and custom */}
              {form.countingMode !== 'pyramid8' && (
                <Field
                  label={
                    isSilent
                      ? 'Durée totale (sans annonce vocale)'
                      : 'Durée totale de l’exercice'
                  }
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing.sm,
                      alignItems: 'center',
                    }}
                  >
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={form.totalDuration}
                      onChangeText={(v) =>
                        update('totalDuration', v.replace(/[^0-9]/g, ''))
                      }
                      keyboardType="numeric"
                      placeholder="ex. 20"
                      placeholderTextColor={colors.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <PickerInline
                        options={DURATION_UNIT_OPTIONS}
                        value={form.durationUnit}
                        onChange={(v) => update('durationUnit', v)}
                      />
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.inlineLabel,
                      { marginTop: 4, fontStyle: 'italic' },
                    ]}
                  >
                    Soit {displayTotal} au total.
                  </Text>
                </Field>
              )}

              {/* Voice interval picker — only for linear/reverse */}
              {(form.countingMode === 'linear' ||
                form.countingMode === 'reverse') && (
                <Field label="Fréquence d’annonce vocale">
                  <PickerInline
                    options={VOICE_INTERVAL_OPTIONS}
                    value={form.voiceIntervalSec}
                    onChange={(v) => update('voiceIntervalSec', v)}
                  />
                  <Text
                    style={[
                      styles.inlineLabel,
                      { marginTop: 4, fontStyle: 'italic' },
                    ]}
                  >
                    {`La voix dira un chiffre toutes les ${form.voiceIntervalSec} sec, soit ~${Math.max(1, Math.round(realSec / form.voiceIntervalSec))} chiffres au total.`}
                  </Text>
                </Field>
              )}

              {isSilent && (
                <Hint text="Mode silencieux : la voix annonce juste le nom de l’exercice au début, puis attend en silence pendant toute la durée. Idéal pour cardio (vélo, course, etc.) où tu veux écouter ta musique." />
              )}

              {form.countingMode === 'pyramid8' && (
                <Hint text="La pyramide compte 1, 2, 3, 4, 5, 6, 7, 8, 8, 7, 6, 5, 4, 3, 2, 1 — soit 16 secondes (1 compte/sec). Durée verrouillée." />
              )}

              {currentTimeCustom && (
                <Hint
                  text={`Mode personnalisé "${currentTimeCustom.name}" : ${currentTimeCustom.labels.length} comptes vocaux. La durée totale ci-dessus est répartie sur ces ${currentTimeCustom.labels.length} comptes.`}
                />
              )}
            </>
          ) : (
            <>
              <Field label="Mode de comptage des reps">
                <PickerInline
                  options={repCountOptions}
                  value={form.repCountingMode}
                  onChange={(v) => update('repCountingMode', v)}
                />
              </Field>
              {!repCountingFixed ? (
                <Field label="Nombre de répétitions">
                  <TextInput
                    style={styles.input}
                    value={form.repetitions}
                    onChangeText={(v) =>
                      update('repetitions', v.replace(/[^0-9]/g, ''))
                    }
                    keyboardType="numeric"
                  />
                </Field>
              ) : (
                <Hint
                  text={
                    currentRepCustom
                      ? `Mode personnalisé "${currentRepCustom.name}" : ${currentRepCustom.labels.length} répétitions verrouillées.`
                      : 'La pyramide enchaîne 16 répétitions : 1,2,3,4,5,6,7,8,8,7,6,5,4,3,2,1.'
                  }
                />
              )}

              <View style={{ gap: spacing.sm }}>
                <Text style={styles.label}>Étapes par répétition</Text>
                {form.steps.map((step, idx) => (
                  <View key={step.id} style={styles.stepCard}>
                    <View style={styles.stepHeader}>
                      <Text style={styles.stepIndex}>Étape {idx + 1}</Text>
                      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                        <IconBtn
                          label="↑"
                          onPress={() => moveStep(idx, -1)}
                          disabled={idx === 0}
                        />
                        <IconBtn
                          label="↓"
                          onPress={() => moveStep(idx, 1)}
                          disabled={idx === form.steps.length - 1}
                        />
                        <IconBtn
                          label="✕"
                          onPress={() => removeStep(idx)}
                          disabled={form.steps.length === 1}
                        />
                      </View>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={step.instruction}
                      onChangeText={(v) => updateStep(idx, { instruction: v })}
                      placeholder="ex. descends"
                      placeholderTextColor={colors.textMuted}
                    />
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: spacing.sm,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={styles.inlineLabel}>Durée (s)</Text>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={String(step.duration)}
                        onChangeText={(v) =>
                          updateStep(idx, {
                            duration: Math.max(1, parseInt(v || '0', 10) || 1),
                          })
                        }
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ gap: spacing.xs }}>
                      <Text style={styles.inlineLabel}>Comptage interne</Text>
                      <PickerInline
                        options={stepCountOptions}
                        value={step.internalCount}
                        onChange={(v) =>
                          updateStep(idx, { internalCount: v })
                        }
                      />
                    </View>
                  </View>
                ))}
                <Button
                  title="+ Ajouter une étape"
                  variant="ghost"
                  onPress={addStep}
                />
              </View>
            </>
          )}

          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              marginTop: spacing.md,
            }}
          >
            {!isNew && (
              <Button
                title="Supprimer"
                variant="danger"
                onPress={onDelete}
                style={{ flex: 1 }}
              />
            )}
            <Button title="Enregistrer" onPress={onSave} style={{ flex: 2 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
