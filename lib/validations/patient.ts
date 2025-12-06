import { z } from "zod";
import { addressSchema } from "./onboarding";

export const patientSchema = z.object({
    fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    cpf: z.string().optional().or(z.literal('')), // Optional but if present should check format? For now loose.
    dateOfBirth: z.string().refine((date) => new Date(date).toString() !== 'Invalid Date', {
        message: "Data de nascimento inválida",
    }),
    phone: z.string().min(10, "Telefone inválido"),
    email: z.string().email("Email inválido").optional().or(z.literal('')),
    occupation: z.string().optional(),
    notes: z.string().optional(),
    address: addressSchema,
});

export type PatientValues = z.infer<typeof patientSchema>;
