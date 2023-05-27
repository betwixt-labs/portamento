/* eslint-disable */

interface ITokenizerHandle {
  next: () => string | undefined;
  peek: () => string | undefined;
  push: (token: string) => void;
  skip: (expected: string, optional?: boolean) => boolean;
  cmnt: (trailingLine?: number) => string | undefined;
  line: number;
}

interface IComment {
  type: string;
  lineEmpty: boolean;
  leading: boolean;
  text: string;
}

const delimRe: RegExp = /[\s{}=;:[\],'"()<>]/g;
const stringDoubleRe: RegExp = /(?:"([^"\\]*(?:\\.[^"\\]*)*)")/g;
const stringSingleRe: RegExp = /(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g;

const setCommentRe: RegExp = /^ *[*/]+ */;
const setCommentAltRe: RegExp = /^\s*\*?\/*/;
const setCommentSplitRe: RegExp = /\n/g;
const whitespaceRe: RegExp = /\s/;
const unescapeRe: RegExp = /\\(.?)/g;

const unescapeMap: Record<string, string> = {
  "0": "\0",
  r: "\r",
  n: "\n",
  t: "\t",
};

/**
 * Unescapes a string.
 * @param {string} str String to unescape
 * @returns {string} Unescaped string
 * @property {Object.<string,string>} map Special characters map
 * @memberof tokenize
 */
function unescapeString(str: string): string {
  return str.replace(unescapeRe, ($0: string, $1: string): string => {
    /* istanbul ignore next */
    switch ($1) {
      case "\\":
      case "":
        return $1;
      default:
        return unescapeMap[$1] || "";
    }
  });
}

function isDoubleSlashCommentLine(
  startOffset: number,
  source: string
): boolean {
  const endOffset = findEndOfLine(startOffset, source);

  // see if remaining line matches comment pattern
  const lineText = source.substring(startOffset, endOffset);
  // look for 1 or 2 slashes since startOffset would already point past
  // the first slash that started the comment.
  const isComment = /^\s*\/{1,2}/.test(lineText) && !/^\s*\/\*/.test(lineText);
  return isComment;
}

function findEndOfLine(cursor: number, source: string): number {
  // find end of cursor's line
  let endOffset = cursor;
  while (endOffset < source.length && source.charAt(endOffset) !== "\n") {
    endOffset++;
  }
  return endOffset;
}

/**
 * Tokenizes the given .proto source and returns an object with useful utility functions.
 * @param {string} source Source contents
 * @returns {ITokenizerHandle} Tokenizer handle
 */
export const tokenize = (
  source: string,
  alternateCommentMode: boolean
): ITokenizerHandle => {
  source = source.toString();

  let offset = 0;
  const { length } = source;
  let line = 1;
  let comments: Record<string, IComment> = {};
  let lastCommentLine = 0;

  const stack: string[] = [];

  let stringDelim: string | undefined = undefined;

  /**
   * Creates an error for illegal syntax.
   * @param {string} subject Subject
   * @returns {Error} Error created
   * @inner
   */
  function illegal(subject: string): Error {
    const message = `illegal ${subject}`;
    const err = new Error(message);
    (err as any).line = line;
    return err;
  }

  /**
   * Reads a string till its end.
   * @returns {string} String read
   * @inner
   */
  function readString(): string {
    const re = stringDelim === "'" ? stringSingleRe : stringDoubleRe;
    re.lastIndex = offset - 1;
    const match = re.exec(source);
    if (!match) throw illegal("string");
    offset = re.lastIndex;
    push(stringDelim as string);
    stringDelim = undefined;
    return unescapeString(match[1]);
  }

  /**
   * Gets the character at `pos` within the source.
   * @param {number} pos Position
   * @returns {string} Character
   * @inner
   */
  function charAt(pos: number): string {
    return source.charAt(pos);
  }

  /**
   * Sets the current comment text.
   * @param {number} start Start offset
   * @param {number} end End offset
   * @returns {undefined}
   * @inner
   */
  function setComment(start: number, end: number, isLeading: boolean): void {
    var comment: IComment = {
      type: source.charAt(start++),
      lineEmpty: false,
      leading: isLeading,
      text: "",
    };
    var lookback;
    if (alternateCommentMode) {
      lookback = 2; // alternate comment parsing: "//" or "/*"
    } else {
      lookback = 3; // "///" or "/**"
    }
    var commentOffset = start - lookback,
      c;
    do {
      if (--commentOffset < 0 || (c = source.charAt(commentOffset)) === "\n") {
        comment.lineEmpty = true;
        break;
      }
    } while (c === " " || c === "\t");
    var lines = source.substring(start, end).split(setCommentSplitRe);
    for (var i = 0; i < lines.length; ++i)
      lines[i] = lines[i]
        .replace(alternateCommentMode ? setCommentAltRe : setCommentRe, "")
        .trim();
    comment.text = lines.join("\n").trim();

    comments[line] = comment;
    lastCommentLine = line;
  }

  function isDoubleSlashCommentLine(startOffset: number): boolean {
    var endOffset = findEndOfLine(startOffset);

    // see if remaining line matches comment pattern
    var lineText = source.substring(startOffset, endOffset);
    // look for 1 or 2 slashes since startOffset would already point past
    // the first slash that started the comment.
    var isComment = /^\s*\/{1,2}/.test(lineText);
    return isComment;
  }

  function findEndOfLine(cursor: number): number {
    // find end of cursor's line
    let endOffset = cursor;
    while (endOffset < length && charAt(endOffset) !== "\n") {
      endOffset++;
    }
    return endOffset;
  }

  /**
   * Obtains the next token.
   * @returns {string|undefined} Next token or `undefined` on eof
   * @inner
   */
  function next(): string | undefined {
    if (stack.length > 0) return stack.shift() as string;
    if (stringDelim) return readString();
    let repeat: boolean;
    let prev: string;
    let curr: string;
    let start: number;
    let isDoc: boolean;
    let isLeadingComment = offset === 0;
    do {
      if (offset === length) return undefined;
      repeat = false;
      while (whitespaceRe.test((curr = charAt(offset)))) {
        if (curr === "\n") {
          isLeadingComment = true;
          ++line;
        }
        if (++offset === length) return undefined;
      }

      if (charAt(offset) === "/") {
        if (++offset === length) {
          throw illegal("comment");
        }
        if (charAt(offset) === "/") {
          if (!alternateCommentMode) {
            // check for triple-slash comment
            isDoc = charAt((start = offset + 1)) === "/";

            while (charAt(++offset) !== "\n") {
              if (offset === length) {
                return undefined;
              }
            }
            ++offset;
            if (isDoc) {
              setComment(start, offset - 1, isLeadingComment);
              // Trailing comment cannot not be multi-line,
              // so leading comment state should be reset to handle potential next comments
              isLeadingComment = true;
            }
            ++line;
            repeat = true;
          } else {
            // check for double-slash comments, consolidating consecutive lines
            start = offset;
            isDoc = false;
            if (isDoubleSlashCommentLine(offset)) {
              isDoc = true;
              do {
                offset = findEndOfLine(offset);
                if (offset === length) {
                  break;
                }
                offset++;
                if (!isLeadingComment) {
                  // Trailing comment cannot not be multi-line
                  break;
                }
              } while (isDoubleSlashCommentLine(offset));
            } else {
              offset = Math.min(length, findEndOfLine(offset) + 1);
            }
            if (isDoc) {
              setComment(start, offset, isLeadingComment);
              isLeadingComment = true;
            }
            line++;
            repeat = true;
          }
        } else if ((curr = charAt(offset)) === "*") {
          // Block
          start = offset + 1;
          isDoc = alternateCommentMode || charAt(start) === "*";
          do {
            if (curr === "\n") {
              ++line;
            }
            if (++offset === length) {
              throw illegal("comment");
            }
            prev = curr;
            curr = charAt(offset);
          } while (prev !== "*" || curr !== "/");
          ++offset;
          if (isDoc) {
            setComment(start, offset - 2, isLeadingComment);
            isLeadingComment = true;
          }
          repeat = true;
        } else {
          return "/";
        }
      }
    } while (repeat);
    // offset !== length if we got here
    var end = offset;
    delimRe.lastIndex = 0;
    var delim = delimRe.test(charAt(end++));
    if (!delim) while (end < length && !delimRe.test(charAt(end))) ++end;
    var token = source.substring(offset, (offset = end));
    if (token === '"' || token === "'") stringDelim = token;
    return token;
  }

  /**
   * Pushes a token back to the stack.
   * @param {string} token Token
   * @returns {undefined}
   * @inner
   */
  function push(token: string): void {
    stack.push(token);
  }

  /**
   * Peeks for the next token.
   * @returns {string|undefined} Token or `undefined` on eof
   * @inner
   */
  function peek(): string | undefined {
    if (stack.length === 0) {
      const token = next();
      if (token === undefined) return undefined;
      push(token);
    }
    return stack[0];
  }

  /**
   * Skips a token.
   * @param {string} expected Expected token
   * @param {boolean} [optional=false] Whether the token is optional
   * @returns {boolean} `true` when skipped, `false` if not
   * @throws {Error} When a required token is not present
   * @inner
   */
  function skip(expected: string, optional = false): boolean {
    const actual = peek();
    const equals = actual === expected;
    if (equals) {
      next();
      return true;
    }
    if (!optional) throw illegal(`token '${actual}', '${expected}' expected`);
    return false;
  }

  /**
   * Gets a comment.
   * @param {number} [trailingLine] Line number if looking for a trailing comment
   * @returns {string|undefined} Comment text
   * @inner
   */
  function cmnt(trailingLine?: number): string | undefined {
    let ret: string | undefined = undefined;
    var comment;
    if (trailingLine === undefined) {
      comment = comments[line - 1];
      delete comments[line - 1];
      if (
        comment &&
        (alternateCommentMode || comment.type === "*" || comment.lineEmpty)
      ) {
        ret = comment.leading ? comment.text : undefined;
      }
    } else {
      if (lastCommentLine < trailingLine) {
        peek();
      }
      comment = comments[trailingLine];
      delete comments[trailingLine];
      if (
        comment &&
        !comment.lineEmpty &&
        (alternateCommentMode || comment.type === "/")
      ) {
        ret = comment.leading ? undefined : comment.text;
      }
    }
    return ret;
  }

  return {
    next,
    peek,
    push,
    skip,
    cmnt,
    get line() {
      return line;
    },
  };
};
