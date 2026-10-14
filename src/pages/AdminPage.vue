<script setup>
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AdminHeader from "../components/AdminHeader.vue";
import { getAccess } from "../services/auth";
import {
  deleteProject,
  loadAdminProjects,
  saveProject,
} from "../services/projects";
const router = useRouter();
const projects = ref([]);
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const success = ref("");
const form = ref(null);
const deleteTarget = ref(null);
const projectDialog = ref(null);
const emptyProject = () => ({
  name: "",
  slug: "",
  label: "",
  category: "",
  description: "",
  url: "",
  repository: "",
  theme: "pulso",
  symbol: "↗",
  tags: "",
  published: false,
});
onMounted(async () => {
  try {
    projects.value = await loadAdminProjects();
  } catch (cause) {
    error.value = cause.message;
  } finally {
    loading.value = false;
  }
});
async function openModal(project) {
  error.value = "";
  success.value = "";
  deleteTarget.value = null;
  form.value = project
    ? { ...project, tags: project.tags.join(", ") }
    : emptyProject();
  await nextTick();
  projectDialog.value?.showModal();
}
async function confirmRemoval(project) {
  error.value = "";
  success.value = "";
  form.value = null;
  deleteTarget.value = project;
  await nextTick();
  projectDialog.value?.showModal();
}
function closeModal() {
  projectDialog.value?.close();
  form.value = null;
  deleteTarget.value = null;
}
async function save() {
  busy.value = true;
  error.value = "";
  success.value = "";
  try {
    const access = await getAccess();
    if (!access.admin) {
      await router.replace("/login?reason=forbidden");
      return;
    }
    await saveProject(form.value);
    closeModal();
    success.value = "Projeto salvo.";
    projects.value = await loadAdminProjects();
  } catch (cause) {
    error.value = cause.message;
  } finally {
    busy.value = false;
  }
}
async function removeProject() {
  if (!deleteTarget.value) return;
  busy.value = true;
  error.value = "";
  success.value = "";
  try {
    const access = await getAccess();
    if (!access.admin) {
      closeModal();
      await router.replace("/login?reason=forbidden");
      return;
    }
    await deleteProject(deleteTarget.value.id);
    closeModal();
    success.value = "Projeto removido. A ação foi registrada na auditoria.";
    projects.value = await loadAdminProjects();
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
    <div class="admin-heading">
      <div>
        <p class="eyebrow">PORTFÓLIO / ADMINISTRAÇÃO</p>
        <h1>Seus projetos<span>.</span></h1>
      </div>
    </div>
    <p class="admin-description">
      Edite os projetos e escolha quais aparecem no portfólio público.
    </p>
    <p v-if="error" class="form-message" role="alert">{{ error }}</p>
    <p v-if="success" class="form-message" role="status">{{ success }}</p>
    <p v-if="loading" role="status">Carregando projetos…</p>
    <template v-else>
      <button
        class="button"
        :disabled="busy || !!form || !!deleteTarget"
        @click="openModal(null)"
      >
        Adicionar projeto <span aria-hidden="true">+</span>
      </button>
      <ul class="admin-projects">
        <li v-for="project in projects" :key="project.id">
          <div>
            <h2>{{ project.name }}</h2>
            <p>
              {{ project.published ? "Publicado" : "Rascunho" }} ·
              {{ project.slug }}
            </p>
          </div>
          <div class="project-actions">
            <button
              class="icon-button"
              type="button"
              :aria-label="`Editar ${project.name}`"
              :title="`Editar ${project.name}`"
              :disabled="busy"
              @click="openModal(project)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
              </svg>
            </button>
            <button
              class="icon-button danger-icon"
              type="button"
              :aria-label="`Remover ${project.name}`"
              :title="`Remover ${project.name}`"
              :disabled="busy"
              @click="confirmRemoval(project)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2m3 0-1 14H6L5 6" />
                <path d="M10 11v5m4-5v5" />
              </svg>
            </button>
          </div>
        </li>
      </ul>
      <p v-if="!projects.length && !error" class="section-note">
        Nenhum projeto cadastrado. Adicione o primeiro.
      </p>
    </template>
    <dialog
      ref="projectDialog"
      class="project-modal"
      @click.self="closeModal"
      @cancel.prevent="closeModal"
    >
      <section v-if="form" aria-labelledby="editor-title">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">PORTFÓLIO / PROJETOS</p>
            <h2 id="editor-title">
              {{ form.id ? "Editar projeto" : "Novo projeto" }}
            </h2>
          </div>
          <button
            class="icon-button"
            type="button"
            aria-label="Fechar janela"
            @click="closeModal"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form class="admin-form editor-grid" @submit.prevent="save">
          <label
            >Nome<input
              v-model="form.name"
              required
              maxlength="120"
              :disabled="busy"
          /></label>
          <label
            >Identificador<input
              v-model="form.slug"
              required
              maxlength="80"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="meu-projeto"
              :disabled="busy"
          /></label>
          <label
            >Rótulo<input
              v-model="form.label"
              required
              maxlength="80"
              placeholder="01 / INDICADORES"
              :disabled="busy"
          /></label>
          <label
            >Categoria<input
              v-model="form.category"
              required
              maxlength="120"
              :disabled="busy"
          /></label>
          <label class="full-width"
            >Descrição<textarea
              v-model="form.description"
              required
              maxlength="1000"
              rows="4"
              :disabled="busy"
            ></textarea>
          </label>
          <label
            >URL da aplicação<input
              v-model="form.url"
              type="url"
              required
              maxlength="2048"
              placeholder="https://"
              :disabled="busy"
          /></label>
          <label
            >URL do repositório<input
              v-model="form.repository"
              type="url"
              required
              maxlength="2048"
              placeholder="https://github.com/"
              :disabled="busy"
          /></label>
          <label
            >Cor<select v-model="form.theme" :disabled="busy">
              <option value="pulso">Verde</option>
              <option value="pj">Azul</option>
              <option value="fortuna">Areia</option>
            </select></label
          >
          <label
            >Símbolo<input
              v-model="form.symbol"
              required
              maxlength="8"
              :disabled="busy"
          /></label>
          <label class="full-width"
            >Tecnologias, separadas por vírgula<input
              v-model="form.tags"
              maxlength="410"
              :disabled="busy"
          /></label>
          <label class="checkbox-label full-width"
            ><input
              v-model="form.published"
              type="checkbox"
              :disabled="busy"
            />Publicar no portfólio</label
          >
          <div class="form-actions full-width">
            <button class="button" :disabled="busy">
              {{ busy ? "Salvando…" : "Salvar projeto" }}</button
            ><button
              type="button"
              class="secondary-button"
              :disabled="busy"
              @click="closeModal"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
      <section
        v-else-if="deleteTarget"
        aria-labelledby="remove-title"
        class="remove-confirmation"
      >
        <div class="modal-heading">
          <div>
            <p class="eyebrow">PORTFÓLIO / PROJETOS</p>
            <h2 id="remove-title">Remover projeto?</h2>
          </div>
          <button
            class="icon-button"
            type="button"
            aria-label="Fechar janela"
            @click="closeModal"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p>
          O projeto <strong>{{ deleteTarget.name }}</strong> será removido do
          portfólio. A ação ficará registrada na auditoria.
        </p>
        <p v-if="error" class="form-message" role="alert">{{ error }}</p>
        <div class="form-actions">
          <button
            class="danger-button"
            type="button"
            :disabled="busy"
            @click="removeProject"
          >
            {{ busy ? "Removendo…" : "Remover projeto" }}</button
          ><button
            class="secondary-button"
            type="button"
            :disabled="busy"
            @click="closeModal"
          >
            Cancelar
          </button>
        </div>
      </section>
    </dialog>
  </main>
</template>
