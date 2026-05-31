import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'src/components/auth',
    'src/components/layout/DashboardLayout.tsx',
    'src/components/meeting',
    'src/hooks',
    'src/pages/AnalyticsPage.tsx',
    'src/pages/AuthSuccessPage.tsx',
    'src/pages/DashboardPage.tsx',
    'src/pages/JoinMeeting.tsx',
    'src/pages/MeetingsPage.tsx',
    'src/pages/ProfilePage.tsx',
    'src/pages/ProjectsPage.tsx',
    'src/pages/VideoRoom.tsx',
    'src/stores',
    'src/utils',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])
