// ============================================================
// AIScore Hasher Utility
// Minimal local copy — to be replaced by the scoring workstream's
// src/utils/hasher.ts during the API integration step.
// ============================================================

import { createHash } from 'crypto';

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
