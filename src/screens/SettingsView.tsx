import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PALETTE_LABELS,
  radius,
  spacing,
  useTheme,
  useThemedStyles,
  type PaletteName,
} from '../theme';
import { Button } from '../components/Button';
import { downloadText } from '../components/downloadText';
import { useCategories } from '../hooks/useCategories';
import { useCustomModes } from '../hooks/useCustomModes';
import { useOnboarding } from '../hooks/useOnboarding';
import {
  findOrphanExercises,
  hasSeedProgramme,
  listExercises,
  parseExercisesCsv,
  repairOrphans,
  restoreSeedExercises,
  saveExercise,
  serializeExercisesCsv,
  templateCsv,
} from '../storage';
import type { Category, CustomCountingMode } from '../types';

const PALETTES_ORDER: PaletteName[] = ['rose', 'pop', 'graphite', 'storm'];

const PALETTE_DESCRIPTIONS: Record<PaletteName, string> = {
  rose: 'Crème chaud, mauve foncé, rose terracotta — doux, romantique.',
  pop: 'Bleu papier graffiti, magenta vif, noir profond — bold, urbain.',
  graphite: 'Slate sombre, platine, accents argent — minéral, contemporain.',
  storm: 'Bleu nuit océan, cyan tempête, écume — vue satellite.',
};

