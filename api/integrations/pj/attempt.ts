import type {
  VercelRequest,
  VercelResponse,
} from "../../../server/integrations/types.js";
import { requireServiceAttempt } from "../../../server/integrations/pj.js";
import { sendError } from "../../../server/integrations/pj.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await requireServiceAttempt(req, res);
  } catch (error) {
    return sendError(res, error);
  }
}
