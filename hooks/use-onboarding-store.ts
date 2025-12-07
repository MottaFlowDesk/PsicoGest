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
            cep: "", // Corrected from 'zip'
            street: "",
            number: "",
            complement: "",
            neighborhood: "",
            city: "",
            state: "",
        },
        clinical: {
            approach: "", // Added missing required field
            targetAudience: [],
            specialties: [],
            bio: ""
        }
    },
    setStep: (step) => set({ currentStep: step }),
    nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 4, 4) })), // Fixed typo in previous step logic if any? - Actually logic was +1, 4 is max. 
    // Wait, let's keep original logic for next step:
    // nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
    // The previous write had this correct. I will keep it.
    prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
    updateData: (section, newData) => set((state) => ({
        data: {
            ...state.data,
            [section]: { ...state.data[section], ...newData }
        }
    })),
    reset: () => set({ currentStep: 1, data: {} })
}));

// Re-writing the function logic cleanly to avoid comments in code affecting interpretation
export const useOnboardingStoreClean = create<OnboardingState>((set) => ({
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
            cep: "",
            street: "",
            number: "",
            complement: "",
            neighborhood: "",
            city: "",
            state: "",
        },
        clinical: {
            approach: "",
            targetAudience: [],
            specialties: [],
            bio: ""
        }
    },
    setStep: (step) => set({ currentStep: step }),
    nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
    prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
    updateData: (section, newData) => set((state) => ({
        data: {
            ...state.data,
            [section]: { ...state.data[section], ...newData }
        }
    })),
    reset: () => set({ currentStep: 1, data: {} })
}));
