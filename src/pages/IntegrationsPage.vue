<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import AdminHeader from "../components/AdminHeader.vue";
import {
  beginPjLink,
  loadPjLink,
  revokePjLink,
} from "../services/integrations";

const route = useRoute();
const link = ref(null);
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const notice = ref(route.query.linked ? "Conta do PJ vinculada." : "");

async function refresh() {
  const result = await loadPjLink();
  link.value = result.link;
}

onMounted(async () => {
  try {
    await refresh();
  } catch (cause) {
    error.value = cause.message;
  } finally {
    loading.value = false;
  }
});

async function connect() {
  busy.value = true;
  error.value = "";
  notice.value = "";
  try {
    const result = await beginPjLink();
    sessionStorage.setItem("portfolio-pj-link-state", result.state);
    window.location.assign(result.authorizeUrl);
  } catch (cause) {
    error.value = cause.message;
    busy.value = false;
  }
}

async function disconnect() {
  const retrying = link.value?.status === "REVOKED";
  if (!retrying && !window.confirm("Desvincular a conta do Controle PJ?")) return;
  busy.value = true;
  error.value = "";
  notice.value = "";
  try {
    const result = await revokePjLink();
    await refresh();
    notice.value = result.synchronized
      ? "Vínculo revogado no portfólio e no Controle PJ."
      : "Acesso central revogado. O PJ está indisponível; tente sincronizar a revogação novamente.";
  } catch (cause) {
    error.value = cause.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AdminHeader />
  <main class="wrap admin-page">
    <p class="eyebrow">PORTFÓLIO / INTEGRAÇÕES</p>
    <h1>Aplicativos<span>.</span></h1>
    <p class="admin-description">
      Vincule sua conta existente do Controle PJ à identidade do portfólio.
      A permissão de cada operação continua sendo definida pelo próprio aplicativo.
    </p>
    <p v-if="error" class="form-message" role="alert">{{ error }}</p>
    <p v-if="notice" class="form-message" role="status">{{ notice }}</p>
    <section class="integration-card" aria-labelledby="pj-title">
      <div class="integration-mark" aria-hidden="true">PJ</div>
      <div class="integration-copy">
        <p class="eyebrow">CONTROLE PJ</p>
        <h2 id="pj-title">Conta do aplicativo</h2>
        <p v-if="loading">Verificando vínculo…</p>
        <p v-else-if="link?.status === 'ACTIVE'">
          Vinculada como <strong>{{ link.display_email }}</strong>
        </p>
        <p v-else>Conecte uma conta que já exista no Controle PJ.</p>
      </div>
      <div class="integration-actions">
        <button
          v-if="link?.status !== 'ACTIVE' && !(link?.status === 'REVOKED' && !link?.revocation_synced_at)"
          class="button"
          type="button"
          :disabled="loading || busy"
          @click="connect"
        >
          {{ busy ? "Abrindo…" : "Vincular conta" }}
        </button>
        <button
          v-else
          class="secondary-button"
          type="button"
          :disabled="busy"
          @click="disconnect"
        >
          {{ busy ? "Sincronizando…" : link?.status === "ACTIVE" ? "Desvincular" : "Tentar sincronizar revogação" }}
        </button>
      </div>
    </section>
    <p class="section-note">
      O vínculo não altera a senha nem o papel da conta no PJ. A permissão de
      consultar usuários é revalidada pelo Controle PJ em cada chamada.
    </p>
  </main>
</template>
