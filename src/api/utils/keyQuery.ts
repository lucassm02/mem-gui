type Token =
  | { type: "paren"; value: "(" | ")" }
  | {
      type: "operator";
      value: "=" | "!=" | ">" | ">=" | "<" | "<=";
    }
  | { type: "identifier"; value: string }
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "regex"; value: { source: string; flags: string } };

type ComparisonOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "match"
  | "contains"
  | "startswith"
  | "endswith";

type Literal =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "null"; value: null }
  | { kind: "regex"; value: RegExp };

type ValueType = "number" | "string" | "boolean" | "null" | "json";

export type KeyQueryPredicate =
  | {
      kind: "key" | "value";
      operator: ComparisonOperator;
      literal: Literal;
    }
  | {
      kind: "type";
      valueType: ValueType;
    };

export type KeyQueryFilter =
  | { type: "and"; left: KeyQueryFilter; right: KeyQueryFilter }
  | { type: "or"; left: KeyQueryFilter; right: KeyQueryFilter }
  | { type: "not"; expr: KeyQueryFilter }
  | { type: "predicate"; predicate: KeyQueryPredicate };

export type KeyQueryOrder = {
  field: "key" | "value";
  direction: "asc" | "desc";
};

export type KeyQueryAst = {
  filter?: KeyQueryFilter;
  orderBy?: KeyQueryOrder;
  limit?: number;
  offset?: number;
};

type ParseResult =
  | { query: KeyQueryAst; error?: undefined }
  | { error: string };

const RESERVED_WORDS = new Set([
  "and",
  "or",
  "not",
  "key",
  "value",
  "type",
  "order",
  "by",
  "limit",
  "offset",
  "asc",
  "desc",
  "match",
  "contains",
  "startswith",
  "endswith"
]);

const NUMERIC_RE = /^-?\d+(?:\.\d+)?$/;

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;

  const isWhitespace = (char: string) => /\s/.test(char);
  const isDigit = (char: string) => /[0-9]/.test(char);
  const isAlpha = (char: string) => /[A-Za-z_]/.test(char);

  while (index < input.length) {
    const char = input[index];
    if (isWhitespace(char)) {
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === "!" || char === "<" || char === ">" || char === "=") {
      const next = input[index + 1];
      if (next === "=" && (char === "!" || char === "<" || char === ">")) {
        tokens.push({
          type: "operator",
          value: `${char}${next}` as Token["value"]
        });
        index += 2;
        continue;
      }
      if (char === "=") {
        tokens.push({ type: "operator", value: "=" });
        index += 1;
        continue;
      }
      if (char === "!" && next !== "=") {
        throw new Error("Invalid operator");
      }
      tokens.push({ type: "operator", value: char as Token["value"] });
      index += 1;
      continue;
    }

    if (char === "/" && input[index + 1]) {
      let cursor = index + 1;
      let escaped = false;
      let source = "";
      for (; cursor < input.length; cursor += 1) {
        const current = input[cursor];
        if (escaped) {
          source += current;
          escaped = false;
          continue;
        }
        if (current === "\\") {
          source += current;
          escaped = true;
          continue;
        }
        if (current === "/") {
          break;
        }
        source += current;
      }
      if (cursor >= input.length) {
        throw new Error("Unterminated regex");
      }
      let flags = "";
      cursor += 1;
      while (cursor < input.length && /[a-z]/i.test(input[cursor])) {
        flags += input[cursor];
        cursor += 1;
      }
      tokens.push({ type: "regex", value: { source, flags } });
      index = cursor;
      continue;
    }

    if (char === "'" || char === '"') {
      const quote = char;
      let cursor = index + 1;
      let value = "";
      let escaped = false;
      for (; cursor < input.length; cursor += 1) {
        const current = input[cursor];
        if (escaped) {
          value += current;
          escaped = false;
          continue;
        }
        if (current === "\\") {
          escaped = true;
          continue;
        }
        if (current === quote) {
          break;
        }
        value += current;
      }
      if (cursor >= input.length) {
        throw new Error("Unterminated string");
      }
      tokens.push({ type: "string", value });
      index = cursor + 1;
      continue;
    }

    if (char === "-" || isDigit(char)) {
      const match = /^-?\d+(?:\.\d+)?/.exec(input.slice(index));
      if (!match) {
        throw new Error("Invalid number");
      }
      tokens.push({ type: "number", value: Number(match[0]) });
      index += match[0].length;
      continue;
    }

    if (isAlpha(char)) {
      const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(input.slice(index));
      if (!match) {
        throw new Error("Invalid identifier");
      }
      tokens.push({ type: "identifier", value: match[0] });
      index += match[0].length;
      continue;
    }

    throw new Error("Invalid character");
  }

  return tokens;
};

