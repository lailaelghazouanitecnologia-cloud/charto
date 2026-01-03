/**
 * MMS Scripting Language Tokenizer
 * Provides syntax highlighting for the scripting console.
 */

export interface Token {
    type: "comment" | "keyword" | "technical" | "string" | "number" | "operator" | "text";
    value: string;
}

export const KEYWORDS = new Set([
    "if", "else", "const", "let", "var", "return", "for", "while",
    "function", "true", "false", "null", "undefined", "break", "continue"
]);

export const TECHNICALS = new Set([
    "@sma", "@ema", "@rsi", "@macd", "@bbands", "@atr", "@stoch",
    "@query", "@print", "@alert", "@signal", "@plot", "@volume",
    "@high", "@low", "@open", "@close", "@vwap", "@adx", "@cci",
    "@obv", "@mfi", "@williams", "@psar", "@ichimoku"
]);

export function tokenize(code: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < code.length) {
        // Comment.
        if (code[i] === "/" && code[i + 1] === "/") {
            let end = code.indexOf("\n", i);
            if (end === -1) end = code.length;
            tokens.push({ type: "comment", value: code.slice(i, end) });
            i = end;
            continue;
        }

        // String.
        if (code[i] === '"' || code[i] === "'") {
            const quote = code[i];
            let end = i + 1;
            while (end < code.length && code[end] !== quote) {
                if (code[end] === "\\") end++;
                end++;
            }
            tokens.push({ type: "string", value: code.slice(i, end + 1) });
            i = end + 1;
            continue;
        }

        // Technical indicator (@ prefix).
        if (code[i] === "@") {
            let end = i + 1;
            while (end < code.length && /[a-zA-Z_]/.test(code[end]!)) end++;
            const word = code.slice(i, end);
            tokens.push({ type: TECHNICALS.has(word) ? "technical" : "text", value: word });
            i = end;
            continue;
        }

        // Word (keyword or identifier).
        if (/[a-zA-Z_]/.test(code[i]!)) {
            let end = i;
            while (end < code.length && /[a-zA-Z0-9_]/.test(code[end]!)) end++;
            const word = code.slice(i, end);
            tokens.push({ type: KEYWORDS.has(word) ? "keyword" : "text", value: word });
            i = end;
            continue;
        }

        // Number.
        if (/[0-9]/.test(code[i]!) || (code[i] === "." && /[0-9]/.test(code[i + 1] ?? ""))) {
            let end = i;
            while (end < code.length && /[0-9.]/.test(code[end]!)) end++;
            tokens.push({ type: "number", value: code.slice(i, end) });
            i = end;
            continue;
        }

        // Operators.
        if (/[+\-*/<>=!&|{}()[\],;:]/.test(code[i]!)) {
            tokens.push({ type: "operator", value: code[i]! });
            i++;
            continue;
        }

        // Other (whitespace, etc.).
        tokens.push({ type: "text", value: code[i]! });
        i++;
    }

    return tokens;
}

export const TOKEN_COLORS: Record<Token["type"], string> = {
    comment: "#555555",
    keyword: "#c678dd",
    technical: "#22c55e",
    string: "#e5c07b",
    number: "#d19a66",
    operator: "#56b6c2",
    text: "#888888",
};

export const DEFAULT_SCRIPT = `// MMS Scripting Console
// Ctrl+Enter to run

const price = @query("BTC/USD")
const sma = @sma(price, 20)

if price > sma {
    @print("Bullish trend")
} else {
    @print("Bearish trend")
}`;
