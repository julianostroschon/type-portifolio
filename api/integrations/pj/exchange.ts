import type {
  VercelRequest,
  VercelResponse,
} from "../../../server/integrations/types.js";
import {
  ApiError,
  completeAttempt,
  sendError,
} from "../../../server/integrations/pj.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") throw new ApiError(405, "Método não permitido.");
    return await completeAttempt(req, res);
  } catch (error) {
    return sendError(res, error);
  }
}
