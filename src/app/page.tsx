"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.startsWith("#/shared/live-track/token/")) {
      const token = window.location.hash.split("#/shared/live-track/token/")[1];
      if (token) {
        router.replace(`/shared/live-track/token#${token}`);
        return;
      }
    }

    router.replace(`/login${window.location.hash}`);
  }, [router]);

  return null;
}
