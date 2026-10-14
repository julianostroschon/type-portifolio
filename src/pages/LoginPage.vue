<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminHeader from '../components/AdminHeader.vue'
import { getAccess, signIn, signOut } from '../services/auth'
import { supabaseConfigured } from '../services/supabase'
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const canSignOut = ref(route.query.reason === 'forbidden')
const notice = computed(
  () =>
    ({
      forbidden:
        'Sua conta está autenticada, mas não tem permissão administrativa.',
      unavailable: 'Não foi possível verificar o acesso. Tente novamente.',
    })[route.query.reason] ?? '',
)
async function submit() {
  busy.value = true
  error.value = ''
  try {
    await signIn(email.value, password.value)
    password.value = ''
    const access = await getAccess()
    if (!access.admin) {
      canSignOut.value = true
      throw new Error('Sua conta não tem permissão administrativa.')
    }
    await router.replace('/admin')
  } catch (cause) {
    error.value = cause.message
  } finally {
    busy.value = false
  }
}
async function logout() {
  busy.value = true
  try {
    await signOut()
    canSignOut.value = false
    error.value = ''
    await router.replace('/login')
  } catch (cause) {
    error.value = cause.message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <AdminHeader />
  <main class="wrap login-page">
    <p class="eyebrow">ÁREA ADMINISTRATIVA</p>
    <h1>Acesse seu painel<span>.</span></h1>
    <p class="admin-description">
      Entre para gerenciar os projetos do portfólio.
    </p>
    <p v-if="!supabaseConfigured" class="form-message" role="status">
      O login estará disponível após a configuração da plataforma.
    </p>
    <p v-if="notice" class="form-message" role="status">{{ notice }}</p>
    <form class="admin-form" @submit.prevent="submit">
      <label
        >E-mail<input
          v-model="email"
          type="email"
          autocomplete="username"
          required
          maxlength="254"
          :disabled="busy || !supabaseConfigured"
      /></label>
      <label
        >Senha<input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          :disabled="busy || !supabaseConfigured"
      /></label>
      <p v-if="error" class="form-message" role="alert">{{ error }}</p>
      <button class="button" :disabled="busy || !supabaseConfigured">
        {{ busy ? 'Verificando…' : 'Entrar' }}
      </button>
      <button
        v-if="canSignOut"
        type="button"
        class="secondary-button"
        :disabled="busy"
        @click="logout"
      >
        Sair desta conta
      </button>
    </form>
  </main>
</template>
