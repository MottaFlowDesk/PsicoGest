import { create } from 'zustand';
import { OnboardingValues } from '@/lib/validations/onboarding';

interface OnboardingState {
    currentStep: number;
    data: Partial<OnboardingValues>;
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    updateData: (section: keyof OnboardingValues, data: any) => void;
    reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
    currentStep: 1,
    data: {
        personal: {
            fullName: "",
            cpf: "",
            crp: "",
            phone: "",
            whatsapp: "",
        },
        address: {
            zip: "",
            street: "",
            number: "",
            complement: "",
            neighborhood: "",
            city: "",
            state: "",
        },
        clinical: {
            targetAudience: [],
            specialties: [],
            bio: ""
        }
    },
    setStep: (step) => set({ currentStep: step }),
    nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })), // 4 steps total (3 forms + 1 review/success)
    prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
    updateData: (section, newData) => set((state) => ({
        data: {
            ...state.data,
            [section]: { ...state.data[section], ...newData }
        }
    })),
    reset: () => set({ currentStep: 1, data: {} })
}));
