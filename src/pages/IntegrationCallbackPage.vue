<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AdminHeader from "../components/AdminHeader.vue";
import { completePjLink } from "../services/integrations";

const router = useRouter();
const error = ref("");
const working = ref(true);

onMounted(async () => {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const code = fragment.get("code") || "";
  const state = fragment.get("state") || "";
  window.history.replaceState({}, document.title, window.location.pathname);
  const expectedState = sessionStorage.getItem("portfolio-pj-link-state");
  if (!code || !state || !expectedState || state !== expectedState) {
    error.value =
      "Este retorno não pertence à solicitação iniciada neste navegador.";
    working.value = false;
    return;
  }
  try {
    await completePjLink(code, state);
    sessionStorage.removeItem("portfolio-pj-link-state");
    await router.replace("/admin/apps?linked=1");
  } catch (cause) {
    error.value = cause.message;
  } finally {
    working.value = false;
  }
});
</script>

<template>
  <AdminHeader />
  <main class="wrap admin-page">
    <p class="eyebrow">PORTFÓLIO / INTEGRAÇÕES</p>
    <h1>
      {{ error ? "Vínculo não concluído" : "Conectando sua conta"
      }}<span>.</span>
    </h1>
    <p class="admin-description" role="status">
      {{
        error ||
        (working
          ? "Validando o consentimento e registrando o vínculo…"
          : "Você pode voltar para os aplicativos.")
      }}
    </p>
    <RouterLink v-if="error" class="button" to="/admin/apps"
      >Voltar aos aplicativos</RouterLink
    >
  </main>
</template>
