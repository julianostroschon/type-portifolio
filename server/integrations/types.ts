import type { IncomingMessage, ServerResponse } from "node:http";

export type VercelRequest = IncomingMessage & {
  body?: unknown;
  query: Record<string, string | string[] | undefined>;
};

export type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
};
