import type {
  VercelRequest,
  VercelResponse,
} from "../../../server/integrations/types.js";
import {
  ApiError,
  getPortfolioAdminClient,
  isUniqueViolation,
  parseBody,
  randomState,
  requireMethod,
  requirePlatformAdmin,
  requirePjConfiguration,
  sendError,
  sha256,
  signPjAssertion,
} from "../../../server/integrations/pj.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") return await getLink(req, res);
    if (req.method === "POST") return await startLink(req, res);
    if (req.method === "DELETE") return await revokeLink(req, res);
    throw new ApiError(405, "Método não permitido.");
  } catch (error) {
    return sendError(res, error);
  }
}

async function getLink(req: VercelRequest, res: VercelResponse) {
  const { client, user } = await requirePlatformAdmin(req);
  const { data, error } = await client
    .from("portfolio_account_links")
    .select("id, display_email, status, linked_at, revoked_at, revocation_synced_at")
    .eq("central_user_id", user.id)
    .eq("app_key", "pj")
    .maybeSingle();
  if (error)
    throw new ApiError(503, "Não foi possível consultar o vínculo com o PJ.");
  return res
    .status(200)
    .json({ linked: data?.status === "ACTIVE", link: data || null });
}

async function startLink(req: VercelRequest, res: VercelResponse) {
  requireMethod(req, "POST");
  const { client, user } = await requirePlatformAdmin(req);
  const { pjUrl } = requirePjConfiguration();
  const active = await client
    .from("portfolio_account_links")
    .select("id, status, revocation_synced_at")
    .eq("central_user_id", user.id)
    .eq("app_key", "pj")
    .maybeSingle();
  if (active.error)
    throw new ApiError(503, "Não foi possível verificar vínculos existentes.");
  if (active.data?.status === "ACTIVE")
    throw new ApiError(409, "Esta conta já está vinculada ao PJ.");
  if (active.data && !active.data.revocation_synced_at)
    throw new ApiError(409, "Sincronize a revogação anterior antes de criar um novo vínculo.");

  const state = randomState();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { error } = await client.from("portfolio_link_attempts").insert({
    central_user_id: user.id,
    state_hash: sha256(state),
    status: "PENDING",
    expires_at: expiresAt,
  });
  if (error) throw new ApiError(503, "Não foi possível iniciar o vínculo.");

  const authorizeUrl = new URL("/integrations/portfolio/authorize", pjUrl);
  authorizeUrl.searchParams.set("state", state);
  return res.status(201).json({ state, authorizeUrl: authorizeUrl.toString() });
}

