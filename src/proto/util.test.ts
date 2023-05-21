import {
  isObject,
  isString,
  isInteger,
  camelCase,
  lcFirst,
  ucFirst,
  emptyArray,
  toPascalCase
} from "./util";
import { expect, describe, it } from "vitest";

describe("Utility Functions", () => {
  it("isObject should correctly identify objects", () => {
    expect(isObject({})).toBe(true);
    expect(isObject(undefined)).toBe(false);
     expect(isObject(null)).toBe(false);
    expect(isObject("a string")).toBe(false);
  });

  it("isString should correctly identify strings", () => {
    expect(isString("a string")).toBe(true);
    expect(isString(new String("a string"))).toBe(true);
    expect(isString(42)).toBe(false);
  });

  it("isInteger should correctly identify integers", () => {
    expect(isInteger(42)).toBe(true);
    expect(isInteger(3.14)).toBe(false);
    expect(isInteger("42")).toBe(false);
  });


  it("lcFirst should correctly convert the first character to lowercase", () => {
    expect(lcFirst("Hello")).toBe("hello");
    expect(lcFirst("hello")).toBe("hello");
  });

  it("ucFirst should correctly convert the first character to uppercase", () => {
    expect(ucFirst("hello")).toBe("Hello");
    expect(ucFirst("Hello")).toBe("Hello");
  });

  it("emptyArray should be an empty, frozen array", () => {
    expect(emptyArray).toEqual([]);
    expect(Object.isFrozen(emptyArray)).toBe(true);
  });
});

describe("camelCase", () => {
  it("converts snake_case strings to camelCase", () => {
    expect(camelCase("snake_case_string")).toBe("snakeCaseString");
    expect(camelCase("another_example")).toBe("anotherExample");
  });

  it("returns the same string if already in camelCase", () => {
    expect(camelCase("alreadyCamelCase")).toBe("alreadyCamelCase");
  });

  it("handles empty strings", () => {
    expect(camelCase("")).toBe("");
  });

  it("handles single-word strings", () => {
    expect(camelCase("word")).toBe("word");
  });

  it("handles strings with special characters", () => {
    expect(camelCase("string_with$special#characters")).toBe("stringWith$special#characters");
  });
});

describe("toPascalCase", () => {
  it("converts snake_case to PascalCase", () => {
    expect(toPascalCase("hello_world")).toBe("HelloWorld");
    expect(toPascalCase("this_is_a_test")).toBe("ThisIsATest");
  });

  it("converts camelCase to PascalCase", () => {
    expect(toPascalCase("helloWorld")).toBe("HelloWorld");
    expect(toPascalCase("thisIsATest")).toBe("ThisIsATest");
  });

  it("converts a single word to PascalCase", () => {
    expect(toPascalCase("hello")).toBe("Hello");
    expect(toPascalCase("world")).toBe("World");
  });

it("handles empty strings and special characters", () => {
  expect(toPascalCase("")).toBe("");
  expect(toPascalCase("this$isA#test")).toBe("ThisIsATest");
});
});
