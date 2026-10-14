import { createClient } from "@supabase/supabase-js";
import {
  createHash,
  createHmac,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let adminClient;
function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new ApiError(503, "A integração central ainda não está configurada.");
  adminClient ??= createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

function bearer(req) {
  const value = req.headers.authorization;
  return typeof value === "string" && value.startsWith("Bearer ")
    ? value.slice(7)
    : "";
}

export async function requirePlatformAdmin(req) {
  const accessToken = bearer(req);
  if (!accessToken) throw new ApiError(401, "Sessão ausente ou expirada.");
  const client = getAdminClient();
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user)
    throw new ApiError(401, "Sessão ausente ou expirada.");
  const { data: admin, error: roleError } = await client
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (roleError)
    throw new ApiError(503, "Não foi possível validar a permissão central.");
  if (!admin)
    throw new ApiError(403, "Acesso restrito à administração da plataforma.");
  return { client, user: data.user };
}

export function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new ApiError(400, "Corpo da solicitação inválido.");
    }
  }
  return {};
}

export function sendError(res, error) {
  const status = error instanceof ApiError ? error.status : 500;
  if (status === 500)
    console.error("[portfolio-pj-integration] request failed");
  res.status(status).json({
    error:
      status === 500
        ? "Não foi possível concluir a integração."
        : error.message,
  });
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomState() {
  return randomBytes(32).toString("base64url");
}

export function requirePjConfiguration() {
  const pjUrl = process.env.PJ_BASE_URL;
  const portfolioUrl = process.env.PORTFOLIO_BASE_URL;
  const secret =
    process.env.PJ_INTEGRATION_SECRET ||
    process.env.PORTFOLIO_INTEGRATION_SECRET;
  if (!pjUrl || !portfolioUrl || !secret || secret.length < 32) {
    throw new ApiError(
      503,
      "A integração com o PJ ainda não está configurada.",
    );
  }
  return {
    pjUrl: new URL(pjUrl).origin,
    portfolioUrl: new URL(portfolioUrl).origin,
    secret,
  };
}

export function signPjAssertion(claims) {
  const { secret } = requirePjConfiguration();
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode(claims)}`;
  const signature = createHmac("sha256", secret)
    .update(unsigned)
    .digest("base64url");
  return `${unsigned}.${signature}`;
}

export function requirePjService(req) {
  const expected =
    process.env.PJ_INTEGRATION_SECRET ||
    process.env.PORTFOLIO_INTEGRATION_SECRET;
  const actual = bearer(req);
  if (!expected || expected.length < 32 || !actual) {
    throw new ApiError(401, "Credencial de serviço inválida.");
  }
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new ApiError(401, "Credencial de serviço inválida.");
  }
}

export function requireMethod(req, method) {
  if (req.method !== method) throw new ApiError(405, "Método não permitido.");
}

export function getPortfolioAdminClient() {
  return getAdminClient();
}

export function isUniqueViolation(error) {
  return error?.code === "23505";
}
