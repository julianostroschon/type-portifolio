<script setup lang="ts">
import ProjectCard from '../components/ProjectCard.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { initialProjects } from '../data/projects'
import { loadPublicProjects } from '../services/projects'
import { supabaseConfigured } from '../services/supabase'
const projects = ref(supabaseConfigured ? [] : initialProjects)
const projectsLoading = ref(supabaseConfigured)
const projectsError = ref('')
onMounted(async () => {
  try {
    projects.value = await loadPublicProjects()
  } catch {
    projects.value = []
    projectsError.value =
      'Não foi possível carregar os projetos. Tente recarregar a página.'
  } finally {
    projectsLoading.value = false
  }
})

const year = new Date().getFullYear()
</script>

<template>
  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  <header class="site-header wrap">
    <a class="wordmark" href="#inicio" aria-label="Juliano Stroschon — início"
      >js<span>.</span></a
    >
    <nav aria-label="Navegação principal">
      <a href="#projetos">Projetos</a><a href="#sobre">Sobre</a>
      <a class="nav-contact" href="#contato"
        >Vamos conversar <span aria-hidden="true">↗</span></a
      >
      <RouterLink class="admin-entry" to="/login">Área admin</RouterLink>
      <ThemeToggle />
    </nav>
  </header>
  <main id="conteudo">
    <section id="inicio" class="hero wrap" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">
          <span class="small-square" aria-hidden="true"></span> JULIANO
          STROSCHON / PORTFÓLIO
        </p>
        <h1 id="hero-title">
          Ideias que viram<br />produtos.<br /><span class="muted-title"
            >Código que faz<br />acontecer.</span
          >
        </h1>
        <p class="hero-description">
          Construo aplicações que conectam dados, organização e decisões. Aqui
          estão alguns dos projetos que estou desenvolvendo.
        </p>
        <a class="button" href="#projetos"
          >Explore os projetos <span aria-hidden="true">↘</span></a
        >
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="art-top">
          <span>DO CONCEITO À APLICAÇÃO</span><span>JS / LAB</span>
        </div>
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>
        <div class="art-core">j<span>s</span><i>.</i></div>
        <span class="art-chip chip-top">&lt;ideia /&gt;</span
        ><span class="art-chip chip-bottom">produto.build()</span>
        <div class="art-bottom">
          <span>DESENVOLVER. CONECTAR. EVOLUIR.</span><span>↗</span>
        </div>
      </div>
      <div class="hero-foot">
        <span>PROJETOS INDEPENDENTES, EM EVOLUÇÃO CONTÍNUA</span
        ><a href="#projetos"
          >ROLE PARA EXPLORAR <span aria-hidden="true">↓</span></a
        >
      </div>
    </section>
    <section
      id="projetos"
      class="projects-section wrap"
      aria-labelledby="projects-title"
    >
      <div class="section-heading">
        <div>
          <p class="eyebrow">SELEÇÃO DE PROJETOS</p>
          <h2 id="projects-title">Do código para o mundo<span>.</span></h2>
        </div>
        <p>
          Três aplicações. Diferentes desafios.<br />A mesma vontade de
          construir.
        </p>
      </div>
      <p v-if="projectsError" class="form-message" role="alert">
        {{ projectsError }}
      </p>
      <p v-else-if="projectsLoading" class="section-note" role="status">
        Carregando projetos…
      </p>
      <p v-else-if="!projects.length" class="section-note">
        Novos projetos serão apresentados em breve.
      </p>
      <div class="project-grid">
        <ProjectCard
          v-for="project in projects"
          :key="project.name"
          :project="project"
        />
      </div>
      <p class="section-note">
        <span aria-hidden="true">↗</span> Explore cada aplicação em produção ou
        acompanhe seu código no GitHub.
      </p>
    </section>
    <section id="sobre" class="about-section" aria-labelledby="about-title">
      <div class="wrap about-grid">
        <div>
          <p class="eyebrow">POR TRÁS DOS PROJETOS</p>
          <h2 id="about-title">
            Olá, sou Juliano.<br />Gosto de construir<br /><span
              >o que faz sentido.</span
            >
          </h2>
        </div>
        <div class="about-copy">
          <p>
            Este é meu espaço para apresentar o trabalho e acompanhar a evolução
            das aplicações que desenvolvo.
          </p>
          <p>
            De indicadores a gestão de negócios e finanças pessoais, cada
            projeto parte de um problema concreto e ganha forma em uma aplicação
            que pode ser explorada.
          </p>
          <div class="tech-list" aria-label="Tecnologias dos projetos">
            <span>TypeScript</span><span>Vue</span><span>Next.js</span
            ><span>PostgreSQL</span>
          </div>
          <a
            class="text-link"
            href="https://github.com/julianostroschon"
            target="_blank"
            rel="noopener noreferrer"
            >Acompanhe no GitHub <span aria-hidden="true">↗</span
            ><span class="sr-only"> (abre em nova aba)</span></a
          >
        </div>
      </div>
    </section>
    <section
      id="contato"
      class="contact-section wrap"
      aria-labelledby="contact-title"
    >
      <p class="eyebrow">A PRÓXIMA IDEIA</p>
      <div class="contact-row">
        <h2 id="contact-title">
          Vamos construir<br />algo juntos<span>?</span>
        </h2>
        <div>
          <p>
            Quer conversar sobre um projeto<br />ou conhecer melhor meu
            trabalho?
          </p>
          <a class="button" href="mailto:julianostroschon@gmail.com"
            >Enviar um e-mail <span aria-hidden="true">↗</span></a
          >
          <a class="contact-email" href="mailto:julianostroschon@gmail.com"
            >julianostroschon@gmail.com</a
          >
          <a
            class="text-link contact-linkedin"
            href="https://www.linkedin.com/in/juliano-stroschon-a199211ab/"
            target="_blank"
            rel="noopener noreferrer"
            >Conecte-se no LinkedIn <span aria-hidden="true">↗</span
            ><span class="sr-only"> (abre em nova aba)</span></a
          >
        </div>
      </div>
    </section>
  </main>
  <footer class="site-footer wrap">
    <a class="wordmark" href="#inicio" aria-label="Voltar ao início"
      >js<span>.</span></a
    >
    <p>© {{ year }} Juliano Stroschon</p>
    <a href="#inicio">De volta ao topo <span aria-hidden="true">↑</span></a>
  </footer>
</template>
