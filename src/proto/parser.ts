import {
  Root,
  MessageDefinition as Type,
  FieldDefinition as Field,
  MapField,
  OneofDefinition as OneOf,
  EnumDefinition as Enum,
  ServiceDefinition as Service,
  MethodDefinition as Method,
  setWeekResolve as setWeakResolve,
  NamespaceDefinition as NamespaceBase,
  ReflectionObject,
  EnumDefinition,
  MessageDefinition,
} from "./construct";

import { types } from "./types";

import * as util from "./util";
import { tokenize } from "./tokenize";

const base10Re: RegExp = /^[1-9][0-9]*$/;
const base10NegRe: RegExp = /^-?[1-9][0-9]*$/;
const base16Re: RegExp = /^0[x][0-9a-fA-F]+$/;
const base16NegRe: RegExp = /^-?0[x][0-9a-fA-F]+$/;
const base8Re: RegExp = /^0[0-7]+$/;
const base8NegRe: RegExp = /^-?0[0-7]+$/;
const numberRe: RegExp = /^(?![eE])[0-9]*(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?$/;
const nameRe: RegExp = /^[a-zA-Z_][a-zA-Z_0-9]*$/;
const typeRefRe: RegExp =
  /^(?:\.?[a-zA-Z_][a-zA-Z_0-9]*)(?:\.[a-zA-Z_][a-zA-Z_0-9]*)*$/;
const fqTypeRefRe: RegExp = /^(?:\.[a-zA-Z_][a-zA-Z_0-9]*)+$/;

export interface IParserResult {
  package: string | undefined;
  imports: string[] | undefined;
  weakImports: string[] | undefined;
  syntax: string | undefined;
  root: Root | Record<string, unknown>;
}
interface IParseOptions {
  keepCase: boolean;
  alternateCommentMode: boolean;
  resolve: boolean;
  weakResolve: boolean;
  toJson: boolean;
}

const defaultParseOptions: IParseOptions = {
  keepCase: true,
  alternateCommentMode: true,
  resolve: true,
  weakResolve: false,
  toJson: true,
};

let topFileName: string | undefined;

function testRegExp(regexp: RegExp, token: string | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  return regexp.test(token);
}

export function parse(source: string, opt?: IParseOptions): IParserResult {
  let root: Root | Record<string, unknown>;
  root = new Root();

  const options = { ...defaultParseOptions, ...opt };

  const tn = tokenize(source);
  const { next } = tn;
  const { push } = tn;
  const { peek } = tn;
  const { skip } = tn;
  const { cmnt } = tn;

  let head = true;
  let pkg: string | undefined;
  let imports: string[] | undefined;
  let weakImports: string[] | undefined;
  let syntax: string | undefined;
  let isProto3 = false;

  let ptr = root;

  const applyCase = options.keepCase
    ? function (name: string) {
        return name;
      }
    : util.camelCase;

  function illegal(
    token: string | undefined,
    name?: string,
    insideTryCatch?: boolean
  ): Error {
    topFileName = undefined;
    const message = `illegal ${name || "token"} '${token}'`;
    const err = new Error(message);
    return err;
  }

  function readString(): string {
    const values: string[] = [];
    let token: string | undefined;
    do {
      token = next();
      if (token !== '"' && token !== "'") throw illegal(token);
      const nexttoken = next();
      if (nexttoken === undefined) throw illegal(token, "string");
      values.push(nexttoken);
      skip(token);
      token = peek();
    } while (token === '"' || token === "'");
    return values.join("");
  }

  function readValue(acceptTypeRef: boolean): string | boolean | number {
    const token = next();
    if (token === undefined) throw illegal(token, "value");
    switch (token) {
      case "'":
      case '"':
        push(token);
        return readString();
      case "true":
      case "TRUE":
        return true;
      case "false":
      case "FALSE":
        return false;
    }
    try {
      return parseNumber(token, /* insideTryCatch */ true);
    } catch (e) {
      if (acceptTypeRef && typeRefRe.test(token)) return token;

      throw illegal(token, "value");
    }
  }

  function readRanges(target: any[], acceptStrings: boolean): void {
    let token: string | undefined;
    let start: number;
    do {
      if (acceptStrings && ((token = peek()) === '"' || token === "'"))
        target.push(readString());
      else
        target.push([
          (start = parseId(next())),
          skip("to", true) ? parseId(next()) : start,
        ]);
    } while (skip(",", true));
    skip(";");
  }
  function parseNumber(
    token: string | undefined,
    insideTryCatch?: boolean
  ): number {
    if (token === undefined) throw illegal(token, "number");
    let sign = 1;
    if (token.charAt(0) === "-") {
      sign = -1;
      token = token.substring(1);
    }

    switch (token) {
      case "inf":
      case "INF":
      case "Inf":
        return sign * Infinity;
      case "nan":
      case "NAN":
      case "Nan":
      case "NaN":
        return NaN;
      case "0":
        return 0;
    }
    if (base10Re.test(token)) return sign * parseInt(token, 10);
    if (base16Re.test(token)) return sign * parseInt(token, 16);
    if (base8Re.test(token)) return sign * parseInt(token, 8);

    if (numberRe.test(token)) return sign * parseFloat(token);

    throw illegal(token, "number", insideTryCatch);
  }

  function parseId(
    token: string | undefined,
    acceptNegative?: boolean
  ): number {
    if (token === undefined) throw illegal(token, "id");
    switch (token) {
      case "max":
      case "MAX":
      case "Max":
        return 536870911;
      case "0":
        return 0;
    }

    if (!acceptNegative && token.charAt(0) === "-") throw illegal(token, "id");

    if (base10NegRe.test(token)) return parseInt(token, 10);

    if (base16NegRe.test(token)) return parseInt(token, 16);

    if (base8NegRe.test(token)) return parseInt(token, 8);

    throw illegal(token, "id");
  }

  function parsePackage(): void {
    if (pkg !== undefined) throw illegal("package");

    pkg = next();
    if (pkg === undefined) throw illegal(pkg, "name");
    if (!typeRefRe.test(pkg)) throw illegal(pkg, "name");
    ptr = ptr.define(pkg);
    skip(";");
  }

  function parseImport(): void {
    let token = peek();
    let whichImports: string[];
    switch (token) {
      case "weak":
        whichImports = weakImports || (weakImports = []);
        next();
        break;
      case "public":
        next();
      default:
        whichImports = imports || (imports = []);
        break;
    }
    token = readString();
    skip(";");
    whichImports.push(token);
  }

  function parseSyntax(): void {
    skip("=");
    syntax = readString();
    isProto3 = syntax === "proto3";

    if (!isProto3 && syntax !== "proto2") throw illegal(syntax, "syntax");

    skip(";");
  }

  function parseCommon(parent: ReflectionObject, token: string): boolean {
    switch (token) {
      case "option":
        parseOption(parent, token);
        skip(";");
        return true;

      case "message":
        if (!(parent instanceof NamespaceBase))
          throw Error("illegal context for message");
        parseType(parent, token);
        return true;

      case "enum":
        if (!(parent instanceof NamespaceBase))
          throw Error("illegal context for enum");
        parseEnum(parent, token);
        return true;

      case "service":
        if (!(parent instanceof NamespaceBase))
          throw Error("illegal context for service");
        parseService(parent, token);
        return true;

      case "extend":
        parseExtension(parent, token);
        return true;
    }
    return false;
  }

  function ifBlock(
    obj: ReflectionObject | undefined,
    fnIf: (token: string | undefined) => void,
    fnElse?: () => void
  ): void {
    const trailingLine = tn.line;
    if (obj) {
      if (typeof obj.comment !== "string") {
        obj.comment = cmnt();
      }
      obj.fileName = topFileName;
    }
    if (skip("{", true)) {
      let token: string | undefined;
      while ((token = next()) !== "}") fnIf(token);
      skip(";", true);
    } else {
      if (fnElse) fnElse();
      skip(";");
      if (obj && typeof obj.comment !== "string")
        obj.comment = cmnt(trailingLine);
    }
  }

  function parseType(parent: NamespaceBase, token: string | undefined): void {
    if (!testRegExp(nameRe, (token = next())))
      throw illegal(token, "type name");
    if (token === undefined) throw illegal(token, "type name");
    const type = new Type(token);
    ifBlock(type, (token) => {
      if (token === undefined) throw illegal(token);
      if (parseCommon(type, token)) return;

      switch (token) {
        case "map":
          parseMapField(type);
          break;

        case "required":
        case "optional":
        case "repeated":
          parseField(type, token);
          break;

        case "oneof":
          parseOneOf(type, token);
          break;

        case "extensions":
          readRanges(type.extensions || (type.extensions = []), false);
          break;

        case "reserved":
          readRanges(type.reserved || (type.reserved = []), true);
          break;

        default:
          if (!isProto3 || !typeRefRe.test(token)) throw illegal(token);

          push(token);
          parseField(type, "optional");
          break;
      }
    });
    parent.add(type);
  }

  function parseField(
    parent: NamespaceBase,
    rule: string,
    extend?: string
  ): void {
    const type = next();
    if (type === undefined) throw illegal(type, "type");
    if (type === "group") {
      parseGroup(parent, rule);
      return;
    }

    if (!typeRefRe.test(type)) throw illegal(type, "type");

    let name = next();
    if (name === undefined) throw illegal(name, "name");

    if (!nameRe.test(name)) throw illegal(name, "name");

    name = applyCase(name);
    skip("=");

    const field = new Field(name, parseId(next()), type, rule, extend);
    ifBlock(
      field,
      (token) => {
        if (token === "option") {
          parseOption(field, token);
          skip(";");
        } else throw illegal(token);
      },
      () => {
        parseInlineOptions(field);
      }
    );
    parent.add(field);

    if (
      !isProto3 &&
      field.repeated &&
      //@ts-ignore
      (types.packed[type] !== undefined || types.basic[type] === undefined)
    )
      field.setOption("packed", false, true);
  }

  function parseGroup(parent: NamespaceBase, rule: string): void {
    let name = next();
    if (name === undefined) throw illegal(token, "name");
    if (!nameRe.test(name)) throw illegal(name, "name");

    const fieldName = util.lcFirst(name);
    if (name === fieldName) name = util.ucFirst(name);
    skip("=");
    const id = parseId(next());
    const type = new Type(name);
    type.group = true;
    const field = new Field(fieldName, id, name, rule);
    field.fileName = topFileName;
    ifBlock(type, (token) => {
      switch (token) {
        case "option":
          parseOption(type, token);
          skip(";");
          break;

        case "required":
        case "optional":
        case "repeated":
          parseField(type, token);
          break;

        default:
          throw illegal(token); // there are no groups with proto3 semantics
      }
    });
    parent.add(type).add(field);
  }

  function parseMapField(parent: Type): void {
    skip("<");
    const keyType = next();
    if (keyType === undefined) throw illegal(token, "type");
    //@ts-ignore
    if (types.mapKey[keyType] === undefined) throw illegal(keyType, "type");

    skip(",");
    const valueType = next();
    if (valueType === undefined) throw illegal(token, "type");

    if (!typeRefRe.test(valueType)) throw illegal(valueType, "type");

    skip(">");
    const name = next();

    if (name === undefined) throw illegal(name, "name");

    if (!nameRe.test(name)) throw illegal(name, "name");

    skip("=");
    const field = new MapField(
      applyCase(name),
      parseId(next()),
      keyType,
      valueType
    );
    ifBlock(
      field,
      (token) => {
        if (token === "option") {
          parseOption(field, token);
          skip(";");
        } else throw illegal(token);
      },
      () => {
        parseInlineOptions(field);
      }
    );
    parent.add(field);
  }

  function parseOneOf(parent: Type, token: string | undefined): void {
    if (!testRegExp(nameRe, (token = next()))) throw illegal(token, "name");
    if (token === undefined) throw illegal(token, "name");
    const oneof = new OneOf(applyCase(token));
    ifBlock(oneof, (token) => {
      if (token === undefined) throw illegal(token);
      if (token === "option") {
        parseOption(oneof, token);
        skip(";");
      } else {
        push(token);
        if (!(oneof instanceof NamespaceBase)) throw illegal(token);
        parseField(oneof, "optional");
      }
    });
    parent.add(oneof);
  }

  function parseEnum(parent: NamespaceBase, token: string | undefined): void {
    if (!testRegExp(nameRe, (token = next()))) throw illegal(token, "name");
    if (token === undefined) throw illegal(token, "name");
    const enm = new Enum(token);
    ifBlock(enm, (token) => {
      switch (token) {
        case "option":
          parseOption(enm, token);
          skip(";");
          break;

        case "reserved":
          readRanges(enm.reserved || (enm.reserved = []), true);
          break;

        default:
          parseEnumValue(enm, token);
      }
    });
    parent.add(enm);
  }

  function parseEnumValue(parent: Enum, token: string | undefined): void {
    if (token === undefined) throw illegal(token, "name");
    if (!nameRe.test(token)) throw illegal(token, "name");

    skip("=");
    const value = parseId(next(), true);
    const dummy: ReflectionObject = {} as Record<
      string,
      any
    > as ReflectionObject;
    ifBlock(
      dummy,
      (token) => {
        if (token === "option") {
          parseOption(dummy, token); // skip
          skip(";");
        } else throw illegal(token);
      },
      () => {
        parseInlineOptions(dummy); // skip
      }
    );
    parent.add(token, value, dummy.comment);
  }

  function parseOption(
    parent: ReflectionObject,
    token: string | undefined
  ): void {
    const isCustom = skip("(", true);

    if (!testRegExp(nameRe, (token = next()))) throw illegal(token, "name");

    let name = token;
    if (isCustom) {
      skip(")");
      name = `(${name})`;
      token = peek();
      if (!testRegExp(fqTypeRefRe, token)) {
        name += token;
        next();
      }
    }
    skip("=");
    parseOptionValue(parent, name);
  }

  function parseOptionValue(
    parent: ReflectionObject,
    name: string | undefined
  ): void {
    if (name === undefined) throw illegal(name, "name");
    let token: string | undefined;
    if (skip("{", true)) {
      do {
        if (!testRegExp(nameRe, (token = next()))) throw illegal(token, "name");
        if (peek() === "{") {
          parseOptionValue(parent, `${name}.${token}`);
        } else {
          skip(":");
          if (peek() === "{") parseOptionValue(parent, `${name}.${token}`);
          else setOption(parent, `${name}.${token}`, readValue(true));
        }
        skip(",", true);
      } while (!skip("}", true));
    } else setOption(parent, name, readValue(true));
  }

  function setOption(parent: ReflectionObject, name: string, value: any): void {
    if (parent.setOption) parent.setOption(name, value);
  }

  function parseInlineOptions(parent: ReflectionObject): ReflectionObject {
    if (skip("[", true)) {
      do {
        parseOption(parent, "option");
      } while (skip(",", true));
      skip("]");
    }
    return parent;
  }

  function parseService(
    parent: NamespaceBase,
    token: string | undefined
  ): void {
    if (!testRegExp(nameRe, (token = next())))
      throw illegal(token, "service name");
    if (token === undefined) throw illegal(token, "service name");
    const service = new Service(token);
    ifBlock(service, (token) => {
      if (token === undefined) throw illegal(token);
      if (parseCommon(service, token)) return;

      if (token === "rpc") parseMethod(service, token);
      else throw illegal(token);
    });
    parent.add(service);
  }

  function parseMethod(parent: Service, token: string | undefined): void {
    const commentText = cmnt();

    const type = token;

    if (!testRegExp(nameRe, (token = next()))) throw illegal(token, "name");
    if (token === undefined) throw illegal(token, "name");
    const name = token;
    let requestType: string;
    let requestStream: boolean | undefined;
    let responseType: string;
    let responseStream: boolean | undefined;

    skip("(");
    if (skip("stream", true)) requestStream = true;

    if (!testRegExp(typeRefRe, (token = next()))) throw illegal(token);
    if (token === undefined) throw illegal(token);
    requestType = token;
    skip(")");
    skip("returns");
    skip("(");
    if (skip("stream", true)) responseStream = true;

    if (!testRegExp(typeRefRe, (token = next()))) throw illegal(token);
    if (token === undefined) throw illegal(token);
    responseType = token;
    skip(")");

    const method = new Method(
      name,
      type,
      requestType,
      responseType,
      requestStream,
      responseStream
    );
    method.comment = commentText;
    ifBlock(method, (token) => {
      if (token === "option") {
        parseOption(method, token);
        skip(";");
      } else throw illegal(token);
    });
    parent.add(method);
  }

  function parseExtension(
    parent: ReflectionObject,
    token: string | undefined
  ): void {
    if (!testRegExp(typeRefRe, (token = next())))
      throw illegal(token, "reference");

    const reference = token;
    ifBlock(undefined, (token) => {
      if (token === undefined) throw illegal(token);
      switch (token) {
        case "required":
        case "repeated":
        case "optional":
          if (!(parent instanceof NamespaceBase)) throw illegal(token);
          parseField(parent, token, reference);
          break;

        default:
          if (!isProto3 || !typeRefRe.test(token)) throw illegal(token);
          push(token);
          if (!(parent instanceof NamespaceBase)) throw illegal(token);
          parseField(parent, "optional", reference);
          break;
      }
    });
  }

  let token: string | undefined;
  while ((token = next()) !== undefined) {
    switch (token) {
      case "package":
        if (!head) throw illegal(token);

        parsePackage();
        break;

      case "import":
        if (!head) throw illegal(token);

        parseImport();
        break;

      case "syntax":
        if (!head) throw illegal(token);

        parseSyntax();
        break;

      case "option":
        parseOption(ptr, token);
        skip(";");
        break;

      default:
        if (parseCommon(ptr, token)) {
          head = false;
          continue;
        }

        throw illegal(token);
    }
  }

  topFileName = undefined;

  if (options.weakResolve) {
    setWeakResolve(true);
    root.resolve();
  } else if (options.resolve) {
    setWeakResolve(false);
    root.resolve();
  }

  if (options.toJson) {
    root = root.toJson();
  }

  return {
    package: pkg,
    imports,
    weakImports,
    syntax,
    root,
  };
}
