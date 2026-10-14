import { getSessionAccessToken } from "./auth";

async function request(path, options = {}) {
  const token = await getSessionAccessToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(result.error || "Não foi possível concluir a solicitação.");
  return result;
}

export function loadPjLink() {
  return request("/api/integrations/pj/link");
}

export function beginPjLink() {
  return request("/api/integrations/pj/link", { method: "POST" });
}

export function completePjLink(code, state) {
  return request("/api/integrations/pj/exchange", {
    method: "POST",
    body: JSON.stringify({ code, state }),
  });
}

export function revokePjLink() {
  return request("/api/integrations/pj/link", { method: "DELETE" });
}