async function revokeLink(req: VercelRequest, res: VercelResponse) {
  requireMethod(req, "DELETE");
  const { client, user } = await requirePlatformAdmin(req);
  const { data: link, error: readError } = await client
    .from("portfolio_account_links")
    .select("id, app_user_id, external_link_id, status, revocation_synced_at")
    .eq("central_user_id", user.id)
    .eq("app_key", "pj")
    .maybeSingle();
  if (readError)
    throw new ApiError(503, "Não foi possível consultar o vínculo.");
  if (!link) throw new ApiError(404, "Não há vínculo com o PJ.");

  if (link.status === "ACTIVE") {
    const { error } = await client
      .from("portfolio_account_links")
      .update({
        status: "REVOKED",
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", link.id);
    if (error)
      throw new ApiError(503, "Não foi possível revogar o vínculo central.");
  } else if (link.revocation_synced_at) {
    return res.status(200).json({ revoked: true, synchronized: true });
  }

  try {
    const { pjUrl } = requirePjConfiguration();
    const assertion = signPjAssertion({
      iss: "portfolio",
      aud: "controle-pj",
      scope: "pj:link:revoke",
      central_sub: user.id,
      sub: link.app_user_id,
      link_id: link.external_link_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 45,
    });
    const response = await fetch(`${pjUrl}/api/integrations/portfolio/revoke`, {
      method: "POST",
      headers: { authorization: `Bearer ${assertion}` },
      cache: "no-store",
    });
    if (response.ok) {
      const synchronization = await client
        .from("portfolio_account_links")
        .update({ revocation_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", link.id);
      return res.status(200).json({ revoked: true, synchronized: !synchronization.error });
    }
    return res.status(200).json({ revoked: true, synchronized: response.ok });
  } catch {
    return res.status(200).json({ revoked: true, synchronized: false });
  }
}

export async function completeAttempt(req: VercelRequest, res: VercelResponse) {
  const body = parseBody(req);
  const code = typeof body.code === "string" ? body.code : "";
  const state = typeof body.state === "string" ? body.state : "";
  if (
    !/^[A-Za-z0-9_-]{40,60}$/.test(code) ||
    !/^[A-Za-z0-9_-]{40,60}$/.test(state)
  ) {
    throw new ApiError(400, "Código ou estado inválido.");
  }

  const { client, user } = await requirePlatformAdmin(req);
  const { data: attempt, error } = await client
    .from("portfolio_link_attempts")
    .select("id, status, expires_at, app_user_id")
    .eq("central_user_id", user.id)
    .eq("state_hash", sha256(state))
    .maybeSingle();
  if (error)
    throw new ApiError(503, "Não foi possível validar o retorno do PJ.");
  if (!attempt)
    throw new ApiError(403, "Este retorno não pertence à sua sessão.");

  if (attempt.status === "COMPLETED") {
    const { data: previous } = await client
      .from("portfolio_account_links")
      .select("id, display_email, status")
      .eq("central_user_id", user.id)
      .eq("app_key", "pj")
      .eq("attempt_id", attempt.id)
      .maybeSingle();
    if (previous)
      return res
        .status(200)
        .json({ linked: previous.status === "ACTIVE", link: previous });
  }
  if (
    attempt.status !== "PENDING" ||
    new Date(attempt.expires_at).getTime() <= Date.now()
  ) {
    throw new ApiError(
      409,
      "A solicitação de vínculo expirou ou já foi utilizada.",
    );
  }

  const { pjUrl } = requirePjConfiguration();
  const assertion = signPjAssertion({
    iss: "portfolio",
    aud: "controle-pj",
    scope: "pj:link:exchange",
    central_sub: user.id,
    code,
    state,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 45,
  });
  const response = await fetch(`${pjUrl}/api/integrations/portfolio/exchange`, {
    method: "POST",
    headers: { authorization: `Bearer ${assertion}` },
    cache: "no-store",
  });
  const exchanged = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      response.status,
      exchanged.error || "O PJ recusou o código de vínculo.",
    );
  if (!exchanged.linkId || !exchanged.externalUserId || !exchanged.email) {
    throw new ApiError(
      502,
      "O PJ retornou uma resposta de vínculo incompleta.",
    );
  }

  const values = {
    central_user_id: user.id,
    app_key: "pj",
    app_user_id: exchanged.externalUserId,
    external_link_id: exchanged.linkId,
    attempt_id: attempt.id,
    display_email: exchanged.email,
    status: "ACTIVE",
    linked_at: new Date().toISOString(),
    revoked_at: null,
    revocation_synced_at: null,
    updated_at: new Date().toISOString(),
  };
  const saved = await client
    .from("portfolio_account_links")
    .upsert(values, { onConflict: "central_user_id,app_key" })
    .select("id, display_email, status, linked_at")
    .single();
  if (saved.error) {
    if (isUniqueViolation(saved.error))
      throw new ApiError(
        409,
        "Esta conta PJ já está vinculada a outra conta central.",
      );
    throw new ApiError(503, "Não foi possível registrar o vínculo central.");
  }

  const completed = await client
    .from("portfolio_link_attempts")
    .update({
      status: "COMPLETED",
      app_user_id: exchanged.externalUserId,
      completed_at: new Date().toISOString(),
    })
    .eq("id", attempt.id);
  if (completed.error)
    throw new ApiError(
      503,
      "O vínculo foi criado, mas não foi possível concluir a solicitação.",
    );
  return res.status(200).json({ linked: true, link: saved.data });
}

export async function requireServiceAttempt(req, res) {
  requirePjService(req);
  requireMethod(req, "POST");
  const body = parseBody(req);
  const state = typeof body.state === "string" ? body.state : "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(state))
    throw new ApiError(400, "Estado inválido.");

  const client = getPortfolioAdminClient();
  const { data: attempt, error } = await client
    .from("portfolio_link_attempts")
    .select("central_user_id, expires_at, status")
    .eq("state_hash", sha256(state))
    .eq("status", "PENDING")
    .maybeSingle();
  if (error)
    throw new ApiError(503, "Não foi possível validar a tentativa de vínculo.");
  if (!attempt || new Date(attempt.expires_at).getTime() <= Date.now()) {
    throw new ApiError(404, "Tentativa não encontrada ou expirada.");
  }

  const { data, error: userError } = await client.auth.admin.getUserById(
    attempt.central_user_id,
  );
  if (userError || !data.user?.email)
    throw new ApiError(404, "Conta central não encontrada.");
  const { portfolioUrl } = requirePjConfiguration();
  const callbackUrl = new URL(
    "/admin/apps/pj/callback",
    portfolioUrl,
  ).toString();
  return res.status(200).json({
    centralUserId: attempt.central_user_id,
    centralEmail: data.user.email,
    callbackUrl,
  });
}
