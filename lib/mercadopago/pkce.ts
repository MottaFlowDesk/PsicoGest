import { createHash, randomBytes } from "node:crypto";

const VERIFIER_ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

export function generateCodeVerifier(length = 64): string {
    const bytes = randomBytes(length);
    let verifier = "";
    for (const byte of bytes) {
        verifier += VERIFIER_ALPHABET[byte % VERIFIER_ALPHABET.length];
    }
    return verifier;
}

export function generateCodeChallenge(verifier: string): string {
    return createHash("sha256").update(verifier).digest("base64url");
}

export function generateOAuthState(): string {
    return randomBytes(24).toString("base64url");
}
