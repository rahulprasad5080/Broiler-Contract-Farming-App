import assert from "node:assert/strict";
import test from "node:test";

import { createDraftPersistenceController } from "../hooks/formPersistenceController";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

test("clear cancels pending draft save and suppresses reset save", async () => {
  const controller = createDraftPersistenceController();
  const writes: Array<string> = [];
  let clearCount = 0;

  controller.scheduleSave(() => writes.push("dirty"), 20);
  await controller.clear(() => {
    clearCount += 1;
  });
  controller.scheduleSave(() => writes.push("reset"), 20);

  await wait(40);

  assert.equal(clearCount, 1);
  assert.deepEqual([...writes], []);

  controller.scheduleSave(() => writes.push("next-edit"), 10);
  await wait(20);

  assert.deepEqual([...writes], ["next-edit"]);
});

test("clear suppresses an immediate background save after reset", async () => {
  const controller = createDraftPersistenceController();
  const writes: Array<string> = [];

  await controller.clear(() => undefined);
  controller.saveImmediately(() => writes.push("reset"));

  assert.deepEqual([...writes], []);

  controller.saveImmediately(() => writes.push("current"));

  assert.deepEqual([...writes], ["current"]);
});