const splitTokens = (tokens: Token[]) => {
  let depth = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === "paren") {
      depth += token.value === "(" ? 1 : -1;
      continue;
    }
    if (depth === 0 && token.type === "identifier") {
      const value = token.value.toLowerCase();
      if (value === "order" || value === "limit") {
        return {
          filterTokens: tokens.slice(0, i),
          restTokens: tokens.slice(i)
        };
      }
    }
  }
  return { filterTokens: tokens, restTokens: [] };
};

class Parser {
  private tokens: Token[];
  private index = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseExpression(): KeyQueryFilter {
    return this.parseOr();
  }

  private parseOr(): KeyQueryFilter {
    let node = this.parseAnd();
    while (this.matchIdentifier("or")) {
      const right = this.parseAnd();
      node = { type: "or", left: node, right };
    }
    return node;
  }

  private parseAnd(): KeyQueryFilter {
    let node = this.parseNot();
    while (this.matchIdentifier("and")) {
      const right = this.parseNot();
      node = { type: "and", left: node, right };
    }
    return node;
  }

  private parseNot(): KeyQueryFilter {
    if (this.matchIdentifier("not")) {
      return { type: "not", expr: this.parseNot() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): KeyQueryFilter {
    if (this.matchParen("(")) {
      const node = this.parseExpression();
      if (!this.matchParen(")")) {
        throw new Error("Unbalanced parentheses");
      }
      return node;
    }
    return this.parsePredicate();
  }

  private parsePredicate(): KeyQueryFilter {
    const token = this.peek();
    if (!token || token.type !== "identifier") {
      throw new Error("Invalid predicate");
    }

    const keyword = token.value.toLowerCase();
    this.consume();

    if (keyword === "type") {
      const next = this.expectIdentifier();
      if (next !== "value") {
        throw new Error("Invalid type predicate");
      }
      const operator = this.expectOperator();
      if (operator !== "=") {
        throw new Error("Invalid type operator");
      }
      const typeName = this.expectIdentifier();
      if (
        typeName !== "number" &&
        typeName !== "string" &&
        typeName !== "boolean" &&
        typeName !== "null" &&
        typeName !== "json"
      ) {
        throw new Error("Invalid type");
      }
      return {
        type: "predicate",
        predicate: { kind: "type", valueType: typeName }
      };
    }

    if (keyword !== "key" && keyword !== "value") {
      throw new Error("Invalid predicate");
    }

    const operator = this.parseComparator();
    const literal = this.parseLiteral();

    if (keyword === "key") {
      if (
        operator === ">" ||
        operator === ">=" ||
        operator === "<" ||
        operator === "<="
      ) {
        throw new Error("Invalid operator for key");
      }
    }

    if (
      literal.kind === "regex" &&
      operator !== "match" &&
      operator !== "contains" &&
      operator !== "startswith" &&
      operator !== "endswith"
    ) {
      throw new Error("Regex predicates require match");
    }

    return {
      type: "predicate",
      predicate: {
        kind: keyword,
        operator,
        literal
      }
    };
  }

  private parseComparator(): ComparisonOperator {
    const token = this.peek();
    if (!token) {
      throw new Error("Missing operator");
    }

    if (token.type === "operator") {
      this.consume();
      return token.value;
    }

    if (token.type === "identifier") {
      const value = token.value.toLowerCase();
      if (
        value === "match" ||
        value === "contains" ||
        value === "startswith" ||
        value === "endswith"
      ) {
        this.consume();
        return value;
      }
    }

    throw new Error("Invalid operator");
  }

  private parseLiteral(): Literal {
    const token = this.peek();
    if (!token) {
      throw new Error("Missing literal");
    }

    if (token.type === "number") {
      this.consume();
      return { kind: "number", value: token.value };
    }

    if (token.type === "string") {
      this.consume();
      return { kind: "string", value: token.value };
    }

    if (token.type === "regex") {
      this.consume();
      try {
        const compiled = new RegExp(token.value.source, token.value.flags);
        return { kind: "regex", value: compiled };
      } catch {
        throw new Error("Invalid regex");
      }
    }

    if (token.type === "identifier") {
      const value = token.value.toLowerCase();
      if (value === "true" || value === "false") {
        this.consume();
        return { kind: "boolean", value: value === "true" };
      }
      if (value === "null") {
        this.consume();
        return { kind: "null", value: null };
      }
      if (RESERVED_WORDS.has(value)) {
        throw new Error("Invalid literal");
      }
      this.consume();
      return { kind: "string", value: token.value };
    }

    throw new Error("Invalid literal");
  }

  expectOperator(): Token["value"] {
    const token = this.consume();
    if (!token || token.type !== "operator") {
      throw new Error("Operador ausente");
    }
    return token.value;
  }

  expectIdentifier(): string {
    const token = this.consume();
    if (!token || token.type !== "identifier") {
      throw new Error("Identificador ausente");
    }
    return token.value.toLowerCase();
  }

  matchIdentifier(expected: string): boolean {
    const token = this.peek();
    if (
      token?.type === "identifier" &&
      token.value.toLowerCase() === expected
    ) {
      this.consume();
      return true;
    }
    return false;
  }

  matchParen(value: "(" | ")"): boolean {
    const token = this.peek();
    if (token?.type === "paren" && token.value === value) {
      this.consume();
      return true;
    }
    return false;
  }

  peek(): Token | undefined {
    return this.tokens[this.index];
  }

  consume(): Token | undefined {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  hasRemaining(): boolean {
    return this.index < this.tokens.length;
  }
}

export const parseKeyQuery = (input: string): ParseResult => {
  if (!input.trim()) {
    return { query: {} };
  }

  try {
    const tokens = tokenize(input);
    const { filterTokens, restTokens } = splitTokens(tokens);
    const query: KeyQueryAst = {};

    if (filterTokens.length > 0) {
      const parser = new Parser(filterTokens);
      query.filter = parser.parseExpression();
      if (parser.hasRemaining()) {
        throw new Error("Invalid filter");
      }
    }

    if (restTokens.length > 0) {
      const parser = new Parser(restTokens);
      while (parser.hasRemaining()) {
        if (parser.matchIdentifier("order")) {
          if (query.orderBy) {
            throw new Error("Duplicate order clause");
          }
          if (!parser.matchIdentifier("by")) {
            throw new Error("Invalid order clause");
          }
          const field = parser.expectIdentifier();
          if (field !== "key" && field !== "value") {
            throw new Error("Invalid order field");
          }
          let direction: "asc" | "desc" = "asc";
          if (parser.matchIdentifier("asc")) {
            direction = "asc";
          } else if (parser.matchIdentifier("desc")) {
            direction = "desc";
          }
          query.orderBy = { field, direction };
          continue;
        }

        if (parser.matchIdentifier("limit")) {
          if (query.limit !== undefined) {
            throw new Error("Duplicate limit clause");
          }
          const limitToken = parser.consume();
          if (!limitToken || limitToken.type !== "number") {
            throw new Error("Invalid limit");
          }
          if (!Number.isFinite(limitToken.value) || limitToken.value <= 0) {
            throw new Error("Invalid limit");
          }
          if (!Number.isInteger(limitToken.value)) {
            throw new Error("Limit must be an integer");
          }
          query.limit = limitToken.value;

          if (parser.matchIdentifier("offset")) {
            const offsetToken = parser.consume();
            if (!offsetToken || offsetToken.type !== "number") {
              throw new Error("Invalid offset");
            }
            if (!Number.isFinite(offsetToken.value) || offsetToken.value < 0) {
              throw new Error("Invalid offset");
            }
            if (!Number.isInteger(offsetToken.value)) {
              throw new Error("Offset must be an integer");
            }
            query.offset = offsetToken.value;
          }
          continue;
        }

        throw new Error("Invalid query");
      }
    }

    return { query };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query invalida";
    return { error: message };
  }
};

const isNumericValue = (value: string) => NUMERIC_RE.test(value.trim());

const parseNumericValue = (value: string): number | null => {
  const trimmed = value.trim();
  if (!isNumericValue(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveLiteralAsString = (literal: Literal): string => {
  switch (literal.kind) {
    case "number":
      return String(literal.value);
    case "boolean":
      return literal.value ? "true" : "false";
    case "null":
      return "null";
    case "regex":
      return literal.value.source;
    case "string":
    default:
      return literal.value;
  }
};

const resolveValueType = (value: string): ValueType => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "string";
  }
  if (isNumericValue(trimmed)) {
    return "number";
  }
  if (trimmed === "true" || trimmed === "false") {
    return "boolean";
  }
  if (trimmed === "null") {
    return "null";
  }
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        return "json";
      }
    } catch {
      return "string";
    }
  }
  return "string";
};

const evaluateKeyPredicate = (
  key: string,
  operator: ComparisonOperator,
  literal: Literal
) => {
  const target = resolveLiteralAsString(literal);
  switch (operator) {
    case "=":
      return key === target;
    case "!=":
      return key !== target;
    case "match":
      if (literal.kind === "regex") {
        return literal.value.test(key);
      }
      return new RegExp(target).test(key);
    case "contains":
      return key.includes(target);
    case "startswith":
      return key.startsWith(target);
    case "endswith":
      return key.endsWith(target);
    default:
      return false;
  }
};

const evaluateValuePredicate = (
  value: string,
  operator: ComparisonOperator,
  literal: Literal
) => {
  if (operator === "match") {
    if (literal.kind === "regex") {
      return literal.value.test(value);
    }
    return new RegExp(resolveLiteralAsString(literal)).test(value);
  }

  if (
    operator === "contains" ||
    operator === "startswith" ||
    operator === "endswith"
  ) {
    const target = resolveLiteralAsString(literal);
    if (operator === "contains") {
      return value.includes(target);
    }
    if (operator === "startswith") {
      return value.startsWith(target);
    }
    return value.endsWith(target);
  }

  if (
    operator === ">" ||
    operator === ">=" ||
    operator === "<" ||
    operator === "<="
  ) {
    const left = parseNumericValue(value);
    const right =
      literal.kind === "number"
        ? literal.value
        : parseNumericValue(resolveLiteralAsString(literal));
    if (left === null || right === null) {
      return false;
    }
    if (operator === ">") return left > right;
    if (operator === ">=") return left >= right;
    if (operator === "<") return left < right;
    return left <= right;
  }

  if (literal.kind === "number") {
    const left = parseNumericValue(value);
    if (left === null) {
      return operator === "!=";
    }
    return operator === "=" ? left === literal.value : left !== literal.value;
  }

  if (literal.kind === "boolean") {
    const normalized = value.trim().toLowerCase();
    const boolValue =
      normalized === "true" ? true : normalized === "false" ? false : null;
    if (boolValue === null) {
      return operator === "!=";
    }
    return operator === "="
      ? boolValue === literal.value
      : boolValue !== literal.value;
  }

  if (literal.kind === "null") {
    const isNullValue = value.trim() === "null";
    return operator === "=" ? isNullValue : !isNullValue;
  }

  const target = resolveLiteralAsString(literal);
  return operator === "=" ? value === target : value !== target;
};

export const evaluateKeyQuery = (
  filter: KeyQueryFilter | undefined,
  context: { key: string; value: string }
): boolean => {
  if (!filter) {
    return true;
  }

  const evaluate = (node: KeyQueryFilter): boolean => {
    switch (node.type) {
      case "and":
        return evaluate(node.left) && evaluate(node.right);
      case "or":
        return evaluate(node.left) || evaluate(node.right);
      case "not":
        return !evaluate(node.expr);
      case "predicate":
        if (node.predicate.kind === "type") {
          return resolveValueType(context.value) === node.predicate.valueType;
        }
        if (node.predicate.kind === "key") {
          return evaluateKeyPredicate(
            context.key,
            node.predicate.operator,
            node.predicate.literal
          );
        }
        return evaluateValuePredicate(
          context.value,
          node.predicate.operator,
          node.predicate.literal
        );
      default:
        return false;
    }
  };

  return evaluate(filter);
};

export const evaluateKeyQueryKeyOnly = (
  filter: KeyQueryFilter | undefined,
  key: string
): boolean | null => {
  if (!filter) {
    return true;
  }

  const evaluate = (node: KeyQueryFilter): boolean | null => {
    switch (node.type) {
      case "and": {
        const left = evaluate(node.left);
        if (left === false) return false;
        const right = evaluate(node.right);
        if (right === false) return false;
        if (left === true && right === true) return true;
        return null;
      }
      case "or": {
        const left = evaluate(node.left);
        if (left === true) return true;
        const right = evaluate(node.right);
        if (right === true) return true;
        if (left === false && right === false) return false;
        return null;
      }
      case "not": {
        const inner = evaluate(node.expr);
        if (inner === null) return null;
        return !inner;
      }
      case "predicate":
        if (node.predicate.kind === "key") {
          return evaluateKeyPredicate(
            key,
            node.predicate.operator,
            node.predicate.literal
          );
        }
        return null;
      default:
        return null;
    }
  };

  return evaluate(filter);
};

export const inferValueOrderMode = (
  filter: KeyQueryFilter | undefined
): "number" | "string" => {
  if (!filter) {
    return "string";
  }

  const hasNumericPredicate = (node: KeyQueryFilter): boolean => {
    switch (node.type) {
      case "and":
      case "or":
        return (
          hasNumericPredicate(node.left) || hasNumericPredicate(node.right)
        );
      case "not":
        return hasNumericPredicate(node.expr);
      case "predicate":
        if (node.predicate.kind === "type") {
          return node.predicate.valueType === "number";
        }
        if (node.predicate.kind === "value") {
          const op = node.predicate.operator;
          if (op === ">" || op === ">=" || op === "<" || op === "<=") {
            return true;
          }
          if (
            (op === "=" || op === "!=") &&
            node.predicate.literal.kind === "number"
          ) {
            return true;
          }
        }
        return false;
      default:
        return false;
    }
  };

  return hasNumericPredicate(filter) ? "number" : "string";
};
