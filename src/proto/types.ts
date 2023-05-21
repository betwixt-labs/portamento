import * as util from "./util";

interface Defaults {
  double: number;
  float: number;
  int32: number;
  uint32: number;
  sint32: number;
  fixed32: number;
  sfixed32: number;
  int64: number;
  uint64: number;
  sint64: number;
  fixed64: number;
  sfixed64: number;
  bool: boolean;
  string: string;
  bytes: ReadonlyArray<number>;
  message: null;
}

/**
 * Common type constants.
 * @namespace
 */
export const types = {
  basic: {},
  defaults: {},
  long: {},
  mapKey: {},
  packed: {},
};

const typeNames: string[] = [
  "double", // 0
  "float", // 1
  "int32", // 2
  "uint32", // 3
  "sint32", // 4
  "fixed32", // 5
  "sfixed32", // 6
  "int64", // 7
  "uint64", // 8
  "sint64", // 9
  "fixed64", // 10
  "sfixed64", // 11
  "bool", // 12
  "string", // 13
  "bytes", // 14
];

/**
 * `bake` takes an array of values and an optional offset, then creates an object
 * where keys are the corresponding string names from the 's' array (at the index
 * plus the offset), and the values are the items from the input array.
 *
 * @param values - The input array of values to use for the generated object.
 * @param offset - An optional offset to add to the index when looking up the key in the 's' array.
 * @returns The generated object with the keys from the 's' array and values from the input array.
 */
export function bake(values: number[], offset?: number): Record<string, number> {
  let i = 0;
  const o: Record<string, number> = {};
  offset = offset || 0;
  while (i < values.length) o[typeNames[i + offset]] = values[i++];
  return o;
}

types.basic = bake([
  /* double   */ 1, /* float    */ 5, /* int32    */ 0, /* uint32   */ 0,
  /* sint32   */ 0, /* fixed32  */ 5, /* sfixed32 */ 5, /* int64    */ 0,
  /* uint64   */ 0, /* sint64   */ 0, /* fixed64  */ 1, /* sfixed64 */ 1,
  /* bool     */ 0, /* string   */ 2, /* bytes    */ 2,
]);

const defaults: Defaults = {
  double: 0,
  float: 0,
  int32: 0,
  uint32: 0,
  sint32: 0,
  fixed32: 0,
  sfixed32: 0,
  int64: 0,
  uint64: 0,
  sint64: 0,
  fixed64: 0,
  sfixed64: 0,
  bool: false,
  string: "",
  bytes: util.emptyArray as ReadonlyArray<number>,
  message: null,
};

types.defaults = defaults;

types.long = bake(
  [
    /* int64    */ 0, /* uint64   */ 0, /* sint64   */ 0, /* fixed64  */ 1,
    /* sfixed64 */ 1,
  ],
  7
);

types.mapKey = bake(
  [
    /* int32    */ 0, /* uint32   */ 0, /* sint32   */ 0, /* fixed32  */ 5,
    /* sfixed32 */ 5, /* int64    */ 0, /* uint64   */ 0, /* sint64   */ 0,
    /* fixed64  */ 1, /* sfixed64 */ 1, /* bool     */ 0, /* string   */ 2,
  ],
  2
);

types.packed = bake([
  /* double   */ 1, /* float    */ 5, /* int32    */ 0, /* uint32   */ 0,
  /* sint32   */ 0, /* fixed32  */ 5, /* sfixed32 */ 5, /* int64    */ 0,
  /* uint64   */ 0, /* sint64   */ 0, /* fixed64  */ 1, /* sfixed64 */ 1,
  /* bool     */ 0,
]);



