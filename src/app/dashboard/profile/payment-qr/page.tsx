"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { QrCode, Upload, ArrowLeft, Loader2, Image as ImageIcon, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import fileUploadAxios from "@/lib/fileUploadAxios";

export default function PaymentQRPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a QR code image to upload");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("upiQR", selectedFile);

      await fileUploadAxios.put("/qrcode/image", formData);

      toast.success("Payment QR code updated successfully");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("QR upload error:", error);
      toast.error(error.response?.data?.message || "Failed to update QR code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-6 md:p-10 bg-[#f8faff]">
      <div className="w-full max-w-[440px] space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
        {/* Back Button */}
        <button 
          className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm ml-1"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </button>

        <Card className="border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-2xl sm:rounded-3xl overflow-hidden bg-white">
          {/* Header Section */}
          <div className="p-6 sm:p-8 pb-4 sm:pb-6 bg-[#fcfdfe] space-y-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-[#eaeff8] rounded-xl flex items-center justify-center ring-1 ring-slate-200/50 shadow-sm">
              <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-[#0a1d4d]" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a1d4d]">Payment QR Code</h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                Update the QR code used for receiving payments.
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="px-6 sm:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-900 ml-0.5">QR Code Image</Label>
                <div 
                  className={`relative group border-2 border-dashed rounded-2xl sm:rounded-3xl transition-all duration-300 flex flex-col items-center justify-center min-h-[200px] sm:min-h-[220px] gap-3 sm:gap-4 p-4 sm:p-6
                    ${previewUrl ? "border-blue-200 bg-blue-50/10" : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md pointer-events-auto cursor-pointer"}
                  `}
                  onClick={() => !previewUrl && fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <div className="relative w-full aspect-square max-w-[140px] sm:max-w-[160px] overflow-hidden rounded-xl sm:rounded-2xl shadow-lg ring-4 ring-white bg-white p-2">
                      <Image 
                        src={previewUrl} 
                        alt="QR Code Preview" 
                        fill
                        className="object-contain p-1"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl shadow-md cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage();
                          }}
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white rounded-xl sm:rounded-2xl shadow-sm flex items-center justify-center ring-1 ring-slate-100 group-hover:scale-105 transition-transform duration-300">
                        <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      </div>
                      <div className="text-center space-y-0.5 sm:space-y-1">
                        <p className="text-sm sm:text-base font-bold text-slate-800">Choose a file</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium">PNG, JPG or SVG (max. 2MB)</p>
                      </div>
                    </>
                  )}
                  <input 
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-[#fff9eb] rounded-xl sm:rounded-2xl border border-amber-100/50 flex gap-3 shadow-sm">
                <div className="h-7 w-7 sm:h-8 sm:w-8 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
                  <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                </div>
                <p className="text-[10px] sm:text-[11px] text-amber-800/80 leading-normal font-medium">
                  Ensure the QR code is clearly visible and carries your correct payment information.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-4">
                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 bg-[#0a1d4d] hover:bg-[#061333] text-sm sm:text-base font-bold rounded-xl transition-all shadow-md shadow-blue-900/10 active:scale-[0.99] cursor-pointer"
                  disabled={isLoading || !selectedFile}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 font-medium justify-center pb-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Your data is encrypted and secure
                </div>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
