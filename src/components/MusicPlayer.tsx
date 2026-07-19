import * as DocumentPicker from 'expo-document-picker';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { radius, spacing, useThemedStyles } from '../theme';

interface Source {
  uri: string;
  name: string;
}

export function MusicPlayer() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [urlInput, setUrlInput] = useState('');
  const [expanded, setExpanded] = useState(false);

  const styles = useThemedStyles((c) =>
    StyleSheet.create({
      card: {
        backgroundColor: c.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.border,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm + 2,
      },
      headerText: {
        color: c.text,
        fontWeight: '700',
        fontSize: 14,
        textAlign: 'center',
      },
      toggle: { color: c.textMuted, fontSize: 14, marginLeft: spacing.sm },
      body: { padding: spacing.sm + 2, paddingTop: 0, gap: spacing.sm },
      rowGap: { gap: spacing.xs },
      input: {
        backgroundColor: c.bg,
        color: c.text,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: c.border,
        fontSize: 13,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : {}),
      },
      btn: {
        backgroundColor: c.surfaceAlt,
        paddingVertical: 8,
        paddingHorizontal: spacing.md,
        borderRadius: radius.sm,
        alignItems: 'center',
      },
      btnText: { color: c.text, fontSize: 13, fontWeight: '500' },
      btnPrimary: {
        backgroundColor: c.accent,
        paddingVertical: 8,
        paddingHorizontal: spacing.md,
        borderRadius: radius.sm,
        alignItems: 'center',
        flex: 1,
      },
      btnPrimaryText: { color: c.accentText, fontSize: 13, fontWeight: '600' },
      controls: { flexDirection: 'row', gap: spacing.xs },
      volumeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      label: { color: c.textMuted, fontSize: 12 },
      volumeBtns: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
      },
      smallBtn: {
        backgroundColor: c.surfaceAlt,
        width: 28,
        height: 28,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
      },
      smallBtnText: { color: c.text, fontSize: 16, fontWeight: '700' },
      volumeValue: {
        color: c.text,
        fontSize: 12,
        fontWeight: '600',
        minWidth: 36,
        textAlign: 'center',
      },
      hint: { color: c.textMuted, fontSize: 11, fontStyle: 'italic' },
      youtubeRow: {
        paddingTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: c.border,
      },
      youtubeText: { color: c.textMuted, fontSize: 11 },
    })
  );

  useEffect(() => {
    return () => {
      try {
        playerRef.current?.pause();
        playerRef.current?.remove();
      } catch {
        /* noop */
      }
      playerRef.current = null;
    };
  }, []);

  const loadSource = (s: Source) => {
    try {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.remove();
        playerRef.current = null;
      }
      const player = createAudioPlayer({ uri: s.uri });
      player.loop = true;
      player.volume = volume;
      playerRef.current = player;
      setSource(s);
      setPlaying(false);
    } catch (e) {
      console.warn('Failed to load audio source', e);
    }
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return;
    const file = res.assets[0];
    loadSource({ uri: file.uri, name: file.name });
  };

  const loadFromUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    loadSource({ uri: url, name: shortName(url) });
  };

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pause();
    else p.play();
    setPlaying(!playing);
  };

  const stop = () => {
    const p = playerRef.current;
    if (!p) return;
    p.pause();
    try {
      p.seekTo(0);
    } catch {
      /* noop */
    }
    setPlaying(false);
  };

  const setVol = (v: number) => {
    const next = Math.max(0, Math.min(1, v));
    setVolume(next);
    if (playerRef.current) playerRef.current.volume = next;
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={() => setExpanded((e) => !e)} style={styles.header}>
        <Text style={styles.headerText}>
          ♪ Musique{source ? ` · ${source.name}` : ''}
        </Text>
        <Text style={styles.toggle}>{expanded ? '▾' : '▸'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          <View style={styles.rowGap}>
            <Pressable style={styles.btn} onPress={pickFile}>
              <Text style={styles.btnText}>Choisir un fichier mp3</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="…ou colle une URL audio (mp3)"
                autoCapitalize="none"
              />
              <Pressable style={styles.btn} onPress={loadFromUrl}>
                <Text style={styles.btnText}>OK</Text>
              </Pressable>
            </View>
          </View>

          {source && (
            <View style={styles.controls}>
              <Pressable style={styles.btnPrimary} onPress={togglePlay}>
                <Text style={styles.btnPrimaryText}>
                  {playing ? '⏸ Pause' : '▶ Lecture'}
                </Text>
              </Pressable>
              <Pressable style={styles.btn} onPress={stop}>
                <Text style={styles.btnText}>■ Stop</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.volumeRow}>
            <Text style={styles.label}>Volume</Text>
            <View style={styles.volumeBtns}>
              <Pressable
                style={styles.smallBtn}
                onPress={() => setVol(volume - 0.1)}
              >
                <Text style={styles.smallBtnText}>−</Text>
              </Pressable>
              <Text style={styles.volumeValue}>
                {Math.round(volume * 100)}%
              </Text>
              <Pressable
                style={styles.smallBtn}
                onPress={() => setVol(volume + 0.1)}
              >
                <Text style={styles.smallBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.hint}>
            La voix du coach se superpose à la musique automatiquement.
          </Text>

          <Pressable
            onPress={() => Linking.openURL('https://music.youtube.com/')}
            style={styles.youtubeRow}
          >
            <Text style={styles.youtubeText}>
              ▶ YouTube : ouvre dans un autre onglet/app, le coach se mixe
              par-dessus.
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function shortName(url: string): string {
  try {
    const u = new URL(url);
    const file = u.pathname.split('/').pop() || u.hostname;
    return decodeURIComponent(file).slice(0, 40);
  } catch {
    return url.slice(0, 40);
  }
}
