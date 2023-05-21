import * as util from "./util";
import { SyntaxType, getFieldType, FieldType } from "./ptypes";

const ruleRe = /^required|optional|repeated$/;
let weakResolve = false;

export function setWeekResolve(weak: boolean): void {
  weakResolve = !!weak;
}

export class ReflectionObject {
  syntaxType: SyntaxType;
  options?: Record<string, unknown>;
  name: string;
  fullName?: string;
  comment?: string;
  parent?: ReflectionObject;
  fileName?: string;

  constructor(
    name: string,
    syntaxType: SyntaxType,
    options?: Record<string, unknown>
  ) {
    if (!util.isString(name)) {
      throw new TypeError("name must be a string");
    }

    if (options && !util.isObject(options)) {
      throw new TypeError("options must be an object");
    }

    this.options = options;
    this.name = name;
    this.fullName = undefined;
    this.comment = undefined;
    this.parent = undefined;
    this.syntaxType = syntaxType;
  }

  setOption(
    name: string,
    value: unknown,
    ifNotSet?: boolean
  ): ReflectionObject {
    if (!ifNotSet || !this.options || this.options[name] === undefined) {
      (this.options || (this.options = {}))[name] = value;
    }

    return this;
  }

  getFullName(): string {
    if (this.fullName) return this.fullName;
    const path = [this.name];
    let ptr = this.parent;

    while (ptr) {
      path.unshift(ptr.name);
      ptr = ptr.parent;
    }

    this.fullName = path.join(".");
    return this.fullName;
  }

  onAdd(parent: ReflectionObject): void {
    this.parent = parent;
  }

  resolve(): ReflectionObject {
    this.fullName = this.getFullName();
    return this;
  }

  toJson(): Record<string, unknown> {
    return copyObject(this as Record<string, unknown>, [
      "name",
      "fullName",
      "comment",
      "options",
    ]);
  }
}

export class FieldDefinition extends ReflectionObject {
  type: FieldType;
  rule?: string;
  id: number;
  extend?: string;
  required: boolean;
  optional: boolean;
  repeated: boolean;
  map: boolean;
  keyType?: FieldType;
  comment?: string;
  partOf?: OneofDefinition | undefined;

  constructor(
    name: string,
    id: number,
    type: string,
    rule?: string,
    extend?: string,
    options?: Record<string, unknown>,
    comment?: string
  ) {
    if (util.isObject(rule)) {
      comment = extend;
      options = rule as Record<string, unknown>;
      rule = undefined;
      extend = undefined;
    } else if (util.isObject(extend)) {
      comment = options as string | undefined;
      options = extend as Record<string, unknown>;
      extend = undefined;
    }

    super(name, SyntaxType.FieldDefinition, options);

    if (!util.isInteger(id) || id < 0) {
      throw new TypeError("id must be a non-negative integer");
    }

    if (!util.isString(type)) {
      throw new TypeError("type must be a string");
    }

    if (rule !== undefined) {

      rule = rule.toString().toLowerCase();

      if (!ruleRe.test(rule)) {
        throw new TypeError("rule must be a string rule");
      }
    }

    if (extend !== undefined && !util.isString(extend)) {
      throw new TypeError("extend must be a string");
    }

    this.type = getFieldType(type);
    this.rule = rule && rule !== "optional" ? rule : undefined;
    this.id = id;
    this.extend = extend || undefined;
    this.required = rule === "required";
    this.optional = !this.required;
    this.repeated = rule === "repeated";
    this.map = false;
    this.comment = comment;
  }

  resolve(): FieldDefinition {
    super.resolve();
    ResolveType(this.type, this.parent);
    return this;
  }

  toJson(): Record<string, unknown> {
    const json = super.toJson();
    const keys = [
      "id",
      "type",
      "rule",
      "required",
      "optional",
      "repeated",
      "map",
      "keyType",
      "extend",
    ];
    Object.assign(json, copyObject(this as Record<string, unknown>, keys));
    return json;
  }
}

export class MapField extends FieldDefinition {
  keyType: FieldType;

  constructor(
    name: string,
    id: number,
    keyType: string,
    type: string,
    options?: Record<string, unknown>,
    comment?: string
  ) {
    super(name, id, type, undefined, undefined, options, comment);
    this.keyType = getFieldType(keyType);
    this.map = true;
  }
}

