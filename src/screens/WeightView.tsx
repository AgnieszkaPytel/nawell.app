import { useCallback, useEffect, useState } from 'react';
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
import { Button } from '../components/Button';
import { WeightChart } from '../components/WeightChart';
import {
  daysBetween,
  daysToTarget,
  deleteWeightEntry,
  getWeightSettings,
  isoDate,
  listWeightEntries,
  plannedWeightAt,
  saveWeightSettings,
  upsertWeightEntry,
} from '../storage';
import { radius, spacing, useThemedStyles } from '../theme';
import type { WeightEntry, WeightSettings } from '../types';

const DEFAULT_SETTINGS: WeightSettings = {
  startDate: isoDate(Date.now()),
  startWeight: 53.9,
  targetWeight: 49.5,
  dailyLossGrams: 100,
  minWeight: 49.5,
  maxWeight: 54,
};

/** Parse "53,9" or "53.9" as 53.9. */
function parseKg(raw: string): number | null {
  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Format 53.9 → "53,9". */
function fmt(kg: number, decimals = 1): string {
  return kg.toFixed(decimals).replace('.', ',');
}

/** Validate a YYYY-MM-DD string as a real date. */
function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime()) && s === d.toISOString().slice(0, 10);
}

/** Add `days` days to an ISO date. */
function shiftIsoDate(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d.getTime());
}

