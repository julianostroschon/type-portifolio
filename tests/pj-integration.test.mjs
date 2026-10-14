import assert from "node:assert/strict";
import test from "node:test";
import {
  randomState,
  requirePjService,
  sha256,
  signPjAssertion,
} from "../server/integrations/pj.js";

const secret = "f1b3a580a677fbd923da7d20c6e00fdf";

test("link state is unpredictable-looking and URL safe", () => {
  const first = randomState();
  const second = randomState();
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
});

test("state is stored as a one-way SHA-256 hash", () => {
  assert.equal(
    sha256("state-value"),
    "a6b030ed072d78a2caca42e89ea32156d2568ec2988a048d9b684ce1e71ecd3b",
  );
});

test("service validation requires the configured secret", () => {
  process.env.PJ_INTEGRATION_SECRET = secret;
  assert.doesNotThrow(() =>
    requirePjService({ headers: { authorization: `Bearer ${secret}` } }),
  );
  assert.throws(
    () => requirePjService({ headers: { authorization: "Bearer wrong" } }),
    /Credencial de serviço inválida/,
  );
  delete process.env.PJ_INTEGRATION_SECRET;
});

test("signed PJ assertions contain a verifiable JWT shape", () => {
  process.env.PJ_INTEGRATION_SECRET = secret;
  process.env.PJ_BASE_URL = "https://pj.example.com";
  process.env.PORTFOLIO_BASE_URL = "https://portfolio.example.com";
  const token = signPjAssertion({
    iss: "portfolio",
    aud: "controle-pj",
    exp: 123,
  });
  assert.equal(token.split(".").length, 3);
  const [header, claims, signature] = token.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url").toString()), {
    alg: "HS256",
    typ: "JWT",
  });
  assert.equal(
    JSON.parse(Buffer.from(claims, "base64url").toString()).aud,
    "controle-pj",
  );
  assert.match(signature, /^[A-Za-z0-9_-]+$/);
  delete process.env.PJ_INTEGRATION_SECRET;
  delete process.env.PJ_BASE_URL;
  delete process.env.PORTFOLIO_BASE_URL;
});
