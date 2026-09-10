export function digitsOnly(value: string): string {
    return value.replace(/\D/g, "");
}

export function formatCpf(value: string): string {
    const digits = digitsOnly(value).slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) {
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function checkDigit(digits: string, length: number): number {
    let sum = 0;
    for (let i = 0; i < length; i++) {
        sum += Number(digits[i]) * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
}

/** Valida CPF pelos dígitos verificadores. Aceita mascarado ou só números. */
export function isValidCpf(value: string): boolean {
    const cpf = digitsOnly(value);
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    return (
        checkDigit(cpf, 9) === Number(cpf[9]) &&
        checkDigit(cpf, 10) === Number(cpf[10])
    );
}
