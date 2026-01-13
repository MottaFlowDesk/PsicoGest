"use client";

import { OnboardingHeader } from "@/components/onboarding/header";
import { StepPersonal } from "@/components/onboarding/steps/StepPersonal";
import { StepAddress } from "@/components/onboarding/steps/StepAddress";
import { StepClinical } from "@/components/onboarding/steps/StepClinical";
import { StepSuccess } from "@/components/onboarding/steps/StepSuccess";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";

export function OnboardingContent() {
    const { currentStep } = useOnboardingStore();

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <StepPersonal />;
            case 2:
                return <StepAddress />;
            case 3:
                return <StepClinical />;
            case 4:
                return <StepSuccess />;
            default:
                return <StepPersonal />;
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col items-center justify-start pt-8 md:pt-12">
            <OnboardingHeader />

            <div className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                {renderStep()}
            </div>
        </div>
    );
}

