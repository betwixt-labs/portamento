import { expect, describe, it } from "vitest";
import { tokenize } from "./tokenize";

describe("tokenize", () => {
  it("should tokenize a simple message definition", () => {
    const tokenizer = tokenize('syntax = "proto3"; message Foo {}', false);
    expect(tokenizer.next()).toEqual("syntax");
    expect(tokenizer.next()).toEqual("=");
    expect(tokenizer.next()).toEqual('"');
    expect(tokenizer.next()).toEqual("proto3");
    expect(tokenizer.next()).toEqual('"');
    expect(tokenizer.next()).toEqual(";");
    expect(tokenizer.next()).toEqual("message");
    expect(tokenizer.next()).toEqual("Foo");
    expect(tokenizer.next()).toEqual("{");
    expect(tokenizer.next()).toEqual("}");
  });

  it("should tokenize a complex proto schema", () => {
    const schema = `
    syntax = "proto3";
  
    message Person {
      string name = 1;
      int32 age = 2;
      repeated string address = 3;
  
      enum PhoneType {
        MOBILE = 0;
        HOME = 1;
        WORK = 2;
      }
  
      message PhoneNumber {
        string number = 1;
        PhoneType type = 2;
      }
  
      repeated PhoneNumber phones = 4;
    }
  `;

    const tokenizer = tokenize(schema, false);
    expect(tokenizer.next()).toEqual("syntax");
    expect(tokenizer.next()).toEqual("=");
    expect(tokenizer.next()).toEqual('"');
    expect(tokenizer.next()).toEqual("proto3");
    expect(tokenizer.next()).toEqual('"');
    expect(tokenizer.next()).toEqual(";");
    expect(tokenizer.next()).toEqual("message");
    expect(tokenizer.next()).toEqual("Person");
    expect(tokenizer.next()).toEqual("{");
    expect(tokenizer.next()).toEqual("string");
    expect(tokenizer.next()).toEqual("name");
    expect(tokenizer.next()).toEqual("=");
    expect(tokenizer.next()).toEqual("1");
    expect(tokenizer.next()).toEqual(";");
    expect(tokenizer.next()).toEqual("int32");
    expect(tokenizer.next()).toEqual("age");
    expect(tokenizer.next()).toEqual("=");
    expect(tokenizer.next()).toEqual("2");
    expect(tokenizer.next()).toEqual(";");
    expect(tokenizer.next()).toEqual("repeated");
    expect(tokenizer.next()).toEqual("string");
    expect(tokenizer.next()).toEqual("address");
    expect(tokenizer.next()).toEqual("=");
    expect(tokenizer.next()).toEqual("3");
    expect(tokenizer.next()).toEqual(";");
    expect(tokenizer.next()).toEqual("enum");
    expect(tokenizer.next()).toEqual("PhoneType");
    expect(tokenizer.next()).toEqual("{");
    expect(tokenizer.next()).toEqual("MOBILE");
    expect(tokenizer.next()).toEqual("=");
    expect(tokenizer.next()).toEqual("0");
    expect(tokenizer.next()).toEqual(";");
    expect(tokenizer.next()).toEqual("HOME");
    expect(tokenizer.next()).toEqual("=");
    expect(tokenizer.next()).toEqual("1");
    expect(tokenizer.next()).toEqual(";");
    expect(tokenizer.next()).toEqual("WORK");
    expect(tokenizer.next()).toEqual("=");
    expect(tokenizer.next()).toEqual("2");
    expect(tokenizer.next()).toEqual(";");
    expect(tokenizer.next()).toEqual("}");
    expect(tokenizer.next()).toEqual("message");
    expect(tokenizer.next()).toEqual("PhoneNumber");
    expect(tokenizer.next()).toEqual("{");
    expect(tokenizer.next()).toEqual("string");
    expect(tokenizer.next()).toEqual("number");
    expect(tokenizer.next()).toEqual("=");
    expect(tokenizer.next()).toEqual("1");
    expect(tokenizer.next()).toEqual(";");
    expect(tokenizer.next()).toEqual("PhoneType");
    expect(tokenizer.next()).toEqual("type");
    expect(tokenizer.next()).toEqual("=");
    expect(tokenizer.next()).toEqual("2");
    expect(tokenizer.next()).toEqual(";");
    expect(tokenizer.next()).toEqual("}");
    expect(tokenizer.next()).toEqual("repeated");
    expect(tokenizer.next()).toEqual("PhoneNumber");
    expect(tokenizer.next()).toEqual("phones");
    expect(tokenizer.next()).toEqual("=");
    expect(tokenizer.next()).toEqual("4");
    expect(tokenizer.next()).toEqual(";");
    expect(tokenizer.next()).toEqual("}");
  });

   it("should tokenize a complex object with mixed comments", () => {
    const source = `
      syntax = "proto3";
      
      /*
        This is a block comment
      */
      message Person {
        // This is a C++ style comment
        string name = 1;

        /*
          This is another block comment
        */
        repeated int32 numbers = 2;

        // This is another C++ style comment
        map<string, int32> properties = 3;
      }
    `;
    const tokens: string[] = [];
    const tokenizer = tokenize(source, false);
    let token: string | undefined;
    while ((token = tokenizer.next()) !== undefined) {
      tokens.push(token);
    }
   
    expect(tokens).toEqual([
      "syntax",
      "=",
      '"',
      'proto3',
      '"',
      ";",
      "message",
      "Person",
      "{",
      "string",
      "name",
      "=",
      "1",
      ";",
      "repeated",
      "int32",
      "numbers",
      "=",
      "2",
      ";",
      "map",
      "<",
      "string",
      ",",
      "int32",
      ">",
      "properties",
      "=",
      "3",
      ";",
      "}",
    ]);
  });
});
