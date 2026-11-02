import test from "node:test";
import assert from "node:assert/strict";
import { InvalidToolInputError, TypeValidationError } from "ai";
import { z } from "zod";
import { coverageErrorMessage } from "../server/coverageError.ts";

test("model validation errors produce actionable messages rather than raw schema output", () => {
  const result = z.object({ quoteId: z.null() }).safeParse({ quoteId: "speech" });
  assert.equal(result.success, false);
  const errors = [
    result.error,
    new InvalidToolInputError({ toolName: "submitCoverage", toolInput: '{}', cause: result.error }),
    new TypeValidationError({ value: {}, cause: result.error }),
  ];
  for (const error of errors)
    assert.equal(coverageErrorMessage(error), "Invalid coverage. Check the Chyron model settings.");
  assert.equal(coverageErrorMessage(new Error("AWS access expired.")), "AWS access expired.");
});
