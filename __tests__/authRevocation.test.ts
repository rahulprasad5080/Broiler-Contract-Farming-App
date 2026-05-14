import assert from "node:assert/strict";
import test from "node:test";

import {
  assertUserCanKeepSession,
  isRevokedAuthFailure,
  isRevokedUser,
  isRevokedUserError,
  RevokedUserError,
} from "../services/authRevocation";

test("revoked user policy treats disabled users as revoked", () => {
  assert.equal(isRevokedUser({ status: "DISABLED" }), true);
  assert.equal(isRevokedUser({ status: "ACTIVE" }), false);
  assert.equal(isRevokedUser({ status: "INVITED" }), false);
  assert.equal(isRevokedUser(null), false);
});

test("assertUserCanKeepSession throws for disabled users", () => {
  assert.throws(
    () => assertUserCanKeepSession({ status: "DISABLED" }),
    RevokedUserError,
  );
  assert.equal(isRevokedUserError(new RevokedUserError()), true);
  assert.deepEqual(assertUserCanKeepSession({ status: "ACTIVE" }), {
    status: "ACTIVE",
  });
});

test("revoked auth failure detects disabled account messages", () => {
  assert.equal(
    isRevokedAuthFailure({
      status: 403,
      message: "User account has been disabled",
    }),
    true,
  );
  assert.equal(
    isRevokedAuthFailure({
      status: 403,
      payload: { message: "This account is suspended by admin" },
    }),
    true,
  );
});

test("revoked auth failure does not treat normal permission denials as revocation", () => {
  assert.equal(
    isRevokedAuthFailure({
      status: 403,
      message: "You do not have permission to perform this action.",
    }),
    false,
  );
  assert.equal(
    isRevokedAuthFailure({
      status: 500,
      message: "User account has been disabled",
    }),
    false,
  );
});
