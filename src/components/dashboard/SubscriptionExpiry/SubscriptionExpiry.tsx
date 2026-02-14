"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle, Calendar, Clock } from "lucide-react";
import { SubscriptionExpiration } from "@/interface/modal";

// =============================
// TYPES
// =============================

interface SubscriptionExpiryProps {
  isOpen?: boolean;
  onClose?: () => void;
  branches?: SubscriptionExpiration[];
  onRenew?: () => void;
}

// =============================
// MAIN COMPONENT
// =============================
export const SubscriptionExpiry: React.FC<SubscriptionExpiryProps & {
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}> = ({
  isOpen: controlledIsOpen,
  onClose,
  branches: branchesData,
  onRenew,
  onLoadMore,
  hasMore,
  isLoadingMore
}) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(true);
    const [isClosing, setIsClosing] = useState(false);

    // Cast branchesData to expected structure if needed, or better, update props interface
    // The hook returns { data: [], totalExpiredCount: ... } but component props were SubscriptionExpiration[]
    // We need to adjust how we handle 'branches' prop.
    // The 'branches' prop passed from parent is now { data: ..., count: ... } object from hook
    const branches = (branchesData as any)?.data || [];
    const totalCount = (branchesData as any)?.totalExpiringIn30DaysCount || 0;
    const expiredCount = (branchesData as any)?.totalExpiredCount || 0;


    const observerTarget = React.useRef(null);

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
            onLoadMore?.();
          }
        },
        { threshold: 0.1 }
      );

      if (observerTarget.current) {
        observer.observe(observerTarget.current);
      }

      return () => {
        if (observerTarget.current) {
          observer.unobserve(observerTarget.current);
        }
      };
    }, [hasMore, isLoadingMore, onLoadMore]);

    useEffect(() => {
      if (controlledIsOpen !== undefined) setIsOpen(controlledIsOpen);
    }, [controlledIsOpen]);

    const handleClose = () => {
      // Start closing animation
      setIsClosing(true);

      // Wait for animation to complete before actually closing
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
        onClose?.();
      }, 300); // Match this with CSS animation duration
    };

    const handleRenew = () => {
      onRenew?.();
      handleClose();
    };



    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    };

    if (!isOpen || (branches.length === 0 && !isLoadingMore)) return null;

    return (
      <>
        {/* Overlay container - Responsive positioning and sizing */}
        <div
          className="fixed z-50 pointer-events-none responsive-popup-container"
          aria-hidden={!isOpen}
        >
          <div
            className={`
            bg-white/95 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden 
            pointer-events-auto transform transition-all duration-300 border border-gray-200
            responsive-popup
            ${isClosing ? "animate-slideOutRight" : "animate-fadeInSlideIn"}
          `}
          >

            <div className="bg-[#0c235c] px-3 sm:px-4 py-2 flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="bg-white/80 rounded-full p-1 shadow-sm flex-shrink-0">
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs text-white sm:text-sm font-bold truncate">
                    Subscription Expiry Alert
                  </h2>
                  <p className="text-[12px] text-white sm:text-[12px] truncate">
                    {totalCount}{" "}
                    {totalCount === 1 ? "device" : "devices"} expiring | {expiredCount}{" "}
                    expired

                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                <button
                  onClick={() => {
                    handleClose();
                    router.push("/dashboard/renewal");
                  }}
                  className="glass-btn px-4 py-1.5 rounded-full text-white text-xs sm:text-sm font-medium whitespace-nowrap flex items-center gap-1.5 group cursor-pointer"
                >
                  <span className="relative z-10">Renew</span>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </button>
                <button
                  onClick={handleClose}
                  className="text-white hover:bg-white/25 rounded-full p-1 transition-colors duration-200 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4 overflow-y-auto responsive-popup-content bg-white/80 backdrop-blur-sm">
              <div className="space-y-2">
                {branches.map((branch: any, index: number) => {
                  return (
                    <div
                      key={`${branch.mobileNo}-${index}`}
                      className="bg-red-50/80 border-l-4 border-red-400/80 rounded-md p-3 transition-all duration-200 hover:shadow-sm backdrop-blur-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="font-semibold text-sm text-red-600 truncate">
                            Admin: {branch?.schoolName}
                          </h3>
                          <p className="font-semibold text-xs text-red-600 truncate">
                            User:{" "}
                            {typeof branch?.branchName === "string"
                              ? branch?.branchName
                              : branch?.branchName?.branchName}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className="bg-red-100/80 text-red-700 text-[10px] px-2 py-1 rounded-md font-medium whitespace-nowrap shadow-sm border border-red-200">
                            {branch?.expiringIn30DaysCount}{" "}
                            {branch?.expiringIn30DaysCount === 1
                              ? "device"
                              : "devices"}{" "}
                            expiring | {branch?.expiredCount}{" "}
                            expired
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Usage of observer target for infinite scroll */}
                <div ref={observerTarget} className="h-4 w-full flex items-center justify-center">
                  {isLoadingMore && <div className="text-xs text-gray-500">Loading more...</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }

        .animate-fadeInSlideIn {
          animation: slideInRight 0.3s ease-out forwards;
        }

        .animate-slideOutRight {
          animation: slideOutRight 0.3s ease-out forwards;
        }

        /* Responsive styles for different screen sizes */
        .responsive-popup-container {
          bottom: 1rem;
          right: 1rem;
          width: calc(100vw - 2rem);
          max-width: 400px;
        }

        .responsive-popup {
          width: 100%;
          max-height: min(65vh, 500px);
        }

        .responsive-popup-content {
          max-height: min(calc(65vh - 80px), 420px);
        }

        /* 16:10 resolution optimization (1920x1200, 2560x1600, etc.) */
        @media (min-width: 1920px) and (min-height: 1000px) {
          .responsive-popup-container {
            bottom: 1.5rem;
            right: 1.5rem;
            max-width: 450px;
          }

          .responsive-popup {
            max-height: min(70vh, 600px);
          }

          .responsive-popup-content {
            max-height: min(calc(70vh - 80px), 520px);
          }
        }

        /* Large desktop screens */
        @media (min-width: 2560px) {
          .responsive-popup-container {
            bottom: 2rem;
            right: 2rem;
            max-width: 500px;
          }
        }

        /* Tablet and smaller desktop */
        @media (max-width: 1024px) {
          .responsive-popup-container {
            max-width: 380px;
          }
        }

        /* Mobile devices */
        @media (max-width: 768px) {
          .responsive-popup-container {
            bottom: 0.5rem;
            right: 0.5rem;
            width: calc(100vw - 1rem);
            max-width: none;
          }

          .responsive-popup {
            max-height: min(80vh, 400px);
          }

          .responsive-popup-content {
            max-height: min(calc(80vh - 80px), 320px);
          }
        }

        /* Small mobile devices */
        @media (max-width: 480px) {
          .responsive-popup-container {
            bottom: 0.25rem;
            right: 0.25rem;
            width: calc(100vw - 0.5rem);
          }

          .responsive-popup {
            max-height: min(85vh, 350px);
          }

          .responsive-popup-content {
            max-height: min(calc(85vh - 80px), 270px);
          }
        }

        /* Very small screens */
        @media (max-width: 360px) {
          .responsive-popup-container {
            position: fixed;
            top: 0.25rem;
            bottom: auto;
            right: 0.25rem;
            left: 0.25rem;
            width: auto;
          }
        }

        /* Landscape orientation */
        @media (max-height: 400px) and (orientation: landscape) {
          .responsive-popup-container {
            max-height: 90vh;
          }

          .responsive-popup {
            max-height: min(90vh, 200px);
          }

          .responsive-popup-content {
            max-height: min(calc(90vh - 80px), 220px);
          }
        }


        /* Apple Liquid Glass Effect */
        .glass-btn {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px); /* For Safari */
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 
            0 4px 6px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .glass-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 
            0 8px 12px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 0 20px rgba(255, 255, 255, 0.1); /* Glow effect */
          transform: translateY(-1px);
        }

        .glass-btn:active {
          transform: translateY(0.5px);
          box-shadow: 
            0 2px 4px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        /* Shimmer effect on hover */
        .glass-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          transform: skewX(-25deg);
          transition: none;
        }

        .glass-btn:hover::after {
          left: 150%;
          transition: left 0.7s ease-in-out;
        }
      `}</style>
      </>
    );
  };
