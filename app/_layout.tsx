import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Onboarding } from '../src/components/Onboarding';
import { OnboardingProvider } from '../src/hooks/useOnboarding';
import { ThemeProvider, useTheme } from '../src/theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <OnboardingProvider>
        <ThemedStack />
      </OnboardingProvider>
    </ThemeProvider>
  );
}

function ThemedStack() {
  const { colors } = useTheme();
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="exercise/[id]"
          options={{ title: 'Exercice', headerShown: true }}
        />
        <Stack.Screen
          name="player"
          options={{
            title: 'Séance',
            headerBackVisible: false,
            headerShown: true,
          }}
        />
      </Stack>
      <Onboarding />
    </>
  );
}
