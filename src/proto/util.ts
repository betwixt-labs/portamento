/**
 * Regular expression to match snake_case substrings.
 */
const camelCaseRe: RegExp = /_([a-z])/g;


/**
 * A frozen empty array used for prototypes.
 */
const emptyArray: ReadonlyArray<unknown> = Object.freeze
  ? Object.freeze([])
  : [];

/**
 * Checks if the given value is an object and not null.
 * @param value The value to check.
 * @returns True if the value is an object and not null, otherwise false.
 */
function isObject(value: unknown): value is object {
  return value !== undefined && value !== null && typeof value === "object";
}

/**
 * Checks if the given value is a string.
 * @param value The value to check.
 * @returns True if the value is a string, otherwise false.
 */
function isString(value: unknown): value is string {
  return (
    typeof value === "string" ||
    value instanceof String
  );
}

/**
 * Checks if the given value is an integer.
 * @param value The value to check.
 * @returns True if the value is an integer, otherwise false.
 */
function isInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.floor(value) === value
  );
}

/**
 * Converts a snake_case string to camelCase.
 * @param str The snake_case string to convert.
 * @returns The converted camelCase string.
 */
function camelCase(str: string): string {
  const mainString: string = str
    .substring(1)
    .replace(camelCaseRe, ($0: string, $1: string) => $1.toUpperCase());
  return str.substring(0, 1) + mainString;
}

/**
 * Converts the first character of a string to lowercase.
 * @param str The string to convert.
 * @returns The string with the first character in lowercase.
 */
function lcFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.substring(1);
}

/**
 * Converts the first character of a string to uppercase.
 * @param str The string to convert.
 * @returns The string with the first character in uppercase.
 */
function ucFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.substring(1);
}

/**
 * Converts a string (be it camelCase or snake_case) to PascalCase.
 * @param str The string to convert.
 * @returns The converted PascalCase string.
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_match, chr) => chr.toUpperCase())
    .replace(/([a-z])([A-Z])/g, (_match, p1, p2) => p1 + p2.toUpperCase())
    .replace(/_([a-z])/g, (_match, p1) => p1.toUpperCase())
    .replace(/^[a-z]/, match => match.toUpperCase());
}

export {
  isObject,
  isString,
  isInteger,
  camelCase,
  lcFirst,
  ucFirst,
  toPascalCase,
  emptyArray,
};
