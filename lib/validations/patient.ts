import { z } from "zod";
import { addressSchema } from "./onboarding";
import { normalizeCpfForDb, normalizePhoneForDb } from "@/lib/patients/format-for-db";

export const patientSchema = z.object({
    fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    cpf: z
        .string()
        .optional()
        .or(z.literal(""))
        .refine(
            (val) => {
                const digits = normalizeCpfForDb(val);
                return digits === null || digits.length === 11;
            },
            { message: "CPF deve ter 11 dígitos" }
        ),
    dateOfBirth: z
        .string()
        .refine((date) => new Date(date).toString() !== "Invalid Date", {
            message: "Data de nascimento inválida",
        })
        .refine((date) => {
            const birth = new Date(date);
            const minAge = new Date();
            minAge.setFullYear(minAge.getFullYear() - 18);
            return birth <= minAge;
        }, { message: "Paciente deve ter pelo menos 18 anos" }),
    phone: z
        .string()
        .min(10, "Telefone inválido")
        .refine((val) => /^\+?[1-9]\d{10,14}$/.test(normalizePhoneForDb(val)), {
            message: "Telefone inválido. Use DDD + número (ex.: 11999998888)",
        }),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    occupation: z.string().optional(),
    notes: z.string().optional(),
    avatarUrl: z.string().optional().or(z.literal("")),
    address: addressSchema,
});

export type PatientValues = z.infer<typeof patientSchema>;
