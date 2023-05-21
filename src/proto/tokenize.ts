/* eslint-disable */

interface ITokenizerHandle {
  next: () => string | undefined;
  peek: () => string | undefined;
  push: (token: string) => void;
  skip: (expected: string, optional?: boolean) => boolean;
  cmnt: (trailingLine?: number) => string | undefined;
  line: number;
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
export const tokenize = (source: string): ITokenizerHandle => {
  source = source.toString();

  let offset = 0;
  const { length } = source;
  let line = 1;
  let commentType: string | undefined = undefined;
  let commentText: string | undefined = undefined;
  let commentLine = 0;
  let commentLineEmpty = false;
  let currentCommentUsed = false;

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
  function setComment(start: number, end: number): void {
    commentType = source.charAt(start++);
    commentLine = line;
    commentLineEmpty = false;
    let lookback: number;
    if (source.charAt(start) === commentType) {
      lookback = 2; // alternate comment parsing: "//" or "/*"
    } else {
      lookback = 3; // "///" or "/**"
    }
    let commentOffset = start - lookback;
    let c: string;
    do {
      if (--commentOffset < 0 || (c = source.charAt(commentOffset)) === "\n") {
        commentLineEmpty = true;
        break;
      }
    } while (c === " " || c === "\t");
    const lines = source.substring(start, end).split(setCommentSplitRe);
    
    for (let i = 0; i < lines.length; ++i) {
      lines[i] = lines[i]
        .replace(
          source.charAt(start) === "/" ? setCommentRe : setCommentAltRe,
          ""
        )
        .trim();
    }
    commentText = lines.join("\n").trim();
    console.log(commentText)
    currentCommentUsed = false;
  }

  function isDoubleSlashCommentLine(startOffset: number): boolean {
    const endOffset = findEndOfLine(startOffset);

    // see if remaining line matches comment pattern
    const lineText = source.substring(startOffset, endOffset);
    
    // look for 1 or 2 slashes since startOffset would already point past
    // the first slash that started the comment.
    const isComment =
      /^\s*(\/\/|\/\*)/.test(lineText) && !/^\s*(\/\/|\/\*)\*/.test(lineText);

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
    do {
      if (offset === length) return undefined;
      repeat = false;
      while (whitespaceRe.test((curr = charAt(offset)))) {
        if (curr === "\n") ++line;
        if (++offset === length) return undefined;
      }

      if (charAt(offset) === "/") {
         
        if (++offset === length) {
          throw illegal("comment");
        }
        if (charAt(offset) === "/") {
           
          // Line
          // check for double-slash comments, consolidating consecutive lines
          start = offset;
          isDoc = false;
          if (isDoubleSlashCommentLine(offset)) {
             console.log("isDoubleSlashCommentLine");
            isDoc = true;
            do {
              offset = findEndOfLine(offset);
              if (offset === length) {
                break;
              }
              offset++;
            } while (isDoubleSlashCommentLine(offset));
          } else {
            offset = Math.min(length, findEndOfLine(offset) + 1);
          }
          if (isDoc) {
            setComment(start, offset);
          }
          ++line;
          repeat = true;
        } else if ((curr = charAt(offset)) === "*") {
          // Block
          start = offset + 1;
          isDoc = charAt(start) === "*";
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
            setComment(start, offset - 2);
          }
          repeat = true;
        } else {
          return "/";
        }
      }
    } while (repeat);

    let end = offset;
    delimRe.lastIndex = 0;
    const delim = delimRe.test(charAt(end++));
    if (!delim) while (end < length && !delimRe.test(charAt(end))) ++end;
    const token = source.substring(offset, (offset = end));
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
    if (trailingLine === undefined) {
      if (
        commentLine === line - 1 &&
        (commentType === "*" || commentType === "/" || commentLineEmpty) &&
        !currentCommentUsed
      ) {
        ret = commentText;
        currentCommentUsed = true;
      }
    } else {
      if (commentLine < trailingLine) {
        peek();
      }
      if (
        commentLine === trailingLine &&
        !commentLineEmpty &&
        (commentType === "/" || commentType === "*") &&
        !currentCommentUsed
      ) {
        ret = commentText;
        currentCommentUsed = true;
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
