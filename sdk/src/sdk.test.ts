import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeFunctionData } from "viem";
import { entryToMetadata, buildCall } from "./migrate.js";
import { registryAbi } from "./abi.registry.js";
import { sanitizeMetadata } from "./sanitize.js";
import { EMPTY_METADATA } from "./types.js";

test("entryToMetadata maps validator-info fields and folds x into socials", () => {
  const m = entryToMetadata({
    id: 267,
    name: "shadowoftime",
    website: "https://shadowoftime.dev",
    description: "Independent Monad validator.",
    logo: "https://github.com/ShadowOfTime1.png",
    x: "https://x.com/RomanKarpenk",
  });
  assert.equal(m.name, "shadowoftime");
  assert.equal(m.website, "https://shadowoftime.dev");
  assert.equal(m.socials, '{"x":"https://x.com/RomanKarpenk"}');
  assert.equal(m.additionalInfo, "");
});

test("entryToMetadata leaves socials empty when no x handle", () => {
  const m = entryToMetadata({ id: 1, name: "n" });
  assert.equal(m.socials, "");
});

test("buildCall produces calldata that round-trips through the registry ABI", () => {
  const call = buildCall({ id: 267, name: "shadowoftime", x: "https://x.com/RomanKarpenk" });
  assert.equal(call.validatorId, 267);
  assert.match(call.calldata, /^0x[0-9a-f]+$/);

  const decoded = decodeFunctionData({ abi: registryAbi, data: call.calldata });
  assert.equal(decoded.functionName, "setMetadata");
  const [id, meta] = decoded.args as [bigint, { name: string; socials: string }];
  assert.equal(id, 267n);
  assert.equal(meta.name, "shadowoftime");
  assert.equal(meta.socials, '{"x":"https://x.com/RomanKarpenk"}');
});

test("sanitize strips invisible/bidi characters and flags them", () => {
  const ZWSP = String.fromCharCode(0x200b);
  const zw = `shadow${ZWSP}of${ZWSP}time`; // zero-width spaces inside
  const { value, warnings } = sanitizeMetadata({ ...EMPTY_METADATA, name: zw });
  assert.equal(value.name, "shadowoftime");
  assert.ok(warnings.some((w) => w.includes("invisible")));
});

test("sanitize blocks non-http(s) URL schemes", () => {
  const { value, warnings } = sanitizeMetadata({
    ...EMPTY_METADATA,
    logo: "javascript:alert(1)",
    website: "https://ok.example/",
  });
  assert.equal(value.logo, "");
  assert.equal(value.website, "https://ok.example/");
  assert.ok(warnings.some((w) => w.includes("blocked non-http(s) scheme")));
});

test("sanitize flags invalid JSON in socials", () => {
  const { warnings } = sanitizeMetadata({ ...EMPTY_METADATA, socials: "{not json" });
  assert.ok(warnings.some((w) => w.includes("not valid JSON")));
});

test("sanitize accepts a clean record with no warnings", () => {
  const { warnings } = sanitizeMetadata({
    name: "shadowoftime",
    website: "https://shadowoftime.dev/",
    description: "ok",
    logo: "https://github.com/ShadowOfTime1.png",
    socials: '{"x":"https://x.com/RomanKarpenk"}',
    additionalInfo: '{"provider":"OVH"}',
  });
  assert.deepEqual(warnings, []);
});
