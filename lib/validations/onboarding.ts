import { z } from "zod";

export const personalInfoSchema = z.object({
    fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    cpf: z.string().min(11, "CPF inválido").max(14, "CPF inválido"), // Simple length check for now, can add regex
    crp: z.string().min(4, "CRP inválido"),
    phone: z.string().min(10, "Telefone inválido"),
    whatsapp: z.string().optional(),
});

export const addressSchema = z.object({
    cep: z.string().min(8, "CEP inválido"),
    street: z.string().min(3, "Rua obrigatória"),
    number: z.string().min(1, "Número obrigatório"),
    complement: z.string().optional(),
    neighborhood: z.string().min(2, "Bairro obrigatório"),
    city: z.string().min(2, "Cidade obrigatória"),
    state: z.string().length(2, "UF inválida"),
});

export const clinicalProfileSchema = z.object({
    approach: z.string().min(1, "Selecione uma abordagem"),
    targetAudience: z.array(z.string()).min(1, "Selecione pelo menos um público-alvo"),
    specialties: z.array(z.string()).optional(),
    bio: z.string().max(500, "Bio muito longa").optional(),
});

export const onboardingSchema = z.object({
    personal: personalInfoSchema,
    address: addressSchema,
    clinical: clinicalProfileSchema,
});

export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;
export type AddressValues = z.infer<typeof addressSchema>;
export type ClinicalProfileValues = z.infer<typeof clinicalProfileSchema>;
export type OnboardingValues = z.infer<typeof onboardingSchema>;
