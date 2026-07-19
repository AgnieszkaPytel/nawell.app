import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTheme } from '../../src/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Exercices',
          tabBarIcon: ({ color }) => <TabIcon char="✦" color={color} />,
        }}
      />
      <Tabs.Screen
        name="weight"
        options={{
          title: 'Poids',
          tabBarIcon: ({ color }) => <TabIcon char="⚖" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Réglages',
          tabBarIcon: ({ color }) => <TabIcon char="⚙" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ char, color }: { char: string; color: string }) {
  return (
    <Text style={{ color, fontSize: 18, fontWeight: '700' }}>{char}</Text>
  );
}
