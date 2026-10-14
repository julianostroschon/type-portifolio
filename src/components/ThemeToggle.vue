<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

type Theme = 'light' | 'dark'
const theme = ref<Theme>(
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
)
const systemPreference = window.matchMedia('(prefers-color-scheme: dark)')
let followsSystem = true
try {
  const saved = localStorage.getItem('portfolio-theme')
  followsSystem = saved !== 'light' && saved !== 'dark'
} catch {
  // The toggle remains usable when browser storage is disabled.
}

function applyTheme(next: Theme) {
  theme.value = next
  document.documentElement.dataset.theme = next
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', next === 'dark' ? '#171c16' : '#f8f9f4')
}

function toggleTheme() {
  followsSystem = false
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  try {
    localStorage.setItem('portfolio-theme', theme.value)
  } catch {}
}

function onSystemChange(event: MediaQueryListEvent) {
  if (followsSystem) applyTheme(event.matches ? 'dark' : 'light')
}
systemPreference.addEventListener('change', onSystemChange)
onBeforeUnmount(() =>
  systemPreference.removeEventListener('change', onSystemChange),
)
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    aria-label="Modo escuro"
    :aria-pressed="theme === 'dark'"
    :title="theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'"
    @click="toggleTheme"
  >
    <svg v-if="theme === 'light'" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z" />
    </svg>
    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"
      />
    </svg>
  </button>
</template>
