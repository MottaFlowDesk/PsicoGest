import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TEXT_PREFIX = "enc:v1:";
const MISSING_KEY_PLACEHOLDER =
    "[Conteúdo cifrado. Configure RECORDS_ENCRYPTION_KEY.]";

type JsonEnvelope = {
    __enc: 1;
    alg: typeof ALGORITHM;
    iv: string;
    tag: string;
    data: string;
};

function parseKey(): Buffer | null {
    const raw = process.env.RECORDS_ENCRYPTION_KEY?.trim();
    if (!raw) return null;

    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
        return Buffer.from(raw, "hex");
    }

    try {
        const fromBase64 = Buffer.from(raw, "base64");
        if (fromBase64.length === 32) return fromBase64;
    } catch {
        // fall through
    }

    console.warn(
        "RECORDS_ENCRYPTION_KEY inválida (use 32 bytes em hex). Gravando em claro."
    );
    return null;
}

export function isEncryptionEnabled(): boolean {
    return parseKey() !== null;
}

function encryptBuffer(plaintext: string): { iv: string; tag: string; data: string } {
    const key = parseKey();
    if (!key) {
        throw new Error("Encryption key is not configured.");
    }

    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);

    return {
        iv: iv.toString("base64url"),
        tag: cipher.getAuthTag().toString("base64url"),
        data: encrypted.toString("base64url"),
    };
}

function decryptBuffer(parts: { iv: string; tag: string; data: string }): string {
    const key = parseKey();
    if (!key) {
        throw new Error("MISSING_KEY");
    }

    const decipher = createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(parts.iv, "base64url")
    );
    decipher.setAuthTag(Buffer.from(parts.tag, "base64url"));
    return Buffer.concat([
        decipher.update(Buffer.from(parts.data, "base64url")),
        decipher.final(),
    ]).toString("utf8");
}

export function isSealedText(value: string | null | undefined): boolean {
    return typeof value === "string" && value.startsWith(TEXT_PREFIX);
}

export function isSealedJson(value: unknown): value is JsonEnvelope {
    if (!value || typeof value !== "object") return false;
    const envelope = value as Partial<JsonEnvelope>;
    return (
        envelope.__enc === 1 &&
        envelope.alg === ALGORITHM &&
        typeof envelope.iv === "string" &&
        typeof envelope.tag === "string" &&
        typeof envelope.data === "string"
    );
}

export function sealText(value: string | null | undefined): string | null {
    if (value == null || value === "") return value ?? null;
    const key = parseKey();
    if (!key) return value;

    const { iv, tag, data } = encryptBuffer(value);
    return `${TEXT_PREFIX}${iv}.${tag}.${data}`;
}

export function openText(value: string | null | undefined): string | null {
    if (value == null || value === "") return value ?? null;
    if (!isSealedText(value)) return value;

    const payload = value.slice(TEXT_PREFIX.length);
    const [iv, tag, data] = payload.split(".");
    if (!iv || !tag || !data) return MISSING_KEY_PLACEHOLDER;

    try {
        return decryptBuffer({ iv, tag, data });
    } catch (error) {
        if (error instanceof Error && error.message === "MISSING_KEY") {
            return MISSING_KEY_PLACEHOLDER;
        }
        console.error("Falha ao decifrar texto clínico:", error);
        return MISSING_KEY_PLACEHOLDER;
    }
}

export function sealJson(value: unknown): unknown {
    const key = parseKey();
    if (!key) return value;

    const { iv, tag, data } = encryptBuffer(JSON.stringify(value));
    const envelope: JsonEnvelope = {
        __enc: 1,
        alg: ALGORITHM,
        iv,
        tag,
        data,
    };
    return envelope;
}

export function openJson<T = unknown>(value: unknown): T {
    if (!isSealedJson(value)) return value as T;

    try {
        return JSON.parse(decryptBuffer(value)) as T;
    } catch (error) {
        if (error instanceof Error && error.message === "MISSING_KEY") {
            return { text: MISSING_KEY_PLACEHOLDER } as T;
        }
        console.error("Falha ao decifrar JSON clínico:", error);
        return { text: MISSING_KEY_PLACEHOLDER } as T;
    }
}

export function sealRecordContent(text: string): unknown {
    return sealJson({ text });
}

export function openRecordText(content: unknown): string {
    const opened = openJson<{ text?: unknown }>(content);
    if (opened && typeof opened === "object" && typeof opened.text === "string") {
        return opened.text;
    }
    return "";
}

export function openRecordContent(content: unknown): { text: string } {
    return { text: openRecordText(content) };
}
