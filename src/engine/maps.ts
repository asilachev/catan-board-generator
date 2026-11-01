import type { PrintedMap } from './printed.ts'
import type { VariantId } from './scenarios.ts'

/**
 * The Seafarers scenario maps as the rulebook prints them, transcribed hex by hex (#7). See
 * printed.ts for the row format and docs/rules.md → Printed maps for the sources and what each
 * scenario lets a deal change.
 */
export const PRINTED_MAPS: Partial<Record<VariantId, PrintedMap>> = {}
