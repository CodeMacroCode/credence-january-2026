"use client";
import { StateStorage } from "zustand/middleware";

const safeLocalStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (
            typeof window !== "undefined" &&
            window.localStorage &&
            typeof window.localStorage.getItem === "function"
        ) {
            try {
                return window.localStorage.getItem(name);
            } catch (e) {
                console.warn("Failed to get item from localStorage", e);
                return null;
            }
        }
        return null;
    },
    setItem: async (name: string, value: string): Promise<void> => {
        if (
            typeof window !== "undefined" &&
            window.localStorage &&
            typeof window.localStorage.setItem === "function"
        ) {
            try {
                window.localStorage.setItem(name, value);
            } catch (e) {
                console.warn("Failed to set item in localStorage", e);
            }
        }
    },
    removeItem: async (name: string): Promise<void> => {
        if (
            typeof window !== "undefined" &&
            window.localStorage &&
            typeof window.localStorage.removeItem === "function"
        ) {
            try {
                window.localStorage.removeItem(name);
            } catch (e) {
                console.warn("Failed to remove item from localStorage", e);
            }
        }
    },
};

export default safeLocalStorage;

