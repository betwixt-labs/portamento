/**
 * Enum defining the possible syntax types for a field or definition in a Proto file.
 */
enum SyntaxType {
  Undefined = "Undefined",
  BaseType = "BaseType",
  Identifier = "Identifier",
  OneOfDefinition = "OneOfDefinition",
  FieldDefinition = "FieldDefinition",
  MethodDefinition = "MethodDefinition",
  NamespaceDefinition = "NamespaceDefinition",
  MessageDefinition = "MessageDefinition",
  EnumDefinition = "EnumDefinition",
  ServiceDefinition = "ServiceDefinition",
  ProtoRoot = "ProtoRoot",
  ProtoDocument = "ProtoDocument",
  ProtoError = "ProtoError",
}

/**
 * Interface representing the type of a field in a Proto file.
 */
interface FieldType {
  /** The string value of the type. */
  value: string;
  /** The syntax type of the field. */
  syntaxType: SyntaxType.BaseType | SyntaxType.Identifier;
}

/**
 * Given a type string, returns a FieldType object with the appropriate syntax type.
 * @param typeString The string representation of the field type.
 * @returns The FieldType object with the appropriate syntax type.
 */
const getFieldType = (typeString: string): FieldType => {
  const syntaxType: SyntaxType = KeywordTypes.includes(typeString)
    ? SyntaxType.BaseType
    : SyntaxType.Identifier;
  const newType: FieldType = {
    value: typeString,
    syntaxType,
  };

  return newType;
};

/**
 * An array of all the possible keyword types in a Proto file.
 */
const KeywordTypes: string[] = [
  "double",
  "float",
  "int32",
  "int64",
  "uint32",
  "uint64",
  "sint32",
  "sint64",
  "fixed32",
  "fixed64",
  "sfixed32",
  "sfixed64",
  "bool",
  "string",
  "bytes",
];

export { SyntaxType, getFieldType, FieldType };