export class OneofDefinition extends ReflectionObject {
  oneof: string[];
  fieldsArray: FieldDefinition[];
  comment?: string;

  constructor(
    name: string,
    fieldNames?: string[] | Record<string, unknown>,
    options?: Record<string, unknown>,
    comment?: string
  ) {
    if (!Array.isArray(fieldNames)) {
      options = fieldNames;
      fieldNames = undefined as unknown as string[] | Record<string, unknown>;
    }

    super(name, SyntaxType.OneOfDefinition, options);

    if (!(fieldNames === undefined || Array.isArray(fieldNames))) {
      throw TypeError("fieldNames must be an Array");
    }

    this.oneof = (fieldNames as string[]) || [];
    this.fieldsArray = [];
    this.comment = comment;
  }

  toJson(): Record<string, unknown> {
    const json = super.toJson();
    json.oneof = this.oneof;
    return json;
  }

  add(field: FieldDefinition): this {
    if (!(field instanceof FieldDefinition)) {
      throw TypeError("field must be a Field");
    }

    this.oneof.push(field.name);
    this.fieldsArray.push(field);
    field.partOf = this;
    addFieldsToParent(this);
    return this;
  }

  onAdd(parent: ReflectionObject): void {
    super.onAdd(parent);
    const self = this;

    // Collect present fields
    for (let i = 0; i < this.oneof.length; ++i) {
      if (parent instanceof NamespaceDefinition) {
        const field = parent.get(this.oneof[i]);
        if (field instanceof FieldDefinition) {
          if (field && !field.partOf) {
            field.partOf = self;
            self.fieldsArray.push(field);
          }
        }
      }
    }

    // Add not yet present fields
    addFieldsToParent(this);
  }
}

export class NamespaceDefinition extends ReflectionObject {
  nested?: Record<string, ReflectionObject>;
  reserved?: (string | [number, number])[]; // Add reserved property
  private _nestedArray?: ReflectionObject[] | undefined; // Add _nestedArray property

  constructor(
    name: string,
    type: SyntaxType,
    options?: Record<string, unknown>
  ) {
    super(name, type, options);
    this.nested = undefined;
  }

  add(
    object:
      | FieldDefinition
      | MessageDefinition
      | EnumDefinition
      | ServiceDefinition
      | NamespaceDefinition
      | string,
    id?: number,
    comment?: string
  ): NamespaceDefinition {
    if (
      !(
        (object instanceof FieldDefinition && object.extend !== undefined) ||
        object instanceof MessageDefinition ||
        object instanceof EnumDefinition ||
        object instanceof ServiceDefinition ||
        object instanceof NamespaceDefinition
      )
    ) {
      throw TypeError("object must be a valid nested object");
    }

    if (!this.nested) this.nested = {};
    this.nested[object.name] = object;
    object.onAdd(this);

    return this.clearCache();
  }

  isReservedId(id: number): boolean {
    const { reserved } = this;

    if (reserved) {
      for (let i = 0; i < reserved.length; ++i) {
        const start = reserved[i][0];
        const end = reserved[i][1];
        if (
          typeof start === "number" &&
          typeof end === "number" &&
          start <= id &&
          end >= id
        ) {
          return true;
        }
      }
    }

    return false;
  }

  isReservedName(name: string): boolean {
    const { reserved } = this;

    if (reserved) {
      for (let i = 0; i < reserved.length; ++i) {
        if (reserved[i] === name) {
          return true;
        }
      }
    }

    return false;
  }

  define(path: string | string[]): NamespaceDefinition {
    if (util.isString(path)) {
      path = path.split(".");
    } else if (!Array.isArray(path)) {
      throw TypeError("illegal path");
    }

    if (path && path.length && path[0] === "") {
      throw Error("path must be relative");
    }

    let ptr: NamespaceDefinition = this;
    while (path.length > 0) {
      const part = path.shift() as string;

      if (ptr.nested) {
        const nested = ptr.nested[part];
        if (!(nested instanceof NamespaceDefinition)) {
          throw Error("path conflicts with non-namespace objects");
        }
        ptr = nested;
      } else {
        ptr.add(
          (ptr = new NamespaceDefinition(part, SyntaxType.NamespaceDefinition))
        );
      }
    }
    return ptr;
  }

