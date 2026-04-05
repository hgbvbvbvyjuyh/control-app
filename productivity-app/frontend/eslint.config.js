import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  /**
   * Legitimate sync from props / modal lifecycle (reset when closed, clear errors).
   * Scoped so the rest of the app still benefits from the rule where enabled by the preset.
   */
  {
    files: [
      'src/components/JournalModal.tsx',
      'src/components/GoalModal.tsx',
      'src/components/FrameworkModal.tsx',
      'src/pages/Goals.tsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