export function SettingsView() {
  const { name, setPalette } = useTheme();
  const customModes = useCustomModes();
  const categoriesHook = useCategories();
  const onboarding = useOnboarding();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [editingMode, setEditingMode] = useState<{
    id?: string;
    name: string;
    labels: string;
  } | null>(null);
  const [editingCategory, setEditingCategory] = useState<{
    id?: string;
    name: string;
    emoji: string;
  } | null>(null);
  const [orphanInfo, setOrphanInfo] = useState<{
    counts: Record<string, number>;
    total: number;
  } | null>(null);
  const [csvFormatOpen, setCsvFormatOpen] = useState(false);

  // Re-scan orphan exercises whenever categories change.
  useEffect(() => {
    (async () => {
      const { orphanCounts, totalOrphans } = await findOrphanExercises();
      setOrphanInfo({ counts: orphanCounts, total: totalOrphans });
    })();
  }, [categoriesHook.categories]);

  const onRestoreCategory = async (categoryId: string, name: string) => {
    const added = await restoreSeedExercises(categoryId);
    setStatusError(false);
    setStatusMessage(
      added > 0
        ? `${added} exercice${added > 1 ? 's' : ''} restauré${
            added > 1 ? 's' : ''
          } dans « ${name} ».`
        : `« ${name} » contient déjà tous les exercices d'origine.`
    );
  };

  const onRepairOrphans = async () => {
    const created = await repairOrphans();
    await categoriesHook.refresh();
    const { orphanCounts, totalOrphans } = await findOrphanExercises();
    setOrphanInfo({ counts: orphanCounts, total: totalOrphans });
    setStatusError(false);
    setStatusMessage(
      created > 0
        ? `${created} catégorie${
            created > 1 ? 's' : ''
          } recréée${created > 1 ? 's' : ''}. Tes exercices sont récupérés.`
        : 'Aucune catégorie orpheline détectée.'
    );
  };

  const styles = useThemedStyles((c) =>
    StyleSheet.create({
      container: { flex: 1, backgroundColor: c.bg },
      content: { padding: spacing.md, gap: spacing.lg },
      sectionTitle: {
        color: c.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: spacing.xs,
      },
      sectionHelp: {
        color: c.textMuted,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: spacing.sm,
      },
      paletteCard: {
        backgroundColor: c.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.border,
        padding: spacing.md,
        gap: spacing.sm,
      },
      paletteOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm + 2,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.bg,
        gap: spacing.sm,
      },
      paletteOptionActive: {
        borderColor: c.accent,
        backgroundColor: c.surfaceAlt,
      },
      paletteRadio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: c.border,
        alignItems: 'center',
        justifyContent: 'center',
      },
      paletteRadioActive: { borderColor: c.accent },
      paletteRadioDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: c.accent,
      },
      paletteText: { flex: 1 },
      paletteLabel: { color: c.text, fontWeight: '600', fontSize: 14 },
      paletteDescription: {
        color: c.textMuted,
        fontSize: 12,
        marginTop: 2,
      },
      ioCard: {
        backgroundColor: c.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.border,
        padding: spacing.md,
        gap: spacing.sm,
      },
      ioRow: { flexDirection: 'row', gap: spacing.sm },
      ioBtn: { flex: 1 },
      schema: {
        backgroundColor: c.surfaceAlt,
        borderRadius: radius.sm,
        padding: spacing.sm + 2,
        borderWidth: 1,
        borderColor: c.border,
      },
      schemaText: {
        color: c.text,
        fontSize: 12,
        fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
        lineHeight: 18,
      },
      status: {
        padding: spacing.sm + 2,
        borderRadius: radius.sm,
        borderWidth: 1,
      },
      statusOk: {
        backgroundColor: c.surfaceAlt,
        borderColor: c.accent,
      },
      statusErr: {
        backgroundColor: c.surfaceAlt,
        borderColor: c.danger,
      },
      statusText: { color: c.text, fontSize: 13 },
      modeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: radius.sm,
        padding: spacing.sm + 2,
      },
      modeRowText: { flex: 1 },
      modeRowName: { color: c.text, fontWeight: '600', fontSize: 14 },
      modeRowLabels: {
        color: c.textMuted,
        fontSize: 12,
        marginTop: 2,
      },
      modeRowActions: { flexDirection: 'row', gap: spacing.xs },
      smallBtn: {
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.sm,
        backgroundColor: c.surfaceAlt,
      },
      smallBtnText: { color: c.text, fontSize: 12, fontWeight: '500' },
      smallBtnDanger: {
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.sm,
        backgroundColor: c.danger,
      },
      smallBtnDangerText: {
        color: c.accentText,
        fontSize: 12,
        fontWeight: '600',
      },
      editorBox: {
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.accent,
        borderRadius: radius.sm,
        padding: spacing.sm + 2,
        gap: spacing.sm,
      },
      editorLabel: { color: c.textMuted, fontSize: 12 },
      editorInput: {
        backgroundColor: c.surface,
        color: c.text,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: c.border,
        fontSize: 13,
      },
      editorRow: { flexDirection: 'row', gap: spacing.xs },
      preview: {
        color: c.textMuted,
        fontSize: 11,
        fontStyle: 'italic',
      },
      csvToggle: {
        paddingVertical: 6,
        marginTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: c.border,
      },
      csvToggleText: {
        color: c.textMuted,
        fontSize: 12,
        fontWeight: '600',
      },
    })
  );

  const onDownloadTemplate = async () => {
    const csv = templateCsv();
    await downloadText('exercices-template.csv', csv);
    setStatusError(false);
    setStatusMessage(
      Platform.OS === 'web'
        ? 'Template téléchargé. Ouvre-le dans Excel / Google Sheets / Numbers.'
        : 'Template prêt.'
    );
  };

  const onExport = async () => {
    const list = await listExercises();
    if (list.length === 0) {
      setStatusError(true);
      setStatusMessage('Aucun exercice à exporter.');
      return;
    }
    const csv = serializeExercisesCsv(list);
    await downloadText('mes-exercices.csv', csv);
    setStatusError(false);
    setStatusMessage(`${list.length} exercices exportés.`);
  };

  const startCategoryCreate = () =>
    setEditingCategory({ name: '', emoji: '' });

  const startCategoryEdit = (cat: Category) =>
    setEditingCategory({ id: cat.id, name: cat.name, emoji: cat.emoji ?? '' });

  const cancelCategoryEdit = () => setEditingCategory(null);

  const saveCategory = async () => {
    if (!editingCategory) return;
    const name = editingCategory.name.trim();
    const emoji = editingCategory.emoji.trim();
    if (!name) {
      Alert.alert('Catégorie invalide', 'Donne un nom à la catégorie.');
      return;
    }
    await categoriesHook.upsert({
      id: editingCategory.id,
      name,
      emoji: emoji || undefined,
    });
    setEditingCategory(null);
  };

  const removeCategory = async (cat: Category) => {
    const all = await listExercises();
    const count = all.filter((e) => (e.category ?? 'mat') === cat.id).length;
    if (count > 0) {
      Alert.alert(
        'Impossible de supprimer',
        `${count} exercice${count > 1 ? 's' : ''} ${
          count > 1 ? 'utilisent' : 'utilise'
        } encore "${cat.name}". Déplace-les ou supprime-les d'abord.`
      );
      return;
    }
    const doRemove = () => categoriesHook.remove(cat.id);
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm?.(`Supprimer la catégorie "${cat.name}" ?`)
      ) {
        doRemove();
      }
      return;
    }
    Alert.alert(
      'Supprimer cette catégorie ?',
      `"${cat.name}" sera retirée. (Aucun exercice n'y est rattaché.)`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: doRemove },
      ]
    );
  };

  const startCreate = () =>
    setEditingMode({ name: '', labels: '' });

  const startEdit = (mode: CustomCountingMode) =>
    setEditingMode({
      id: mode.id,
      name: mode.name,
      labels: mode.labels.join(', '),
    });

  const cancelEdit = () => setEditingMode(null);

  const saveMode = async () => {
    if (!editingMode) return;
    const name = editingMode.name.trim();
    const labels = editingMode.labels
      .split(/[,\n;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (!name || labels.length === 0) {
      Alert.alert(
        'Mode invalide',
        'Donne un nom et au moins un label (séparés par des virgules).'
      );
      return;
    }
    await customModes.upsert({ id: editingMode.id, name, labels });
    setEditingMode(null);
  };

  const removeMode = (mode: CustomCountingMode) => {
    const doRemove = () => customModes.remove(mode.id);
    if (Platform.OS === 'web') {
      if (
        // eslint-disable-next-line no-alert
        typeof window !== 'undefined' &&
        window.confirm?.(`Supprimer le mode "${mode.name}" ?`)
      ) {
        doRemove();
      }
      return;
    }
    Alert.alert(
      'Supprimer ce mode ?',
      `"${mode.name}" sera retiré. Les exercices qui l'utilisaient compteront en mode linéaire.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: doRemove },
      ]
    );
  };

  // Need the React import for useEffect above
  const onImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled) return;
      const file = res.assets[0];
      const response = await fetch(file.uri);
      const text = await response.text();
      const result = parseExercisesCsv(text);
      if (result.exercises.length === 0) {
        setStatusError(true);
        setStatusMessage(
          'Aucun exercice importé. ' +
            (result.errors[0] ?? 'Vérifie le format CSV.')
        );
        return;
      }
      for (const ex of result.exercises) {
        await saveExercise(ex);
      }
      setStatusError(result.errors.length > 0);
      const errorsSuffix =
        result.errors.length > 0
          ? ` (${result.errors.length} avertissement${
              result.errors.length > 1 ? 's' : ''
            })`
          : '';
      setStatusMessage(
        `${result.exercises.length} exercices importés${errorsSuffix}.`
      );
      if (result.errors.length > 0 && Platform.OS !== 'web') {
        Alert.alert(
          'Avertissements',
          result.errors.slice(0, 5).join('\n')
        );
      }
    } catch (e) {
      setStatusError(true);
      setStatusMessage(`Erreur d'import : ${(e as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.sectionTitle}>Palette</Text>
          <Text style={styles.sectionHelp}>
            Choisis l'ambiance visuelle. Le changement est instantané et
            sauvegardé.
          </Text>
          <View style={styles.paletteCard}>
            {PALETTES_ORDER.map((p) => {
              const active = p === name;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPalette(p)}
                  style={[
                    styles.paletteOption,
                    active && styles.paletteOptionActive,
                  ]}
                >
                  <View
                    style={[
                      styles.paletteRadio,
                      active && styles.paletteRadioActive,
                    ]}
                  >
                    {active && <View style={styles.paletteRadioDot} />}
                  </View>
                  <View style={styles.paletteText}>
                    <Text style={styles.paletteLabel}>
                      {PALETTE_LABELS[p]}
                    </Text>
                    <Text style={styles.paletteDescription}>
                      {PALETTE_DESCRIPTIONS[p]}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {orphanInfo && orphanInfo.total > 0 && (
          <View>
            <Text style={styles.sectionTitle}>⚠ Exercices orphelins</Text>
            <Text style={styles.sectionHelp}>
              {orphanInfo.total} exercice
              {orphanInfo.total > 1 ? 's' : ''} référence
              {orphanInfo.total > 1 ? 'nt' : ''} une catégorie qui n'existe
              plus. Touche le bouton ci-dessous pour les récupérer en
              recréant les catégories manquantes.
            </Text>
            <View style={styles.ioCard}>
              {Object.entries(orphanInfo.counts).map(([id, n]) => (
                <Text key={id} style={styles.preview}>
                  • catégorie « {id} » : {n} exercice{n > 1 ? 's' : ''}
                </Text>
              ))}
              <Button
                title="↺ Récupérer les exercices orphelins"
                onPress={onRepairOrphans}
              />
            </View>
          </View>
        )}

        <View>
          <Text style={styles.sectionTitle}>Catégories (onglets)</Text>
          <Text style={styles.sectionHelp}>
            Crée tes propres catégories pour organiser tes exercices (par
            exemple : "Étirements", "Cardio", "Haut du corps"…). Elles
            apparaissent comme des chips en haut de l'onglet Exercices.
          </Text>
          <View style={styles.ioCard}>
            {categoriesHook.categories.map((cat, i) => (
              <View key={cat.id} style={styles.modeRow}>
                <View style={styles.modeRowText}>
                  <Text style={styles.modeRowName}>
                    {cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name}
                  </Text>
                  <Text style={styles.modeRowLabels}>id : {cat.id}</Text>
                </View>
                <View style={styles.modeRowActions}>
                  <Pressable
                    style={[
                      styles.smallBtn,
                      i === 0 && { opacity: 0.3 },
                    ]}
                    onPress={() =>
                      i > 0 && categoriesHook.reorder(cat.id, 'up')
                    }
                  >
                    <Text style={styles.smallBtnText}>↑</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.smallBtn,
                      i === categoriesHook.categories.length - 1 && {
                        opacity: 0.3,
                      },
                    ]}
                    onPress={() =>
                      i < categoriesHook.categories.length - 1 &&
                      categoriesHook.reorder(cat.id, 'down')
                    }
                  >
                    <Text style={styles.smallBtnText}>↓</Text>
                  </Pressable>
                  {hasSeedProgramme(cat.id) && (
                    <Pressable
                      style={styles.smallBtn}
                      onPress={() => onRestoreCategory(cat.id, cat.name)}
                    >
                      <Text style={styles.smallBtnText}>↺</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.smallBtn}
                    onPress={() => categoriesHook.duplicate(cat.id)}
                  >
                    <Text style={styles.smallBtnText}>Dupl</Text>
                  </Pressable>
                  <Pressable
                    style={styles.smallBtn}
                    onPress={() => startCategoryEdit(cat)}
                  >
                    <Text style={styles.smallBtnText}>Éditer</Text>
                  </Pressable>
                  <Pressable
                    style={styles.smallBtnDanger}
                    onPress={() => removeCategory(cat)}
                  >
                    <Text style={styles.smallBtnDangerText}>Suppr</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {editingCategory && (
              <View style={styles.editorBox}>
                <Text style={styles.editorLabel}>Nom de la catégorie</Text>
                <TextInput
                  style={styles.editorInput}
                  value={editingCategory.name}
                  onChangeText={(v) =>
                    setEditingCategory({ ...editingCategory, name: v })
                  }
                  placeholder="ex. Étirements"
                />
                <Text style={styles.editorLabel}>
                  Emoji ou symbole (optionnel)
                </Text>
                <TextInput
                  style={styles.editorInput}
                  value={editingCategory.emoji}
                  onChangeText={(v) =>
                    setEditingCategory({ ...editingCategory, emoji: v })
                  }
                  placeholder="ex. 🧘 ou ⤤"
                  maxLength={4}
                />
                <View style={styles.editorRow}>
                  <Button
                    title="Annuler"
                    variant="secondary"
                    onPress={cancelCategoryEdit}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Enregistrer"
                    onPress={saveCategory}
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            )}

            {!editingCategory && (
              <Button
                title="+ Nouvelle catégorie"
                variant="secondary"
                onPress={startCategoryCreate}
              />
            )}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Importer / Exporter</Text>
          <Text style={styles.sectionHelp}>
            Édite tes exercices dans Excel, Google Sheets ou Numbers, puis
            importe-les ici. Tu peux aussi exporter ta liste actuelle pour la
            sauvegarder ou la modifier en masse.
          </Text>
          <View style={styles.ioCard}>
            <Button
              title="↓ Télécharger le template CSV"
              variant="secondary"
              onPress={onDownloadTemplate}
            />
            <View style={styles.ioRow}>
              <Button
                title="📂 Importer un CSV"
                onPress={onImport}
                style={styles.ioBtn}
              />
              <Button
                title="↑ Exporter mes exercices"
                variant="secondary"
                onPress={onExport}
                style={styles.ioBtn}
              />
            </View>
            {statusMessage && (
              <View
                style={[
                  styles.status,
                  statusError ? styles.statusErr : styles.statusOk,
                ]}
              >
                <Text style={styles.statusText}>{statusMessage}</Text>
              </View>
            )}

            <Pressable
              onPress={() => setCsvFormatOpen((v) => !v)}
              style={styles.csvToggle}
            >
              <Text style={styles.csvToggleText}>
                {csvFormatOpen ? '▾' : '▸'} Format CSV attendu
              </Text>
            </Pressable>
            {csvFormatOpen && (
              <>
                <Text style={styles.sectionHelp}>
                  Une ligne par{' '}
                  <Text style={{ fontWeight: '700' }}>étape</Text> pour les
                  exercices à répétitions, une ligne par exercice pour les
                  exercices au temps. Toutes les lignes d'un même exercice
                  partagent le même{' '}
                  <Text style={{ fontWeight: '700' }}>name</Text> et la même{' '}
                  <Text style={{ fontWeight: '700' }}>category</Text>.
                </Text>
                <View style={styles.schema}>
                  <Text style={styles.schemaText}>
                    {'name, category, description, type,'}
                    {'\n  '}
                    {'repetitions, repCountingMode,'}
                    {'\n  '}
                    {'duration, pace, countingMode,'}
                    {'\n  '}
                    {'step_order, step_instruction, step_duration, step_count'}
                    {'\n\n'}
                    {'• category : bar | mat | <id custom>'}
                    {'\n'}
                    {'• type : repetition | time'}
                    {'\n'}
                    {'• repCountingMode / countingMode : linear | reverse | pyramid8'}
                    {'\n'}
                    {'• step_count : none | linear | reverse | pyramid8'}
                    {'\n'}
                    {'• pyramid8 verrouille à 16 reps / 16 secondes'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Modes de comptage personnalisés</Text>
          <Text style={styles.sectionHelp}>
            Crée tes propres séquences de comptage (par ex. une descente lente,
            un schéma respiratoire 4-7-8, un comptage en rimes…). Chaque label
            est prononcé par le coach. Le nombre de labels fixe la durée (1
            label = 1 seconde) ou le nombre de répétitions, selon où le mode
            est utilisé.
          </Text>
          <View style={styles.ioCard}>
            {customModes.modes.length === 0 && !editingMode && (
              <Text style={styles.preview}>
                Aucun mode personnalisé pour l'instant.
              </Text>
            )}
            {customModes.modes.map((mode) => (
              <View key={mode.id} style={styles.modeRow}>
                <View style={styles.modeRowText}>
                  <Text style={styles.modeRowName}>
                    ★ {mode.name} ({mode.labels.length})
                  </Text>
                  <Text style={styles.modeRowLabels} numberOfLines={2}>
                    {mode.labels.join(' · ')}
                  </Text>
                </View>
                <View style={styles.modeRowActions}>
                  <Pressable
                    style={styles.smallBtn}
                    onPress={() => startEdit(mode)}
                  >
                    <Text style={styles.smallBtnText}>Éditer</Text>
                  </Pressable>
                  <Pressable
                    style={styles.smallBtnDanger}
                    onPress={() => removeMode(mode)}
                  >
                    <Text style={styles.smallBtnDangerText}>Suppr</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {editingMode && (
              <View style={styles.editorBox}>
                <Text style={styles.editorLabel}>Nom du mode</Text>
                <TextInput
                  style={styles.editorInput}
                  value={editingMode.name}
                  onChangeText={(v) =>
                    setEditingMode({ ...editingMode, name: v })
                  }
                  placeholder="ex. Respiration 4-7-8"
                />
                <Text style={styles.editorLabel}>
                  Labels (séparés par des virgules)
                </Text>
                <TextInput
                  style={[styles.editorInput, { minHeight: 60 }]}
                  value={editingMode.labels}
                  onChangeText={(v) =>
                    setEditingMode({ ...editingMode, labels: v })
                  }
                  multiline
                  placeholder="ex. inspire, 2, 3, 4, retiens, 2, 3, 4, 5, 6, 7, expire, 2, 3, 4, 5, 6, 7, 8"
                />
                <Text style={styles.preview}>
                  Aperçu :{' '}
                  {editingMode.labels
                    .split(/[,\n;]+/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </Text>
                <View style={styles.editorRow}>
                  <Button
                    title="Annuler"
                    variant="secondary"
                    onPress={cancelEdit}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Enregistrer"
                    onPress={saveMode}
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            )}

            {!editingMode && (
              <Button
                title="+ Nouveau mode"
                variant="secondary"
                onPress={startCreate}
              />
            )}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Aide</Text>
          <Text style={styles.sectionHelp}>
            Revoir la présentation rapide de l'app.
          </Text>
          <Button
            title="↻ Revoir le tour"
            variant="secondary"
            onPress={onboarding.start}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
