import { expect, describe, it } from "vitest";
import { parse, IParserResult } from "./parser";

describe("protobuf-parser", () => {
  it("should parse a simple message definition", () => {
    const source = `
        syntax = "proto3";
        package example;
        
        message Person {
          string name = 1;
          int32 age = 2;
          repeated string interests = 3;
        }
      `;
    const expected: IParserResult = {
      package: "example",
      imports: undefined,
      weakImports: undefined,
      syntax: "proto3",
      root: {
        syntaxType: "ProtoRoot",
        comment: undefined,
        name: "",
        fullName: "",
        options: undefined,
        nested: {
          example: {
            syntaxType: "NamespaceDefinition",
            comment: undefined,
            name: "example",
            fullName: ".example",
            options: undefined,
            nested: {
              Person: {
                syntaxType: "MessageDefinition",
                comment: undefined,
                name: "Person",
                fullName: ".example.Person",
                fields: {
                  name: {
                    id: 1,
                    type: { syntaxType: "BaseType", value: "string" },
                    name: "name",
                    optional: true,
                    required: false,
                    repeated: false,
                    map: false,
                    keyType: undefined,
                    extend: undefined,
                    options: undefined,
                    rule: undefined,
                    fullName: ".example.Person.name",
                    comment: undefined,
                  },
                  age: {
                    id: 2,
                    type: { syntaxType: "BaseType", value: "int32" },
                    name: "age",
                    optional: true,
                    required: false,
                    repeated: false,
                    map: false,
                    keyType: undefined,
                    extend: undefined,
                    options: undefined,
                    rule: undefined,
                    fullName: ".example.Person.age",
                    comment: undefined,
                  },
                  interests: {
                    id: 3,
                    type: { syntaxType: "BaseType", value: "string" },
                    name: "interests",
                    optional: true,
                    required: false,
                    repeated: true,
                    map: false,
                    keyType: undefined,
                    extend: undefined,
                    options: undefined,
                    rule: "repeated",
                    fullName: ".example.Person.interests",
                    comment: undefined,
                  },
                },
                reserved: undefined,
                oneofs: undefined,
                options: undefined,
                nested: undefined,
                group: undefined,
              },
            },
          },
        },
      },
    };
    const result = parse(source, { toJson: true });
    expect(result).toEqual(expected);
  });

  it("should throw an error for an invalid token", () => {
    const source = `
      syntax = "proto3";
      package example;

      message Person {
        string name = ;
      }
    `;
    expect(() => parse(source)).toThrow();
  });
});
