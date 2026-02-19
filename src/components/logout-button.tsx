"use client";

import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { getMessaging, deleteToken } from "firebase/messaging";
import { app } from "@/util/firebase"; // or wherever your Firebase app is initialized
import Cookies from "js-cookie";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { LogoutLoader } from "./ui/logout-loader";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      /**delete fcm token */

      // Get the messaging instance
      const messaging = getMessaging(app);

      // Delete the FCM token
      const isDeleted = await deleteToken(messaging);
      console.log(
        isDeleted ? "🗑️ FCM token deleted" : "⚠️ FCM token not deleted"
      );

      // Unregister Firebase service workers
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      }

      //  Clear Firebase IndexedDB
      indexedDB.deleteDatabase("firebase-messaging-database");
      indexedDB.deleteDatabase("firebase-messaging-database-v2");
      indexedDB.deleteDatabase("firebase-installations-database");

      localStorage.removeItem("fcm_token");

      // Clear persistent stores
      useNotificationStore.getState().clearNotifications();
      localStorage.removeItem("ct-notifications");
      localStorage.removeItem("device-store");
      localStorage.removeItem("userId");
      localStorage.removeItem("token");

      /** delete fmc token */
      logout(); // clear state + token
      // console.log("TOKEN: ", localStorage.getItem("token"))
      window.location.href = "/login";

    } catch (error) {
      console.error("❌ Error deleting FCM token:", error);
      // Still logout even if token deletion fails
      logout();
      window.location.href = "/login";
    } finally {
      // We don't set loading to false here because we're redirecting
      // if we did, it might flash before the redirect happens
    }
  };

  return (
    <>
      {isLoading && <LogoutLoader />}
      <span onClick={handleLogout} className="cursor-pointer ml-2 w-full flex items-center gap-3">
        <LogOut /> Logout
      </span>
    </>
  );
}
