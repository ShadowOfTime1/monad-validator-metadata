import { test } from "node:test";
import assert from "node:assert/strict";
import { crossCheckInfra, parseDeclaredInfra, ObservedRegistry, type ObservedInfra, type ObservedSource } from "./observed.js";
import { EMPTY_METADATA, type ResolvedValidator } from "./types.js";

function resolved(validatorId: number, infrastructure: Record<string, unknown> | null): ResolvedValidator {
  const additionalInfo = infrastructure ? JSON.stringify({ infrastructure }) : "";
  return {
    validatorId,
    authority: null,
    metadata: { ...EMPTY_METADATA, additionalInfo },
    hasMetadata: true,
    warnings: [],
  };
}

function obs(validatorId: number, source: string, fields: Partial<ObservedInfra>): ObservedInfra {
  return {
    validatorId,
    provider: null,
    asn: null,
    region: null,
    active: true,
    lastObservedEpoch: 801,
    staleEpochs: 0,
    confidence: 0.9,
    source,
    observedAt: "2026-06-23T09:30:00.000Z",
    ...fields,
  };
}

test("parseDeclaredInfra reads the reserved infrastructure object, tolerating AS-prefixed asn", () => {
  assert.deepEqual(parseDeclaredInfra(JSON.stringify({ infrastructure: { provider: "OVH", asn: "AS16276", region: "FR" } })), {
    provider: "OVH",
    asn: 16276,
    region: "FR",
  });
  assert.deepEqual(parseDeclaredInfra(""), { provider: null, asn: null, region: null });
  assert.deepEqual(parseDeclaredInfra("{not json"), { provider: null, asn: null, region: null });
});

test("declared matches observation -> verified (asn is the deterministic anchor)", () => {
  const cc = crossCheckInfra(resolved(2, { asn: 46475, provider: "Limestone Networks", region: "DE" }), [
    obs(2, "proofline", { asn: 46475, provider: "Limestone Networks, Inc.", region: "DE" }),
  ]);
  assert.equal(cc.asn.status, "verified");
  assert.equal(cc.asn.observed, 46475);
  // provider normalization folds the ", Inc." suffix
  assert.equal(cc.provider.status, "verified");
  assert.equal(cc.region.status, "verified");
});

test("declared disagrees with observation -> disputed", () => {
  const cc = crossCheckInfra(resolved(5, { asn: 16276, provider: "OVH" }), [
    obs(5, "proofline", { asn: 24940, provider: "Hetzner Online GmbH" }),
  ]);
  assert.equal(cc.asn.status, "disputed");
  assert.equal(cc.asn.declared, 16276);
  assert.equal(cc.asn.observed, 24940);
  assert.equal(cc.provider.status, "disputed");
});

test("no observation covering a declared field -> unverified", () => {
  const cc = crossCheckInfra(resolved(7, { asn: 16276, provider: "OVH", region: "FR" }), []);
  assert.equal(cc.asn.status, "unverified");
  assert.equal(cc.provider.status, "unverified");
  assert.equal(cc.region.status, "unverified");
});

test("nothing declared -> unverified, but the observed value is still surfaced", () => {
  const cc = crossCheckInfra(resolved(9, null), [obs(9, "proofline", { asn: 20326, provider: "TeraSwitch" })]);
  assert.equal(cc.asn.status, "unverified");
  assert.equal(cc.asn.declared, null);
  assert.equal(cc.asn.observed, 20326);
});

test("provider normalization: 'ovh' matches 'OVH SAS'", () => {
  const cc = crossCheckInfra(resolved(11, { provider: "ovh" }), [obs(11, "proofline", { provider: "OVH SAS" })]);
  assert.equal(cc.provider.status, "verified");
});

test("two agreeing sources -> agreement 1, mean confidence", () => {
  const cc = crossCheckInfra(resolved(13, { asn: 24940 }), [
    obs(13, "proofline", { asn: 24940, confidence: 0.9 }),
    obs(13, "monadpulse", { asn: 24940, confidence: 0.7 }),
  ]);
  assert.equal(cc.asn.status, "verified");
  assert.equal(cc.asn.agreement, 1);
  assert.deepEqual(cc.asn.sources.sort(), ["monadpulse", "proofline"]);
  assert.equal(cc.asn.confidence, 0.8);
});

test("disagreeing sources: modal value wins, agreement < 1", () => {
  const cc = crossCheckInfra(resolved(15, { asn: 24940 }), [
    obs(15, "proofline", { asn: 24940 }),
    obs(15, "monadpulse", { asn: 24940 }),
    obs(15, "thirdparty", { asn: 16276 }),
  ]);
  assert.equal(cc.asn.status, "verified");
  assert.equal(cc.asn.observed, 24940);
  assert.equal(Math.round(cc.asn.agreement * 100) / 100, 0.67);
});

test("ObservedRegistry merges two sources so they cross-confirm", async () => {
  const source = (id: string, asn: number): ObservedSource => ({
    id,
    coverage: "active-set",
    async get(v) {
      return v === 42 ? obs(42, id, { asn }) : null;
    },
    async getAll() {
      return [obs(42, id, { asn })];
    },
  });
  const registry = new ObservedRegistry([source("proofline", 24940), source("monadpulse", 24940)]);
  const observations = await registry.observe(42);
  assert.equal(observations.length, 2);
  const cc = crossCheckInfra(resolved(42, { asn: 24940 }), observations);
  assert.equal(cc.asn.status, "verified");
  assert.equal(cc.asn.agreement, 1);
  assert.deepEqual(cc.asn.sources.sort(), ["monadpulse", "proofline"]);
});
