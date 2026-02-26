import { useMutation } from "@tanstack/react-query";
import { api } from "@/services/apiService";

interface ShareDevicePayload {
    uniqueId: string;
    expiration: string;
}

export const useShareDevice = () => {
    return useMutation({
        mutationFn: async (payload: ShareDevicePayload) => {
            // The backend expects the response to be a plain string URL inside the data
            // If it's wrapped in an object, we'll handle it below.
            // Using the base axios to bypass the `/api` prefix appended by custom axiosInstance
            // Alternatively, we can use the custom instance but pass the absolute path
            const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.credencetracker.com"; // Fallback if undefined
            const response = await fetch(`${baseURL}/auth/ShareDevice`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to generate share link");
            }

            const rawResponseText = await response.text();
            let responseData;
            try {
                responseData = JSON.parse(rawResponseText);
            } catch (e) {
                // If not JSON, it's a plain text URL from backend
                return rawResponseText;
            }
            if (responseData && typeof responseData === "object") {
                return responseData.url || responseData.data || JSON.stringify(responseData);
            }
            return String(responseData);
        },
    });
};
