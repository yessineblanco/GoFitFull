import assert from "node:assert/strict";
import test from "node:test";

import {
  advancedBIKPIContract,
  advancedBIViewTargets,
} from "./bi-kpi-contract.ts";

test("KPI and semantic-view identifiers are unique", () => {
  const kpiIds = advancedBIKPIContract.map((kpi) => kpi.id);
  const viewIds = advancedBIViewTargets.map((view) => view.id);

  assert.equal(new Set(kpiIds).size, kpiIds.length);
  assert.equal(new Set(viewIds).size, viewIds.length);
});

test("every KPI has complete contract metadata", () => {
  for (const kpi of advancedBIKPIContract) {
    assert.ok(kpi.label.length > 0, `${kpi.id} is missing a label`);
    assert.ok(kpi.grain.length > 0, `${kpi.id} is missing a grain`);
    assert.ok(kpi.definition.length > 0, `${kpi.id} is missing a definition`);
    assert.ok(kpi.caveat.length > 0, `${kpi.id} is missing a caveat`);
    assert.ok(
      ["supported", "partial", "blocked"].includes(kpi.readiness),
      `${kpi.id} has an invalid readiness`,
    );
  }
});

test("health sync reflects the deployed health_data pipeline", () => {
  const healthSync = advancedBIKPIContract.find(
    (kpi) => kpi.id === "health_sync_activity",
  );

  assert.ok(healthSync);
  assert.equal(healthSync.readiness, "partial");
  assert.deepEqual(healthSync.sourceTables, ["health_data"]);
  assert.match(healthSync.caveat, /BI semantic layer/);
});

test("body progress documents the remaining platform work accurately", () => {
  const bodyProgress = advancedBIKPIContract.find(
    (kpi) => kpi.id === "body_progress_trend",
  );

  assert.ok(bodyProgress);
  assert.match(bodyProgress.caveat, /Android estimation is available/);
  assert.match(bodyProgress.caveat, /iOS MediaPipe bridge/);
});
