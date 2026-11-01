import type { PrintedMap } from './printed.ts'
import type { VariantId } from './scenarios.ts'

/**
 * The Seafarers scenario maps as the rulebook prints them, transcribed hex by hex (#7). See
 * printed.ts for the row format and docs/rules.md → Printed maps for the sources and what each
 * scenario lets a deal change.
 *
 * Rows: `~` sea, `d` desert, `g` gold, `h` hills, `f` forest, `p` pasture, `w` fields,
 * `m` mountains, `?` fog; then the printed number and the shuffle group. Upper case never moves.
 */
export const PRINTED_MAPS: Partial<Record<VariantId, PrintedMap>> = {
  // Scenario 1, 3 players (p. 8). The main island's hexes, numbers and harbors among themselves;
  // the small islands' land (outlined in red) among themselves, the sea staying (R11).
  s1_3: {
    page: 8,
    rows: [
      '      h12b  g5b   ~     ~',
      '   ~     ~     ~     p4b   m9b',
      '~     w4a   p6a   ~     w3b   ~',
      '   p2a   m5a   f10a  ~     g4b',
      'h8a   p10a  p9a   f8a   ~     ~',
      '   w11a  m3a   h11a  ~     m8b',
      '      w6a   f5a   ~     h10b',
    ],
    harbors: [
      [2, 2, 3, 'fields'],
      [4, 2, 0, 'any'],
      [0, 4, 4, 'mountains'],
      [6, 4, 5, 'pasture'],
      [0, 4, 2, 'any'],
      [2, 6, 3, 'hills'],
      [4, 6, 0, 'any'],
      [4, 6, 2, 'forest'],
    ],
    harborDeal: { setup: 'printed', variable: 'group' },
  },
  // Scenario 1, 4 players (p. 9), as for 3 players.
  s1_4: {
    page: 9,
    rows: [
      '      m8b   p11b  ~     g4b   ~',
      '   ~     ~     ~     ~     h5b   m2b',
      '~     p5a   f6a   m4a   ~     f9b   ~',
      '   w12a  h11a  w3a   p9a   ~     g10b',
      'h6a   f10a  da    w11a  f5a   ~     ~',
      '   m3a   p4a   h9a   p8a   ~     h3b',
      '      w8a   f2a   m10a  ~     w6b',
    ],
    harbors: [
      [2, 2, 3, 'any'],
      [6, 2, 4, 'mountains'],
      [7, 3, 5, 'any'],
      [0, 4, 4, 'pasture'],
      [0, 4, 2, 'hills'],
      [2, 6, 3, 'any'],
      [4, 6, 2, 'forest'],
      [8, 4, 1, 'fields'],
      [6, 6, 0, 'any'],
    ],
    harborDeal: { setup: 'printed', variable: 'group' },
  },
  // Scenario 2, 3 players (p. 10). Hexes, numbers and harbors within each island; forest and
  // pasture avoid 2, 3, 11, 12.
  s2_3: {
    page: 10,
    rows: [
      '      ~     ~     w4b   p3b',
      '   m4a   f9a   ~     w9b   h5b',
      'p6a   m10a  ~     f8b   h11b  ~',
      '   ~     ~     ~     ~     ~',
      'w11c  m8c   f3c   ~     h10d  h6d',
      '   f5c   p9c   ~     m2d   w5d',
      '      p12c  ~     ~     ~',
    ],
    harbors: [
      [9, 1, 5, 'any'],
      [0, 2, 4, 'any'],
      [3, 1, 1, 'mountains'],
      [8, 2, 2, 'hills'],
      [0, 4, 5, 'forest'],
      [7, 5, 4, 'any'],
      [0, 4, 2, 'any'],
      [10, 4, 1, 'fields'],
      [3, 5, 1, 'pasture'],
    ],
    harborDeal: { setup: 'printed', variable: 'group' },
    avoid: [{ terrains: ['forest', 'pasture'], numbers: [2, 3, 11, 12] }],
  },
  // Scenario 2, 4 players (p. 11), as for 3 players.
  s2_4: {
    page: 11,
    rows: [
      '      p8a   ~     f9b   f11b',
      '   h10a  ~     m3b   w12b  p5b',
      'w5a   f3a   ~     h5b   m10b  ~',
      '   ~     ~     f6b   ~     ~',
      'h4c   p9c   ~     ~     f9d   p11d',
      '   w6c   m4c   h2c   ~     m8d',
      '      p10c  w11c  ~     w4d',
    ],
    harbors: [
      [1, 1, 3, 'fields'],
      [5, 3, 4, 'any'],
      [9, 1, 1, 'forest'],
      [0, 2, 1, 'any'],
      [10, 4, 4, 'mountains'],
      [3, 5, 5, 'any'],
      [0, 4, 2, 'hills'],
      [10, 4, 1, 'any'],
      [2, 6, 3, 'pasture'],
    ],
    harborDeal: { setup: 'printed', variable: 'group' },
    avoid: [{ terrains: ['forest', 'pasture'], numbers: [2, 3, 11, 12] }],
  },
  // Scenario 3, 3 players (p. 12). Hexes, numbers and harbors within each island; the fog is the
  // table's other hexes, face down.
  s3_3: {
    page: 12,
    rows: [
      '      ?z    ?z    ~     h6a   f11a',
      '   ?z    ?z    ?z    ~     f5a   w3a',
      '~     ~     ~     ?z    ~     p8a   p9a',
      '   f6b   p5b   ~     ?z    ~     m4a',
      '~     h11b  f9b   ~     ?z    ~     ~',
      '   ~     m8b   w10b  ~     ?z    ?z',
      '      ~     p12b  ~     ?z    ?z',
    ],
    harbors: [
      [8, 0, 5, 'any'],
      [10, 0, 0, 'pasture'],
      [12, 2, 5, 'fields'],
      [11, 3, 0, 'any'],
      [1, 3, 2, 'mountains'],
      [2, 4, 2, 'forest'],
      [4, 6, 3, 'any'],
      [5, 5, 1, 'hills'],
    ],
    harborDeal: { setup: 'printed', variable: 'group' },
    fromTable: ['z'],
  },
  // Scenario 3, 4 players (p. 13), as for 3 players.
  s3_4: {
    page: 13,
    rows: [
      '      ?z    ~     h4a   w10a  m3a',
      '   ?z    ?z    ~     p9a   f6a   h12a',
      '~     ~     ?z    ~     ~     p10a  m8a',
      '   m3b   ~     ?z    ?z    ~     w11a',
      'w6b   f4b   ~     ?z    ?z    ~     f5a',
      '   h9b   p8b   ~     ?z    ?z    ~',
      '      p2b   f5b   ~     ?z    ?z',
    ],
    harbors: [
      [10, 0, 4, 'fields'],
      [6, 0, 5, 'pasture'],
      [10, 0, 0, 'any'],
      [12, 2, 5, 'hills'],
      [12, 4, 5, 'any'],
      [1, 3, 3, 'forest'],
      [0, 4, 2, 'mountains'],
      [2, 6, 3, 'any'],
      [2, 6, 1, 'any'],
    ],
    harborDeal: { setup: 'printed', variable: 'group' },
    fromTable: ['z'],
  },
  // Scenario 4, 3 players (p. 14). The main island's land, numbers and harbors, except the three
  // deserts, keeping the coast (R12); the land and numbers of the small islands and of the strip
  // west of the deserts (both outlined in red), together.
  s4_3: {
    page: 14,
    rows: [
      '      g4b   Da    ~     m8b',
      '   f3b   Da    f4a   ~     p12b',
      'w6b   Da    h5a   p6a   ~     ~',
      '   ~     m3a   f10a  ~     g5b',
      'f11a  h6a   w2a   h9a   ~     ~',
      '   m10a  w9a   f8a   ~     w9b',
      '      p8a   p4a   ~     m5b',
    ],
    harbors: [
      [5, 1, 5, 'forest'],
      [2, 4, 4, 'fields'],
      [6, 4, 5, 'any'],
      [6, 4, 1, 'any'],
      [4, 6, 0, 'any'],
      [0, 4, 2, 'pasture'],
      [2, 6, 3, 'mountains'],
      [2, 6, 1, 'hills'],
    ],
    harborDeal: { setup: 'printed', variable: 'group' },
  },
  // Scenario 4, 4 players (p. 15), as for 3 players.
  s4_4: {
    page: 15,
    rows: [
      '      g10b  Da    f5a   ~     m9b',
      '   m11b  Da    h3a   p6a   ~     w4b',
      'w8b   Da    m8a   w10a  f4a   ~     h2b',
      '   ~     f10a  h11a  p9a   ~     ~',
      'h12a  h6a   w5a   f8a   ~     g5b   p3b',
      '   p3a   p11a  m4a   ~     ~     ~',
      '      ~     f9a   ~     m6b   w12b',
    ],
    harbors: [
      [6, 0, 0, 'hills'],
      [8, 2, 5, 'any'],
      [8, 2, 1, 'any'],
      [6, 4, 1, 'any'],
      [4, 6, 0, 'forest'],
      [4, 6, 2, 'any'],
      [1, 5, 1, 'mountains'],
      [1, 5, 3, 'fields'],
      [3, 3, 3, 'pasture'],
    ],
    harborDeal: { setup: 'printed', variable: 'group' },
  },
  // Scenario 5 (p. 16). The main island's hexes and numbers among themselves, the small islands'
  // land among themselves, without numbers (R13); the main island's three easternmost hexes avoid
  // 5, 6, 8, 9. Harbor tokens go face down on their spots (R15).
  s5: {
    page: 16,
    rows: [
      '      gb    mb    ~     db    mb    wb',
      '   ~     ~     ~     ~     ~     ~     ~',
      'w6a   f9a   m11a  h5a   f6a   m4a   ~     pb',
      '   p10a  h8a   p4a   w12a  f5a   p2a   ~',
      'f11a  w9a   m3a   p8a   h10a  w3a   ~     fb',
      '   ~     ~     ~     ~     ~     ~     ~',
      '      db    hb    ~     hb    db    gb',
    ],
    harbors: [
      [2, 0, 4, 'forest'],
      [8, 0, 4, 'pasture'],
      [14, 2, 5, 'fields'],
      [14, 4, 1, 'hills'],
      [2, 6, 2, 'mountains'],
      [8, 6, 1, 'any'],
    ],
    harborDeal: { setup: 'all', variable: 'all' },
    avoid: [
      {
        at: [
          [10, 2],
          [11, 3],
          [10, 4],
        ],
        numbers: [5, 6, 8, 9],
      },
    ],
  },
  // Scenario 6 (p. 18). The main islands' hexes and numbers, both islands together (R14); the small
  // islands and their villages stay. Harbors at random (R15).
  s6: {
    page: 18,
    rows: [
      '      f4a   p6a   h5a   p11a  w8a',
      '   w3a   f12a  ~     ~     f3a   m9a',
      'w12a  ~     ~     g     ~     ~     ~',
      '   ~     d     ~     ~     d     ~',
      '~     ~     ~     g     ~     ~     m2a',
      '   h9a   w2a   ~     ~     p11a  m4a',
      '      p10a  f6a   m5a   w10a  h8a',
    ],
    harbors: [
      [2, 0, 5, 'forest'],
      [8, 0, 4, 'pasture'],
      [1, 1, 3, 'fields'],
      [11, 1, 0, 'hills'],
      [12, 4, 0, 'mountains'],
      [1, 5, 3, 'any'],
      [11, 5, 1, 'any'],
      [4, 6, 2, 'any'],
      [8, 6, 1, 'any'],
    ],
    harborDeal: { setup: 'all', variable: 'all' },
    villages: [
      [6, 2, 11],
      [6, 2, 8],
      [3, 3, 10],
      [3, 3, 9],
      [9, 3, 4],
      [9, 3, 5],
      [6, 4, 6],
      [6, 4, 3],
    ],
  },
  // Scenario 7 (p. 20). Nothing moves but the harbors, laid at random (R15): the scenario is
  // balanced only as printed.
  s7: {
    page: 20,
    rows: [
      '      g11   m6    ~     ~     w4    h5',
      '   h     ~     ~     d     ~     m9    f10',
      'w4    ~     ~     d     ~     f3    p8    f5',
      '   ~     m8    ~     ~     w6    h9    p12',
      'w10   ~     ~     d     ~     p11   f8    p9',
      '   h     ~     ~     p     ~     m5    f2',
      '      g3    m6    ~     ~     w10   h4',
    ],
    harbors: [
      [10, 0, 4, 'forest'],
      [12, 0, 4, 'pasture'],
      [12, 0, 0, 'fields'],
      [13, 1, 0, 'hills'],
      [13, 3, 0, 'mountains'],
      [14, 4, 1, 'any'],
      [13, 5, 1, 'any'],
      [10, 6, 1, 'any'],
    ],
    harborDeal: { setup: 'all', variable: 'all' },
  },
  // Scenario 8 (p. 23). The main island's hexes and numbers within its outline; its deserts and the
  // small islands stay. Harbors at random (R15).
  s8: {
    page: 23,
    rows: [
      '      g8    h2    ~     m10a  ~     ~',
      '   ~     ~     ~     f11a  ~     Da    ~',
      'm12a  w6a   h11a  w10a  p3a   f9a   Da    ~',
      '   m3a   w4a   m6a   p5a   h4a   Da    ~',
      'h8a   p9a   ~     ~     h10a  ~     ~     g6',
      '   ~     f3a   ~     f8a   w9a   ~     f4',
      '      m5a   ~     p11a  p2a   ~     w5',
    ],
    harbors: [
      [2, 2, 4, 'forest'],
      [6, 2, 4, 'pasture'],
      [1, 3, 3, 'fields'],
      [3, 3, 1, 'hills'],
      [8, 2, 5, 'mountains'],
      [3, 5, 3, 'any'],
      [6, 6, 1, 'any'],
      [9, 5, 5, 'any'],
      [9, 5, 1, 'any'],
    ],
    harborDeal: { setup: 'all', variable: 'all' },
  },
  // Scenario 9 (p. 24). Everything inside the frame at random, sea included; the players place the
  // harbors.
  s9: {
    page: 24,
    rows: [
      '      ~a    ~a    ~a    ~a    ~a',
      '   ~a    ~a    ~a    ~a    ~a    ~a',
      '~a    ~a    ~a    ~a    ~a    ~a    ~a',
      '   ~a    ~a    ~a    ~a    ~a    ~a',
      '~a    ~a    ~a    ~a    ~a    ~a    ~a',
      '   ~a    ~a    ~a    ~a    ~a    ~a',
      '      ~a    ~a    ~a    ~a    ~a',
    ],
    harbors: [],
    harborDeal: { setup: 'all', variable: 'all' },
    fromTable: ['a'],
  },
}