export function WeightView() {
  const [settings, setSettings] = useState<WeightSettings | null>(null);
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [weightInput, setWeightInput] = useState('');
  const [entryDate, setEntryDate] = useState(() => isoDate(Date.now()));
  const [chartWidth, setChartWidth] = useState(0);
  const [editingSettings, setEditingSettings] = useState(false);
  const [draft, setDraft] = useState<{
    startWeight: string;
    targetWeight: string;
    dailyLossGrams: string;
    minWeight: string;
    maxWeight: string;
    startDate: string;
  } | null>(null);

  const styles = useThemedStyles((c) =>
    StyleSheet.create({
      container: { flex: 1, backgroundColor: c.bg },
      content: { padding: spacing.md, gap: spacing.md },
      header: {
        gap: spacing.xs,
      },
      title: { color: c.text, fontSize: 20, fontWeight: '700' },
      helper: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
      statsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
      },
      statCard: {
        flex: 1,
        backgroundColor: c.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.border,
        padding: spacing.sm + 2,
        gap: 2,
      },
      statLabel: {
        color: c.textMuted,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontWeight: '700',
      },
      statValue: { color: c.text, fontSize: 22, fontWeight: '700' },
      statSub: { color: c.textMuted, fontSize: 11 },
      chartWrap: {
        width: '100%',
      },
      sectionTitle: {
        color: c.text,
        fontSize: 14,
        fontWeight: '700',
        marginTop: spacing.sm,
      },
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
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      },
      entryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: c.surface,
        padding: spacing.sm + 2,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: c.border,
      },
      entryText: { color: c.text, fontSize: 14 },
      entryPlan: { color: c.textMuted, fontSize: 11 },
      dateBtn: {
        paddingVertical: 6,
        paddingHorizontal: spacing.sm + 2,
        borderRadius: radius.sm,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
      },
      dateBtnText: {
        color: c.text,
        fontSize: 12,
        fontWeight: '600',
      },
      deleteBtn: {
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.sm,
        backgroundColor: c.danger,
      },
      deleteBtnText: {
        color: c.accentText,
        fontSize: 11,
        fontWeight: '700',
      },
      legendRow: {
        flexDirection: 'row',
        gap: spacing.md,
        flexWrap: 'wrap',
      },
      legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
      legendDotHollow: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: c.textMuted,
      },
      legendDotFilled: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: c.accent,
      },
      legendText: { color: c.textMuted, fontSize: 11 },
      settingsBox: {
        backgroundColor: c.surfaceAlt,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.border,
        padding: spacing.md,
        gap: spacing.sm,
      },
      settingsLabel: { color: c.textMuted, fontSize: 12 },
    })
  );

  const refresh = useCallback(async () => {
    const s = (await getWeightSettings()) ?? DEFAULT_SETTINGS;
    setSettings(s);
    setEntries(await listWeightEntries());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openSettings = () => {
    if (!settings) return;
    setDraft({
      startWeight: fmt(settings.startWeight),
      targetWeight: fmt(settings.targetWeight),
      dailyLossGrams: String(settings.dailyLossGrams),
      minWeight: settings.minWeight != null ? fmt(settings.minWeight) : '',
      maxWeight: settings.maxWeight != null ? fmt(settings.maxWeight) : '',
      startDate: settings.startDate,
    });
    setEditingSettings(true);
  };

  const saveSettings = async () => {
    if (!draft) return;
    const startWeight = parseKg(draft.startWeight);
    const targetWeight = parseKg(draft.targetWeight);
    const dailyLossGrams = parseInt(
      draft.dailyLossGrams.replace(/[^0-9]/g, ''),
      10
    );
    if (
      startWeight == null ||
      targetWeight == null ||
      !Number.isFinite(dailyLossGrams) ||
      dailyLossGrams <= 0
    ) {
      Alert.alert('Valeurs invalides', 'Vérifie les poids et la perte quotidienne.');
      return;
    }
    const minWeight = parseKg(draft.minWeight) ?? undefined;
    const maxWeight = parseKg(draft.maxWeight) ?? undefined;
    const next: WeightSettings = {
      startDate: draft.startDate || isoDate(Date.now()),
      startWeight,
      targetWeight,
      dailyLossGrams,
      minWeight,
      maxWeight,
    };
    await saveWeightSettings(next);
    setEditingSettings(false);
    setDraft(null);
    refresh();
  };

  const saveWeight = async () => {
    const w = parseKg(weightInput);
    if (w == null || w <= 0) {
      Alert.alert('Poids invalide', 'Entre un poids en kg (ex. 53,9).');
      return;
    }
    if (!isValidIsoDate(entryDate)) {
      Alert.alert(
        'Date invalide',
        'Utilise le format AAAA-MM-JJ (ex. 2026-07-12).'
      );
      return;
    }
    await upsertWeightEntry(entryDate, w);
    setWeightInput('');
    setEntryDate(isoDate(Date.now()));
    refresh();
  };

  const shiftDate = (days: number) =>
    setEntryDate((d) => shiftIsoDate(d, days));

  const confirmDelete = (date: string) => {
    const doDelete = async () => {
      await deleteWeightEntry(date);
      refresh();
    };
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm?.(`Supprimer l'entrée du ${date} ?`)
      ) {
        doDelete();
      }
      return;
    }
    Alert.alert(
      "Supprimer l'entrée",
      `L'entrée du ${date} sera effacée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  if (!settings) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: spacing.md }}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const today = isoDate(Date.now());
  const daysSinceStart = Math.max(0, daysBetween(settings.startDate, today));
  const plannedToday = plannedWeightAt(settings, daysSinceStart);
  const todayEntry = entries.find((e) => e.date === today);
  const lastEntry = entries[entries.length - 1];
  const currentWeight = todayEntry?.weight ?? lastEntry?.weight ?? settings.startWeight;
  const delta = currentWeight - plannedToday;
  const nDaysToTarget = daysToTarget(settings);

  // For the entry form, detect if a weight already exists for the selected date.
  const existingForEntryDate = entries.find((e) => e.date === entryDate);
  const entryDateIsToday = entryDate === today;
  const entryDateIsYesterday = entryDate === shiftIsoDate(today, -1);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>⚖ Poids</Text>
          <Text style={styles.helper}>
            Perte quotidienne planifiée : {settings.dailyLossGrams} g/jour.
            Objectif : {fmt(settings.targetWeight)} kg en {nDaysToTarget} jours.
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Aujourd'hui</Text>
            <Text style={styles.statValue}>{fmt(currentWeight)} kg</Text>
            <Text style={styles.statSub}>
              {todayEntry ? 'Pesée du jour' : 'Dernière pesée'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Planning</Text>
            <Text style={styles.statValue}>{fmt(plannedToday)} kg</Text>
            <Text style={styles.statSub}>
              Écart : {delta > 0 ? '+' : ''}
              {fmt(delta, 2)} kg
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Jour</Text>
            <Text style={styles.statValue}>
              {daysSinceStart}/{nDaysToTarget}
            </Text>
            <Text style={styles.statSub}>
              Cible : {fmt(settings.targetWeight)} kg
            </Text>
          </View>
        </View>

        {/* Chart */}
        <View
          style={styles.chartWrap}
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
        >
          {chartWidth > 0 && (
            <WeightChart
              settings={settings}
              entries={entries}
              width={chartWidth}
              height={240}
            />
          )}
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={styles.legendDotHollow} />
            <Text style={styles.legendText}>Planning ({settings.dailyLossGrams} g/j)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendDotFilled} />
            <Text style={styles.legendText}>Pesées réelles</Text>
          </View>
        </View>

        {/* Enter a weight for a specific date (defaults to today) */}
        <View>
          <Text style={styles.sectionTitle}>
            {entryDateIsToday
              ? 'Pesée du jour'
              : entryDateIsYesterday
              ? "Pesée d'hier"
              : `Pesée du ${entryDate}`}
            {existingForEntryDate ? ' (déjà enregistrée)' : ''}
          </Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder={
                existingForEntryDate
                  ? fmt(existingForEntryDate.weight)
                  : 'ex. 53,9'
              }
              keyboardType="decimal-pad"
            />
            <Button
              title={existingForEntryDate ? 'Mettre à jour' : 'Enregistrer'}
              onPress={saveWeight}
            />
          </View>

          <Text style={[styles.helper, { marginTop: spacing.xs }]}>
            Date de la pesée
          </Text>
          <View style={styles.row}>
            <Pressable
              style={styles.dateBtn}
              onPress={() => shiftDate(-1)}
            >
              <Text style={styles.dateBtnText}>← 1 jour</Text>
            </Pressable>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={entryDate}
              onChangeText={setEntryDate}
              placeholder="2026-07-12"
              autoCapitalize="none"
            />
            <Pressable
              style={styles.dateBtn}
              onPress={() => shiftDate(1)}
            >
              <Text style={styles.dateBtnText}>1 jour →</Text>
            </Pressable>
          </View>
          <View
            style={[
              styles.row,
              { marginTop: spacing.xs, flexWrap: 'wrap' },
            ]}
          >
            <Pressable
              style={styles.dateBtn}
              onPress={() => setEntryDate(today)}
            >
              <Text style={styles.dateBtnText}>Aujourd'hui</Text>
            </Pressable>
            <Pressable
              style={styles.dateBtn}
              onPress={() => setEntryDate(shiftIsoDate(today, -1))}
            >
              <Text style={styles.dateBtnText}>Hier</Text>
            </Pressable>
            <Pressable
              style={styles.dateBtn}
              onPress={() => setEntryDate(shiftIsoDate(today, -2))}
            >
              <Text style={styles.dateBtnText}>Avant-hier</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent entries */}
        {entries.length > 0 && (
          <View style={{ gap: spacing.xs }}>
            <Text style={styles.sectionTitle}>Dernières pesées</Text>
            {entries
              .slice(-8)
              .reverse()
              .map((e) => {
                const dayIdx = daysBetween(settings.startDate, e.date);
                const planned = plannedWeightAt(settings, Math.max(0, dayIdx));
                const diff = e.weight - planned;
                return (
                  <View key={e.date} style={styles.entryRow}>
                    <View>
                      <Text style={styles.entryText}>
                        {e.date} · {fmt(e.weight)} kg
                      </Text>
                      <Text style={styles.entryPlan}>
                        planning : {fmt(planned)} kg · écart{' '}
                        {diff > 0 ? '+' : ''}
                        {fmt(diff, 2)} kg
                      </Text>
                    </View>
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => confirmDelete(e.date)}
                    >
                      <Text style={styles.deleteBtnText}>Suppr</Text>
                    </Pressable>
                  </View>
                );
              })}
          </View>
        )}

        {/* Settings */}
        <View style={{ gap: spacing.xs }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <Text style={styles.sectionTitle}>Réglages</Text>
            {!editingSettings && (
              <Pressable onPress={openSettings}>
                <Text
                  style={{ color: styles.entryPlan.color, fontSize: 12 }}
                >
                  Modifier
                </Text>
              </Pressable>
            )}
          </View>

          {!editingSettings ? (
            <View style={styles.settingsBox}>
              <Text style={styles.settingsLabel}>
                Départ : {settings.startDate} — {fmt(settings.startWeight)} kg
              </Text>
              <Text style={styles.settingsLabel}>
                Cible : {fmt(settings.targetWeight)} kg
              </Text>
              <Text style={styles.settingsLabel}>
                Perte planifiée : {settings.dailyLossGrams} g / jour
              </Text>
              <Text style={styles.settingsLabel}>
                Axe Y : {fmt(settings.minWeight ?? settings.targetWeight)} →{' '}
                {fmt(settings.maxWeight ?? settings.startWeight)} kg
              </Text>
            </View>
          ) : (
            draft && (
              <View style={styles.settingsBox}>
                <Text style={styles.settingsLabel}>Date de départ (AAAA-MM-JJ)</Text>
                <TextInput
                  style={styles.input}
                  value={draft.startDate}
                  onChangeText={(v) => setDraft({ ...draft, startDate: v })}
                  placeholder="2026-05-20"
                  autoCapitalize="none"
                />
                <Text style={styles.settingsLabel}>Poids de départ (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={draft.startWeight}
                  onChangeText={(v) => setDraft({ ...draft, startWeight: v })}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.settingsLabel}>Poids cible (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={draft.targetWeight}
                  onChangeText={(v) => setDraft({ ...draft, targetWeight: v })}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.settingsLabel}>Perte planifiée (g/jour)</Text>
                <TextInput
                  style={styles.input}
                  value={draft.dailyLossGrams}
                  onChangeText={(v) =>
                    setDraft({ ...draft, dailyLossGrams: v })
                  }
                  keyboardType="numeric"
                />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingsLabel}>Axe Y — min</Text>
                    <TextInput
                      style={styles.input}
                      value={draft.minWeight}
                      onChangeText={(v) => setDraft({ ...draft, minWeight: v })}
                      placeholder="49,5"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingsLabel}>Axe Y — max</Text>
                    <TextInput
                      style={styles.input}
                      value={draft.maxWeight}
                      onChangeText={(v) => setDraft({ ...draft, maxWeight: v })}
                      placeholder="54"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <Button
                    title="Annuler"
                    variant="secondary"
                    onPress={() => {
                      setEditingSettings(false);
                      setDraft(null);
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Enregistrer"
                    onPress={saveSettings}
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
