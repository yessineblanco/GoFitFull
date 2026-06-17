import assert from "node:assert/strict";
import test from "node:test";

import {
  parseBIExportQuery,
  parseBISnapshotInput,
  serializeCSV,
} from "./bi-api.ts";

test("BI export query parsing validates slices and defaults invalid ranges", () => {
  assert.deepEqual(parseBIExportQuery(new URLSearchParams()), {
    error: "Invalid BI export slice.",
    ok: false,
  });

  assert.deepEqual(
    parseBIExportQuery(
      new URLSearchParams({
        slice: "finance",
        range: "unsupported",
        coach: " coach-1 ",
        pack: " ",
      })
    ),
    {
      ok: true,
      value: {
        slice: "finance",
        range: { days: 30, key: "30d" },
        coachId: "coach-1",
        packId: undefined,
      },
    }
  );
});

test("BI snapshot parsing rejects malformed bodies and normalizes scope", () => {
  assert.deepEqual(parseBISnapshotInput(null), {
    error: "Invalid BI snapshot range.",
    ok: false,
  });
  assert.equal(parseBISnapshotInput({ rangeKey: "365d" }).ok, false);

  assert.deepEqual(
    parseBISnapshotInput({
      rangeKey: "7d",
      coachId: " coach-1 ",
      coachName: " ",
      packId: null,
      packName: "Starter Pack",
    }),
    {
      ok: true,
      value: {
        rangeKey: "7d",
        coachId: "coach-1",
        coachName: null,
        packId: null,
        packName: "Starter Pack",
      },
    }
  );
});

test("CSV serialization emits a BOM, CRLF rows, and escaped values", () => {
  assert.equal(
    serializeCSV(
      ["name", "note", "active", "missing"],
      [
        {
          name: "Coach, One",
          note: 'Said "hello"\nagain',
          active: true,
          missing: null,
        },
      ]
    ),
    '\uFEFFname,note,active,missing\r\n"Coach, One","Said ""hello""\nagain",true,'
  );
});
