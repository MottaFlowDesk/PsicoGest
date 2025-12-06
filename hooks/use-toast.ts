"use client";

// Minimal placeholder to avoid build errors since Shadcn toast is missing
export const useToast = () => ({
    toast: ({ title, description, variant }: any) => {
        console.log("Toast:", title, description, variant);
        // In a real app we'd trigger a UI toaster.
        // For now, we rely on the UI update itself (dialog closing etc).
    },
});
