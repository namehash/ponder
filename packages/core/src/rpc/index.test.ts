import { beforeEach, expect, test, vi } from "vitest";
import { context, setupAnvil, setupCommon } from "@/_test/setup.js";
import { simulateBlock } from "@/_test/simulate.js";
import { getChain } from "@/_test/utils.js";
import { wait } from "@/utils/wait.js";
import { createRpc, isDeterministicExecutionError } from "./index.js";

beforeEach(setupCommon);
beforeEach(setupAnvil);

test("createRpc()", async () => {
  const chain = getChain();
  const rpc = createRpc({
    common: context.common,
    chain,
  });

  await rpc.request({ method: "eth_blockNumber" });
});

test("createRpc() handles rate limiting", async () => {
  const chain = getChain();
  const rpc = createRpc({
    common: context.common,
    chain,
  });

  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify({ message: "Too Many Requests" }), {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "Content-Type": "application/json" },
    }),
  );

  await rpc.request({ method: "eth_blockNumber" });
});

test("createRpc() retry BlockNotFoundError", async () => {
  const chain = getChain();
  const rpc = createRpc({
    common: context.common,
    chain,
  });

  await simulateBlock();

  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify({ jsonrpc: "2.0", result: null, id: 1 })),
  );

  const block = await rpc.request(
    { method: "eth_getBlockByNumber", params: ["0x1", true] },
    {
      retryNullBlockRequest: true,
    },
  );

  expect(block).not.toBeNull();
});

test("https://github.com/ponder-sh/ponder/pull/2143", async () => {
  const chain = getChain();
  const rpc = createRpc({
    common: context.common,
    chain,
  });

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 20; j++) {
      await rpc.request({ method: "eth_blockNumber" });
    }
    await wait(1000);
  }

  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify({ message: "Too Many Requests" }), {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "Content-Type": "application/json" },
    }),
  );

  await rpc.request({ method: "eth_blockNumber" });
}, 15_000);

test("isDeterministicExecutionError()", () => {
  // standard providers report a plain revert
  expect(isDeterministicExecutionError(new Error("execution reverted"))).toBe(
    true,
  );

  // some providers surface eip-165 probes as a raw EVM fault wrapped in an
  // outer error, so the cause chain has to be walked
  expect(
    isDeterministicExecutionError(
      Object.assign(new Error("An internal error was received."), {
        cause: new Error("EVM error InvalidFEOpcode"),
      }),
    ),
  ).toBe(true);

  expect(isDeterministicExecutionError(new Error("invalid opcode"))).toBe(true);

  // the classifier also reads viem's `details` field
  expect(
    isDeterministicExecutionError(
      Object.assign(new Error("RPC Error"), { details: "execution reverted" }),
    ),
  ).toBe(true);

  // transient infrastructure failures must stay retryable
  expect(isDeterministicExecutionError(new Error("timeout"))).toBe(false);
  expect(isDeterministicExecutionError(new Error("Too Many Requests"))).toBe(
    false,
  );
  expect(isDeterministicExecutionError(undefined)).toBe(false);
});