  get(name: string): ReflectionObject | undefined {
    return this.nested && this.nested[name];
  }

  clearCache(): NamespaceDefinition {
    this._nestedArray = undefined;
    return this;
  }

  resolve(): NamespaceDefinition {
    super.resolve();
    mapResolve(this.nested);
    return this;
  }

  lookup(typeName: string): string | undefined {
    if (!typeName) {
      throw new Error(`a typeName should be specified for '${typeName}'`);
    }

    if (typeName.includes(".")) {
      throw new Error(`the typeName '${typeName}' should not include a dot`);
    }

    // lookup from nested
    if (this.nested && Object.keys(this.nested).length) {
      for (const nested of Object.values(this.nested)) {
        if (
          nested.name === typeName &&
          (nested instanceof MessageDefinition ||
            nested instanceof EnumDefinition)
        ) {
          return nested.getFullName();
        }
      }
    }

    // lookup from parent
    if (this.parent instanceof NamespaceDefinition) {
      return this.parent.lookup(typeName);
    }
    return undefined;
  }

  toJson(): Record<string, unknown> {
    const json = super.toJson.call(this);
    json.syntaxType = this.syntaxType;
    json.nested = mapToJson(this.nested);
    return json;
  }
}

interface IFields {
  [key: string]: FieldDefinition;
}

interface IOneofs {
  [key: string]: OneofDefinition;
}

export class MessageDefinition extends NamespaceDefinition {
  fields: IFields;
  oneofs: IOneofs | undefined;
  extensions: any[] | undefined;
  reserved: any[] | undefined;
  group: any | undefined;
  _fieldsById: Record<number, FieldDefinition> | undefined;
  _fieldsArray: any | undefined;
  _oneofsArray: any | undefined;

  constructor(name: string, options?: Record<string, unknown>) {
    super(name, SyntaxType.MessageDefinition, options);

    this.fields = {};
    this.oneofs = undefined;
    this.extensions = undefined;
    this.reserved = undefined;
    this.group = undefined;
    this._fieldsById = undefined;
    this._fieldsArray = undefined;
    this._oneofsArray = undefined;
  }

  get(
    name: string
  ): FieldDefinition | OneofDefinition | ReflectionObject | undefined {
    return (
      this.fields[name] ||
      (this.oneofs && this.oneofs[name]) ||
      (this.nested && this.nested[name])
    );
  }

  add(
    object: FieldDefinition | OneofDefinition | ReflectionObject | string
  ): NamespaceDefinition {
    if (
      !(
        object instanceof FieldDefinition ||
        object instanceof OneofDefinition ||
        object instanceof NamespaceDefinition
      )
    ) {
      throw TypeError("object must be a valid nested object");
    }
    if (this.get(object.name)) {
      throw Error(`duplicate name '${object.name}' in ${this}`);
    }

    if (object instanceof FieldDefinition && object.extend === undefined) {
      // NOTE: Extension fields aren't actual fields on the declaring type, but nested objects.
      // The root object takes care of adding distinct sister-fields to the respective extended
      // type instead.

      // avoids calling the getter if not absolutely necessary because it's called quite frequently
      if (
        this._fieldsById
          ? this._fieldsById[object.id]
          : this.fieldsById()[object.id]
      ) {
        throw Error(`duplicate id ${object.id} in ${this}`);
      }

      if (this.isReservedId(object.id)) {
        throw Error(`id ${object.id} is reserved in ${this}`);
      }

      if (this.isReservedName(object.name)) {
        throw Error(`name '${object.name}' is reserved in ${this}`);
      }

      // if (object.parent) object.parent.remove(object);
      this.fields[object.name] = object;
      // object.message = this;
      object.onAdd(this);
      return this.clearCache();
    }

    if (object instanceof OneofDefinition) {
      if (!this.oneofs) this.oneofs = {};
      this.oneofs[object.name] = object;
      object.onAdd(this);
      return this.clearCache();
    }

    return super.add(object);
  }

