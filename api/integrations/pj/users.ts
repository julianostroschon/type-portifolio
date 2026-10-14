import type {
  VercelRequest,
  VercelResponse,
} from "../../../server/integrations/types.js";
import {
  ApiError,
  requireMethod,
  requirePlatformAdmin,
  requirePjConfiguration,
  sendError,
  signPjAssertion,
} from "../../../server/integrations/pj.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    requireMethod(req, "GET");
    const { client, user } = await requirePlatformAdmin(req);
    const parsedLimit = Number(req.query.limit ?? "50");
    const parsedOffset = Number(req.query.offset ?? "0");
    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100 ||
      !Number.isSafeInteger(parsedOffset) ||
      parsedOffset < 0
    ) {
      throw new ApiError(400, "Paginação inválida.");
    }

    const { data: link, error } = await client
      .from("portfolio_account_links")
      .select("app_user_id, external_link_id")
      .eq("central_user_id", user.id)
      .eq("app_key", "pj")
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (error)
      throw new ApiError(503, "Não foi possível consultar o vínculo com o PJ.");
    if (!link)
      throw new ApiError(
        409,
        "Vincule uma conta PJ antes de consultar usuários.",
      );

    const { pjUrl } = requirePjConfiguration();
    const assertion = signPjAssertion({
      iss: "portfolio",
      aud: "controle-pj",
      scope: "pj:users:read",
      central_sub: user.id,
      sub: link.app_user_id,
      link_id: link.external_link_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 45,
    });
    const url = new URL("/api/integrations/portfolio/users", pjUrl);
    url.searchParams.set("limit", String(parsedLimit));
    url.searchParams.set("offset", String(parsedOffset));
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${assertion}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(
        response.status,
        payload.error || "O PJ não conseguiu consultar usuários.",
      );
    }
    return res.status(200).json(payload);
  } catch (error) {
    return sendError(res, error);
  }
}
