<script setup>
import { onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { getAccess, signOut } from "../services/auth";
import ThemeToggle from "./ThemeToggle.vue";

const router = useRouter();
const user = ref(null);
const menu = ref(null);
const busy = ref(false);
const error = ref("");

onMounted(async () => {
  try {
    const access = await getAccess();
    if (access.admin) user.value = access.user;
  } catch {
    // Keep the header usable if session validation is temporarily unavailable.
  }
});

async function logout() {
  busy.value = true;
  error.value = "";
  try {
    await signOut();
    user.value = null;
    menu.value?.removeAttribute("open");
    await router.replace("/login");
  } catch {
    error.value = "Não foi possível sair. Tente novamente.";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <header class="site-header wrap">
    <RouterLink class="wordmark" to="/" aria-label="Voltar ao portfólio"
      >js<span>.</span></RouterLink
    >
    <nav aria-label="Navegação administrativa">
      <RouterLink to="/">Portfólio</RouterLink>
      <RouterLink v-if="user" to="/admin/apps">Aplicativos</RouterLink>
      <details v-if="user" ref="menu" class="account-menu">
        <summary
          class="account-avatar"
          :aria-label="`Abrir menu de ${user.email}`"
        >
          {{ user.email?.slice(0, 1).toUpperCase() || "A" }}
        </summary>
        <div class="account-dropdown">
          <p class="account-email">{{ user.email }}</p>
          <p v-if="error" class="account-error" role="alert">{{ error }}</p>
          <div class="account-setting">
            <span>Tema</span>
            <ThemeToggle />
          </div>
          <button
            class="account-logout"
            type="button"
            :disabled="busy"
            @click="logout"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 17l5-5-5-5m5 5H3" />
              <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </svg>
            {{ busy ? "Saindo…" : "Sair" }}
          </button>
        </div>
      </details>
      <ThemeToggle v-else />
    </nav>
  </header>
</template>
