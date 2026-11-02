import { InvalidToolInputError, TypeValidationError } from "ai";
import { z } from "zod";

export function coverageErrorMessage(error: unknown) {
  if (
    error instanceof z.ZodError ||
    InvalidToolInputError.isInstance(error) ||
    TypeValidationError.isInstance(error)
  )
    return "Invalid coverage. Check the Chyron model settings.";
  return error instanceof Error ? error.message : "Chyron failed.";
}
