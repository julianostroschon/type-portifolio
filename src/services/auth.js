import { requireSupabase, supabase } from "./supabase";

export async function getAccess() {
  if (!supabase) return { user: null, admin: false };
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (
      error.name === "AuthSessionMissingError" ||
      error.status === 401 ||
      error.status === 403
    )
      return { user: null, admin: false };
    throw new Error("Não foi possível validar sua sessão. Tente novamente.");
  }
  if (!data.user) return { user: null, admin: false };
  const { data: admin, error: roleError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (roleError)
    throw new Error(
      "Não foi possível verificar suas permissões. Tente novamente.",
    );
  return { user: data.user, admin: Boolean(admin) };
}

export async function signIn(email, password) {
  const { error } = await requireSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error)
    throw new Error("Não foi possível entrar. Confira seu e-mail e sua senha.");
}
export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw new Error("Não foi possível sair. Tente novamente.");
}

export async function getSessionAccessToken() {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error)
    throw new Error("Não foi possível validar sua sessão. Entre novamente.");
  if (!data.session?.access_token)
    throw new Error("Sua sessão expirou. Entre novamente.");
  return data.session.access_token;
}