  fieldsById(): Record<number, FieldDefinition> {
    if (this._fieldsById) {
      return this._fieldsById;
    }

    this._fieldsById = {};
    const names = Object.keys(this.fields);
    for (let i = 0; i < names.length; ++i) {
      const field = this.fields[names[i]];
      const { id } = field;

      if (this._fieldsById[id]) {
        throw Error(`duplicate id ${id} in ${this}`);
      }

      this._fieldsById[id] = field;
    }
    return this._fieldsById;
  }

  clearCache(): this {
    this._fieldsById = undefined;
    this._fieldsArray = undefined;
    this._oneofsArray = undefined;
    return this;
  }

  resolve(): NamespaceDefinition {
    mapResolve(this.fields);
    mapResolve(this.oneofs);

    return NamespaceDefinition.prototype.resolve.call(this);
  }

  toJson(): Record<string, unknown> {
    const json = NamespaceDefinition.prototype.toJson.call(this);
    Object.assign(
      json,
      copyObject(this as Record<string, unknown>, [
        "extensions",
        "reserved",
        "group",
      ])
    );
    json.fields = mapToJson(this.fields);
    json.oneofs = mapToJson(this.oneofs);

    return json;
  }
}

interface EnumComments {
  [key: string]: string | undefined;
}

export class EnumDefinition extends NamespaceDefinition {
  valuesById: Record<number, string>;
  values: Record<string, number>;
  comment?: string;
  comments: EnumComments;
  reserved?: Array<string | [number, number]>;

  constructor(
    name: string,
    values?: Record<string, number>,
    options?: Record<string, unknown>,
    comment?: string,
    comments?: EnumComments
  ) {
    super(name, SyntaxType.EnumDefinition, options);

    if (values && typeof values !== "object") {
      throw TypeError("values must be an object");
    }

    this.valuesById = {};
    this.values = Object.create(this.valuesById);
    this.comment = comment;
    this.comments = comments || {};
    this.reserved = undefined;

    if (values) {
      for (let keys = Object.keys(values), i = 0; i < keys.length; ++i) {
        // use forward entries only
        if (typeof values[keys[i]] === "number") {
          this.valuesById[(this.values[keys[i]] = values[keys[i]])] = keys[i];
        }
      }
    }
  }

  add(name: string, id: number, comment?: string): NamespaceDefinition {
    if (!util.isString(name)) {
      throw TypeError("name must be a string");
    }

    if (!util.isInteger(id)) {
      throw TypeError("id must be an integer");
    }

    if (this.values[name] !== undefined) {
      throw Error(`duplicate name '${name}' in ${this}`);
    }

    if (this.isReservedId(id)) {
      throw Error(`id ${id} is reserved in ${this}`);
    }

    if (this.isReservedName(name)) {
      throw Error(`name '${name}' is reserved in ${this}`);
    }

    if (this.valuesById[id] !== undefined) {
      if (!(this.options && this.options.allow_alias)) {
        throw Error(`duplicate id ${id} in ${this}`);
      }

      this.values[name] = id;
    } else {
      this.valuesById[(this.values[name] = id)] = name;
    }

    this.comments[name] = comment;
    return this;
  }

  toJson(): ReturnType<NamespaceDefinition["toJson"]> {
    const json = super.toJson();
    Object.assign(
      json,
      copyObject(this as Record<string, unknown>, ["values", "reserved"])
    );
    return json;
  }
}

export class ServiceDefinition extends NamespaceDefinition {
  methods: { [key: string]: MethodDefinition };
  _methodsArray: MethodDefinition[] | undefined;

  constructor(name: string, options?: Record<string, unknown>) {
    super(name, SyntaxType.ServiceDefinition, options);

    this.methods = {};
    this._methodsArray = undefined;
  }

  add(
    object: ReflectionObject | MethodDefinition | string
  ): NamespaceDefinition {
    if (!(object instanceof ReflectionObject) || !(object instanceof MethodDefinition)) {
      throw TypeError("object must be a valid nested object");
    }
    if (this.get(object.name)) {
      throw Error(`duplicate name '${object.name}' in ${this}`);
    }

    if (object instanceof MethodDefinition) {
      this.methods[object.name] = object;
      object.parent = this;
      return this.clearCache();
    }

    return super.add(object as NamespaceDefinition);
  }

