import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Stellar Mini Wallet shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Stellar Mini Wallet<\/title>/i);
  assert.match(html, /Ví Stellar/);
  assert.match(html, /Demo/);
  assert.match(html, /Stellar Testnet/);
  assert.match(html, /Freighter/);
  assert.match(html, /require_auth\(\)/);
  assert.match(html, /secret key/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps contract calls and safety copy explicit", async () => {
  const [wallet, contract] = await Promise.all([
    readFile(new URL("../app/wallet-app.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../contracts/mini_wallet/src/lib.rs", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(wallet, /new Client\(/);
  assert.match(wallet, /signAndSend\(\)/);
  assert.match(wallet, /NEXT_PUBLIC_MINI_WALLET_CONTRACT_ID/);
  assert.match(wallet, /blockchain/i);
  assert.match(contract, /user\.require_auth\(\)/);
  assert.match(contract, /from\.require_auth\(\)/);
  assert.match(contract, /pub fn deposit/);
  assert.match(contract, /pub fn withdraw/);
  assert.match(contract, /pub fn transfer/);
});
