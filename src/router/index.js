import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../pages/HomePage.vue";
import { getAccess } from "../services/auth";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomePage },
    { path: "/login", component: () => import("../pages/LoginPage.vue") },
    {
      path: "/admin",
      component: () => import("../pages/AdminPage.vue"),
      meta: { admin: true },
    },
    {
      path: "/admin/apps",
      component: () => import("../pages/IntegrationsPage.vue"),
      meta: { admin: true },
    },
    {
      path: "/admin/apps/pj/callback",
      component: () => import("../pages/IntegrationCallbackPage.vue"),
      meta: { admin: true },
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior(to) {
    return to.hash ? { el: to.hash, behavior: "smooth" } : { top: 0 };
  },
});
router.beforeEach(async (to) => {
  if (!to.meta.admin) return true;
  try {
    const access = await getAccess();
    return access.admin
      ? true
      : {
          path: "/login",
          query: { reason: access.user ? "forbidden" : "signin" },
        };
  } catch {
    return { path: "/login", query: { reason: "unavailable" } };
  }
});
