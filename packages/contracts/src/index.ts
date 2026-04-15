// Shared API contracts for Ledra.
// - Web (Next.js route handlers) validates input/output against these schemas.
// - Mobile (Expo) imports the inferred TypeScript types for type-safe fetches.
// - Future public SDK: derive OpenAPI from these schemas (e.g. via zod-to-openapi).
//
// Stability: schemas here are considered a semver-style contract.
// When a field is renamed or removed, coordinate releases across web and mobile.

export * from "./schemas/envelope";
export * from "./schemas/reservation";
