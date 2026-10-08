// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

/**
 * Express 5 types `req.params`, `req.query`, and `req.body` values as
 * `ParsedQs` members (`string | string[] | ParsedQs | ParsedQs[] | undefined`)
 * rather than `string`. Route handlers in this service expect a plain `string`
 * for path params and simple query values.
 *
 * `asString` narrows such a value to a `string` at the controller boundary,
 * preserving the behavior of the common single-string case:
 *   - a plain string passes through unchanged;
 *   - an array yields its first element (what Express historically surfaced);
 *   - `undefined`/`null` yield an empty string.
 */
export function asString(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? '');
  }
  return String(value ?? '');
}
