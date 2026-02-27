"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useAccessStore } from "@/store/accessStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { loginUser } from "@/services/userService";
import Image from "next/image";
import { Eye, EyeOff, Lock, User, ShieldCheck, Moon } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";

const Globe = dynamic(() => import("@/components/GlobeBackground/Globe"), { ssr: false });

// export function GlobeCanvas() {
//   return (
//     <Canvas
//       camera={{ position: [0, 0, 350], fov: 45 }}
//       style={{ width: "100%", height: "100%" }}
//       gl={{ antialias: true }}
//     >
//       <Globe />
//     </Canvas>
//   );
// }

const loginSchema = z.object({
  username: z.string().min(1, "Username or Email is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuthStore();
  const { setAccess } = useAccessStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  useEffect(() => {
    // Intercept hash routes for shared tracking links (e.g., from older backend endpoints)
    if (typeof window !== "undefined" && window.location.hash.startsWith("#/shared/live-track/token/")) {
      const token = window.location.hash.split("#/shared/live-track/token/")[1];
      if (token) {
        router.replace(`/shared/live-track/token#${token}`);
        return;
      }
    }

    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);

    try {
      const data = await loginUser(values.username, values.password);

      if (data?.token) {
        localStorage.clear();
        login(data.token, values.rememberMe ? 30 : undefined);

        // Store access permissions if present
        if (data.access) {
          setAccess(data.access);
        }

        router.push("/dashboard");
      } else {
        form.setError("root", {
          message: "Invalid response from server.",
        });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Login failed. Please check your credentials.";

      if (errorMessage === "Incorrect password or username ID") {
        form.setError("root", {
          message: "Incorrect password or username ID",
        });
      } else if (
        errorMessage === "Your account is inactive. Please contact admin."
      ) {
        form.setError("root", {
          message: "Your account is inactive. Please contact admin.",
        });
      } else {
        form.setError("root", {
          message: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#f1f5f9] p-4 sm:p-6 lg:p-8 font-sans">

      {/* Background Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/background.webp"
          alt="Background Pattern"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-blue-600/20 mix-blend-multiply" />
      </div>
      <div className="relative z-10 flex w-full max-w-6xl flex-col lg:flex-row min-h-[500px] sm:min-h-[600px] lg:min-h-[700px] xl:min-h-[800px] overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl bg-transparent border border-white/10 backdrop-blur-sm">
        {/* Left Panel - Branding & Info */}
        <div className="hidden lg:flex w-[50%] bg-[#0F2557]/90 relative flex-col justify-between overflow-hidden text-white border-r border-white/10">
          {/* Top: Logo */}
          <div className="absolute top-0 left-4 z-10 flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Credence Tracker"
              width={128}
              height={128}
              className="w-40 h-20 object-contain"
              unoptimized
            />
          </div>
          <Canvas
            camera={{ position: [0, 0, 350], fov: 45 }}
            style={{ width: "100%", height: "100%" }}
            gl={{ antialias: true }}
          >
            <Globe />
          </Canvas>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 flex flex-col justify-center items-center bg-black/55 backdrop-blur-[100px] px-6 py-10 sm:px-12 sm:py-16 md:px-16 lg:px-12 xl:px-24 relative lg:border-l lg:border-white/20 lg:shadow-[-10px_0_30px_-10px_rgba(255,255,255,0.1)] overflow-y-auto">

          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center w-full mb-6 sm:mb-8">
            <Image
              src="/logo.png"
              alt="Credence Tracker"
              width={128}
              height={128}
              className="w-32 sm:w-40 h-12 sm:h-16 object-contain"
              unoptimized
            />
          </div>

          <div className="w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px] xl:max-w-[500px] space-y-6 sm:space-y-8">

            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Secure Login</h2>
              <p className="text-white/90 text-sm sm:text-base font-medium">Welcome back! Please enter your details to access the dashboard.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {form.formState.errors.root && (
                  <div className="p-4 rounded-lg bg-red-50/80 backdrop-blur-sm border border-red-200 text-sm text-red-600 font-medium flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                    </svg>
                    {form.formState.errors.root.message}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-white font-semibold text-[16px]">Username</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input
                            placeholder="Enter your username"
                            {...field}
                            className="pl-11 h-12 bg-white backdrop-blur-sm border-white/40 focus:bg-white/80 focus:border-[#0F2557] focus:ring-1 focus:ring-[#0F2557] transition-all rounded-lg text-base shadow-sm placeholder:text-gray-500"
                            disabled={isLoading}
                          />
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none group-focus-within:text-[#0F2557] transition-colors" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-white font-semibold text-[16px]">Password</FormLabel>
                      </div>
                      <FormControl>
                        <div className="relative group">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                            className="pl-11 pr-11 h-12 bg-white backdrop-blur-sm border-white/40 focus:bg-white/80 focus:border-[#0F2557] focus:ring-1 focus:ring-[#0F2557] transition-all rounded-lg text-base shadow-sm placeholder:text-gray-500"
                            disabled={isLoading}
                          />
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none group-focus-within:text-[#0F2557] transition-colors" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-2 rounded-md hover:bg-gray-100/50 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 text-gray-700 pt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="w-5 h-5 rounded-full border-gray-400/80 data-[state=checked]:bg-[#0F2557] data-[state=checked]:border-[#0F2557] bg-white/50"
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer text-sm select-none text-white">
                        Remember for 30 days
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 hover:backdrop-blur-2xl cursor-pointer text-base font-bold bg-[#0F2557] hover:bg-[#f56e28] text-white shadow-lg shadow-[#0F2557]/20 transition-all hover:shadow-[#0F2557]/30 rounded-lg mt-2 group backdrop-blur-md bg-opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Logging in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      Login
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                        <path fillRule="evenodd" d="M16.72 7.72a.75.75 0 011.06 0l3.75 3.75a.75.75 0 010 1.06l-3.75 3.75a.75.75 0 11-1.06-1.06l2.47-2.47H3a.75.75 0 010-1.5h16.19l-2.47-2.47a.75.75 0 010-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </Button>
              </form>
            </Form>

            <div className="text-center text-sm text-white pt-6 font-medium">
              By continuing, you agree to our{" "}
              <Link href="https://www.parentseye.in/terms" className="text-[#f56e28] font-semibold hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="https://www.parentseye.in/privacy" className="text-[#f56e28] font-semibold hover:underline">
                Privacy Policy
              </Link>.
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