  get(name: string): ReflectionObject | MethodDefinition | undefined {
    return this.methods[name] || super.get(name);
  }

  clearCache(): NamespaceDefinition {
    this._methodsArray = undefined;
    return this;
  }

  resolve(): NamespaceDefinition {
    mapResolve(this.methods);
    return super.resolve();
  }

  toJson(): Record<string, unknown> {
    const json = super.toJson();
    json.methods = mapToJson(this.methods);
    return json;
  }
}

export class MethodDefinition extends ReflectionObject {
  requestType: FieldType;
  requestStream?: boolean;
  responseType: FieldType;
  responseStream?: boolean;
  comment?: string;

  constructor(
    name: string,
    type: string | undefined,
    requestType: string,
    responseType: string,
    requestStream?: boolean | Record<string, unknown>,
    responseStream?: boolean | Record<string, unknown>,
    options?: Record<string, unknown>,
    comment?: string
  ) {
    if (util.isObject(requestStream)) {
      options = requestStream;
      requestStream = undefined;
      responseStream = undefined;
    } else if (util.isObject(responseStream)) {
      options = responseStream;
      responseStream = undefined;
    }

    if (!(type === undefined || util.isString(type))) {
      throw TypeError("type must be a string");
    }

    if (!util.isString(requestType)) {
      throw TypeError("requestType must be a string");
    }

    if (!util.isString(responseType)) {
      throw TypeError("responseType must be a string");
    }

    super(name, SyntaxType.MethodDefinition, options);

    this.requestType = getFieldType(requestType);
    this.requestStream = requestStream ? true : undefined;
    this.responseType = getFieldType(responseType);
    this.responseStream = responseStream ? true : undefined;
    this.comment = comment;
  }

  resolve(): ReflectionObject {
    super.resolve();
    ResolveType(this.requestType, this.parent);
    ResolveType(this.responseType, this.parent);
    return this;
  }

  toJson(): Record<string, unknown> {
    const json = super.toJson();
    Object.assign(
      json as any,
      copyObject(this as Record<string, unknown>, [
        "type",
        "requestType",
        "responseType",
      ])
    );
    return json;
  }
}

export class Root extends NamespaceDefinition {
  constructor(options?: Record<string, unknown>) {
    super("", SyntaxType.ProtoRoot, options);
  }
}

function mapToJson<T extends { toJson(): any }>(
  map: Record<string, T> | undefined
): Record<string, ReturnType<T["toJson"]>> | undefined {
  if (!map) return undefined;
  const object: Record<string, ReturnType<T["toJson"]>> = {};

  Object.keys(map).forEach((key) => {
    object[key] = map[key].toJson();
  });

  return object;
}

function mapResolve(
  map: Record<string, { resolve: () => void }> | undefined
): void {
  if (!map) return;

  Object.values(map).forEach((value) => {
    value.resolve();
  });
}

function addFieldsToParent(oneof: OneofDefinition): void {
  if (oneof.parent) {
    for (let i = 0; i < oneof.fieldsArray.length; ++i) {
      if (!oneof.fieldsArray[i].parent) {
        if (
          oneof.parent instanceof NamespaceDefinition ||
          oneof.parent instanceof OneofDefinition
        ) {
          oneof.parent.add(oneof.fieldsArray[i]);
        }
      }
    }
  }
}

function ResolveType(
  type: FieldType,
  parent: ReflectionObject | undefined,
  weekResolve?: boolean
): any {
  if (parent === undefined) {
    throw new Error("parent should be specified");
  }
  if (type.syntaxType === SyntaxType.Identifier) {
    const { value } = type;
    let resolvedValue: any;
    if (!value.includes(".")) {
      resolvedValue =
        parent instanceof NamespaceDefinition
          ? parent.lookup(value)
          : undefined;
      if (!resolvedValue) {
        if (weekResolve) {
          resolvedValue = value;
        } else {
          throw new Error(`invalid type '${value}'`);
        }
      }
    } else {
      resolvedValue = `.${value}`;
    }

    type.value = resolvedValue;
  }

  return type;
}

function copyObject(
  source: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  const target: Record<string, unknown> = {};
  for (const key of keys) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key];
    }
  }
  return target;
}
