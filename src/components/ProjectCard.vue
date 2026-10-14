<script setup lang="ts">
defineProps<{
  project: {
    name: string
    label: string
    category: string
    description: string
    url: string
    repository: string
    theme: string
    symbol: string
    tags: string[]
  }
}>()
</script>

<template>
  <article class="project-card" :class="project.theme">
    <a
      class="project-preview"
      :href="project.url"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="`Abrir ${project.name} em produção (nova aba)`"
    >
      <span class="preview-label">{{ project.label }}</span>
      <div class="preview-composition" aria-hidden="true">
        <span class="project-symbol">{{ project.symbol }}</span
        ><span class="preview-name">{{ project.name }}<i>.</i></span>
        <div class="preview-lines">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
      <span class="preview-foot"
        >{{ project.category }} <span aria-hidden="true">↗</span></span
      >
    </a>
    <div class="project-info">
      <h3>{{ project.name }}</h3>
      <p>{{ project.description }}</p>
      <ul class="project-tags" aria-label="Tecnologias">
        <li v-for="tag in project.tags" :key="tag">{{ tag }}</li>
      </ul>
      <div class="project-links">
        <a :href="project.url" target="_blank" rel="noopener noreferrer"
          >Explorar aplicação <span aria-hidden="true">↗</span
          ><span class="sr-only"> (abre em nova aba)</span></a
        ><a
          :href="project.repository"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`Código do ${project.name} no GitHub (nova aba)`"
          >Código <span aria-hidden="true">↗</span></a
        >
      </div>
    </div>
  </article>
</template>
