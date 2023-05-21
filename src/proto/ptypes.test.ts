import { expect, describe, it } from "vitest";
import { SyntaxType, getFieldType } from "./ptypes";

describe('getFieldType', () => {
  it('should return a BaseType if typeString is a keyword type', () => {
    const fieldType = getFieldType('double');
    expect(fieldType).toEqual({ value: 'double', syntaxType: SyntaxType.BaseType });
  });

  it('should return an Identifier if typeString is not a keyword type', () => {
    const fieldType = getFieldType('MyCustomType');
    expect(fieldType).toEqual({ value: 'MyCustomType', syntaxType: SyntaxType.Identifier });
  });

  it("returns BaseType if the type is a keyword type", () => {
    const typeString = "int32";
    const expected = {
      value: typeString,
      syntaxType: SyntaxType.BaseType,
    };
    const result = getFieldType(typeString);
    expect(result).toEqual(expected);
  });

});