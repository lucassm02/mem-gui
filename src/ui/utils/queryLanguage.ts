import { StreamLanguage } from "@codemirror/language";
import type { StringStream } from "@codemirror/stream-parser";

const KEYWORDS = new Set([
  "and",
  "or",
  "not",
  "key",
  "value",
  "ttl",
  "type",
  "order",
  "by",
  "limit",
  "offset",
  "asc",
  "desc",
  "in",
  "match",
  "contains",
  "startswith",
  "endswith"
]);

const TYPE_WORDS = new Set(["number", "string", "boolean", "json"]);
const LITERAL_WORDS = new Set(["true", "false", "null"]);

const readRegex = (stream: StringStream) => {
  stream.next();
  let escaped = false;
  while (!stream.eol()) {
    const char = stream.next();
    if (!char) break;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "/") {
      break;
    }
  }
  stream.eatWhile(/[a-z]/i);
};

const readString = (stream: StringStream) => {
  const quote = stream.next();
  let escaped = false;
  while (!stream.eol()) {
    const char = stream.next();
    if (!char) break;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === quote) {
      break;
    }
  }
};

export const queryLanguage = StreamLanguage.define({
  token(stream: StringStream) {
    if (stream.eatSpace()) {
      return null;
    }

    const peek = stream.peek();
    if (peek === "(" || peek === ")") {
      stream.next();
      return "bracket";
    }

    if (peek === "/" && !stream.match("//", false)) {
      readRegex(stream);
      return "regexp";
    }

    if (peek === "'" || peek === '"') {
      readString(stream);
      return "string";
    }

    if (stream.match(/-?\d+(?:\.\d+)?/)) {
      return "number";
    }

    if (stream.match(/!=|>=|<=|=|<|>/)) {
      return "operator";
    }

    if (stream.match(/[A-Za-z_][A-Za-z0-9_]*/)) {
      const word = stream.current().toLowerCase();
      if (KEYWORDS.has(word)) {
        return "keyword";
      }
      if (TYPE_WORDS.has(word)) {
        return "typeName";
      }
      if (LITERAL_WORDS.has(word)) {
        return "atom";
      }
      return "variableName";
    }

    stream.next();
    return null;
  }
});
