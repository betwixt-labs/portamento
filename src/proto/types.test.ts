import { expect, describe, it } from "vitest";
import { types, bake } from "./types";

describe("Types", () => {
  it("should have correct basic wire types", () => {
    expect(types.basic).toEqual({
      double: 1,
      float: 5,
      int32: 0,
      uint32: 0,
      sint32: 0,
      fixed32: 5,
      sfixed32: 5,
      int64: 0,
      uint64: 0,
      sint64: 0,
      fixed64: 1,
      sfixed64: 1,
      bool: 0,
      string: 2,
      bytes: 2,
    });
  });

  it("should have correct long wire types", () => {
    expect(types.long).toEqual({
      int64: 0,
      uint64: 0,
      sint64: 0,
      fixed64: 1,
      sfixed64: 1,
    });
  });

  it("should have correct mapKey wire types", () => {
    expect(types.mapKey).toEqual({
      int32: 0,
      uint32: 0,
      sint32: 0,
      fixed32: 5,
      sfixed32: 5,
      int64: 0,
      uint64: 0,
      sint64: 0,
      fixed64: 1,
      sfixed64: 1,
      bool: 0,
      string: 2,
    });
  });

  it("should have correct packed wire types", () => {
    expect(types.packed).toEqual({
      double: 1,
      float: 5,
      int32: 0,
      uint32: 0,
      sint32: 0,
      fixed32: 5,
      sfixed32: 5,
      int64: 0,
      uint64: 0,
      sint64: 0,
      fixed64: 1,
      sfixed64: 1,
      bool: 0,
    });
  });

  it("should have correct default values", () => {
    expect(types.defaults).toEqual({
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
      bytes: [],
      message: null,
    });
  });

  it("should correctly bake values with default offset", () => {
    const input = [1, 2, 3];
    const baked = bake(input);

    expect(baked).toEqual({
      double: 1,
      float: 2,
      int32: 3,
    });
  });

  it("should correctly bake values with custom offset", () => {
    const input = [1, 2, 3];
    const offset = 3;
    const baked = bake(input, offset);

    expect(baked).toEqual({
      uint32: 1,
      sint32: 2,
      fixed32: 3,
    });
  });
});
