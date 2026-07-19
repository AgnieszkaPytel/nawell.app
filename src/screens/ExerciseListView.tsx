import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { VoiceWarning } from '../components/VoiceWarning';
import {
  formatDurationCompact,
  totalDurationSeconds,
} from '../engine/duration';
import { useCategories } from '../hooks/useCategories';
import { useCustomModes } from '../hooks/useCustomModes';
import {
  deleteExercise,
  listExercisesByCategory,
  seedIfEmpty,
} from '../storage';
import { radius, spacing, useThemedStyles } from '../theme';
import type { Exercise } from '../types';

const SELECTED_KEY = 'calisthenics.selectedCategory.v1';

export function ExerciseListView() {
  const { categories, ready: categoriesReady } = useCategories();
  const { modes: customModes } = useCustomModes();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const styles = useThemedStyles((c) =>
    StyleSheet.create({
      container: { flex: 1, backgroundColor: c.bg },
      catBar: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      },
      catScroll: { gap: spacing.xs, alignItems: 'center' },
      catChip: {
        paddingVertical: 6,
        paddingHorizontal: spacing.md - 2,
        borderRadius: radius.lg,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        marginRight: spacing.xs,
      },
      catChipActive: {
        backgroundColor: c.accent,
        borderColor: c.accent,
      },
      catChipText: {
        color: c.text,
        fontSize: 13,
        fontWeight: '600',
      },
      catChipTextActive: { color: c.accentText },
      toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      },
      toolbarStack: { flex: 1, gap: 2 },
      toolbarCount: { color: c.textMuted, fontSize: 12 },
      toolbarDuration: {
        color: c.text,
        fontSize: 12,
        fontWeight: '600',
      },
      toolbarBtns: { flexDirection: 'row', gap: spacing.xs },
      toolbarBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: radius.sm,
        backgroundColor: c.surfaceAlt,
      },
      toolbarBtnText: { color: c.text, fontSize: 12, fontWeight: '600' },
      toolbarBtnDanger: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: radius.sm,
        backgroundColor: c.danger,
      },
      toolbarBtnDangerText: {
        color: c.accentText,
        fontSize: 12,
        fontWeight: '700',
      },
      listContent: { padding: spacing.md, gap: spacing.sm },
      emptyWrap: { flex: 1, justifyContent: 'center', padding: spacing.lg },
      empty: { alignItems: 'center', gap: spacing.sm },
      emptyTitle: { color: c.text, fontSize: 18, fontWeight: '600' },
      emptyText: { color: c.textMuted, textAlign: 'center' },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surface,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.border,
        gap: spacing.md,
      },
      rowSelected: { borderColor: c.accent },
      checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: c.border,
        alignItems: 'center',
        justifyContent: 'center',
      },
      checkboxOn: { borderColor: c.accent },
      checkboxDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: c.accent,
      },
      rowText: { flex: 1 },
      rowTitle: { color: c.text, fontSize: 16, fontWeight: '600' },
      rowSub: { color: c.textMuted, fontSize: 13, marginTop: 2 },
      editBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: radius.sm,
        backgroundColor: c.surfaceAlt,
      },
      editBtnText: { color: c.text, fontSize: 13, fontWeight: '500' },
      footer: {
        flexDirection: 'row',
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: c.border,
        backgroundColor: c.bg,
      },
    })
  );

  // Restore last-active category once we know which categories exist
  useEffect(() => {
    if (!categoriesReady || categories.length === 0) return;
    if (activeCategory && categories.some((c) => c.id === activeCategory)) return;
    (async () => {
      const stored = await AsyncStorage.getItem(SELECTED_KEY);
      if (stored && categories.some((c) => c.id === stored)) {
        setActiveCategory(stored);
      } else {
        setActiveCategory(categories[0].id);
      }
    })();
  }, [categoriesReady, categories, activeCategory]);

  const refresh = useCallback(async () => {
    if (!activeCategory) return;
    await seedIfEmpty();
    const list = await listExercisesByCategory(activeCategory);
    setExercises(list);
    setSelected((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (list.some((e) => e.id === id)) next.add(id);
      });
      return next;
    });
  }, [activeCategory]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const allSelected = useMemo(
    () => exercises.length > 0 && exercises.every((e) => selected.has(e.id)),
    [exercises, selected]
  );

  const totalDuration = useMemo(
    () => totalDurationSeconds(exercises, customModes),
    [exercises, customModes]
  );

  const selectedDuration = useMemo(
    () =>
      totalDurationSeconds(
        exercises.filter((e) => selected.has(e.id)),
        customModes
      ),
    [exercises, selected, customModes]
  );

  const switchCategory = (id: string) => {
    setActiveCategory(id);
    setSelected(new Set());
    AsyncStorage.setItem(SELECTED_KEY, id).catch(() => undefined);
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(exercises.map((e) => e.id)));
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startWorkout = () => {
    const ids = exercises.filter((e) => selected.has(e.id)).map((e) => e.id);
    if (ids.length === 0) return;
    router.push({ pathname: '/player', params: { ids: ids.join(',') } });
  };

  const confirmDelete = async (id: string) => {
    await deleteExercise(id);
    refresh();
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const doDelete = async () => {
      for (const id of ids) await deleteExercise(id);
      setSelected(new Set());
      refresh();
    };
    const message = `Supprimer ${ids.length} exercice${
      ids.length > 1 ? 's' : ''
    } ? Cette action est définitive.`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm?.(message)) {
        doDelete();
      }
      return;
    }
    Alert.alert('Confirmer la suppression', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: doDelete },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <VoiceWarning />
      <View style={styles.catBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {categories.map((cat) => {
            const active = cat.id === activeCategory;
            return (
              <Pressable
                key={cat.id}
                onPress={() => switchCategory(cat.id)}
                style={[styles.catChip, active && styles.catChipActive]}
              >
                <Text
                  style={[
                    styles.catChipText,
                    active && styles.catChipTextActive,
                  ]}
                >
                  {cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.toolbar}>
        <View style={styles.toolbarStack}>
          <Text style={styles.toolbarCount}>
            {exercises.length} exercice{exercises.length > 1 ? 's' : ''} ·{' '}
            <Text style={styles.toolbarDuration}>
              ⌚ {formatDurationCompact(totalDuration)}
            </Text>
            {selected.size > 0 ? (
              <>
                {'  ·  '}
                {selected.size} sél. ·{' '}
                <Text style={styles.toolbarDuration}>
                  ⌚ {formatDurationCompact(selectedDuration)}
                </Text>
              </>
            ) : null}
          </Text>
        </View>
        <View style={styles.toolbarBtns}>
          {selected.size > 0 && (
            <Pressable onPress={deleteSelected} style={styles.toolbarBtnDanger}>
              <Text style={styles.toolbarBtnDangerText}>
                Suppr ({selected.size})
              </Text>
            </Pressable>
          )}
          <Pressable onPress={toggleAll} style={styles.toolbarBtn}>
            <Text style={styles.toolbarBtnText}>
              {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={exercises}
        keyExtractor={(e) => e.id}
        contentContainerStyle={
          exercises.length === 0 ? styles.emptyWrap : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun exercice</Text>
            <Text style={styles.emptyText}>
              Crée ton premier exercice pour démarrer cette catégorie.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <Pressable
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => toggle(item.id)}
              onLongPress={() => confirmDelete(item.id)}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
                {isSelected && <View style={styles.checkboxDot} />}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSub}>
                  {item.type === 'time'
                    ? `Temps · ${item.duration}s`
                    : `Reps · ${item.repetitions}× ${item.steps.length} étapes`}
                </Text>
              </View>
              <Link href={`/exercise/${item.id}`} asChild>
                <Pressable style={styles.editBtn} hitSlop={8}>
                  <Text style={styles.editBtnText}>Éditer</Text>
                </Pressable>
              </Link>
            </Pressable>
          );
        }}
      />
      <View style={styles.footer}>
        <Button
          title="Nouvel exercice"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/exercise/[id]',
              params: { id: 'new', category: activeCategory ?? 'mat' },
            })
          }
          style={{ flex: 1, marginRight: spacing.sm }}
        />
        <Button
          title={
            selected.size === 0
              ? 'Sélectionne pour lancer'
              : `Lancer (${selected.size})`
          }
          onPress={startWorkout}
          disabled={selected.size === 0}
          style={{ flex: 1.2 }}
        />
      </View>
    </SafeAreaView>
  );
}
