import { Alert, Platform } from 'react-native';

/**
 * Trigger a text-file download.
 * On web: creates a Blob + temporary anchor.
 * On native: shows a message (file-system / sharing not yet wired).
 */
export async function downloadText(
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8'
): Promise<void> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  Alert.alert(
    'Téléchargement',
    "Sur mobile, ouvre l'app dans un navigateur web pour télécharger ce fichier."
  );
}
