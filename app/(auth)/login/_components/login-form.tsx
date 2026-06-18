"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/actions/auth/login";
import { PronuviaLogo } from "@/components/pronuvia-logo";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col items-center w-full">
      {/* Logo */}
      <div className="mb-7">
        <PronuviaLogo size={34} />
      </div>

      <h1 className="text-[22px] font-bold text-gray-800 mb-1">
        Login to your account
      </h1>
      <p className="text-sm text-gray-400 mb-8">
        Create your account to get started
      </p>

      {/* Error message */}
      {state?.message && (
        <div className="w-full mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {state.message}
        </div>
      )}

      {/* Email */}
      <div className="w-full mb-4">
        <input
          name="email"
          type="email"
          placeholder="Email Address"
          autoComplete="email"
          className="w-full border border-gray-200 rounded-md bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#5BB8D4] focus:ring-1 focus:ring-[#5BB8D4] transition"
        />
        {state?.errors?.email && (
          <p className="text-xs text-red-500 mt-1">{state.errors.email[0]}</p>
        )}
      </div>

      {/* Password */}
      <div className="w-full mb-4">
        <input
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          className="w-full border border-gray-200 rounded-md bg-white px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#5BB8D4] focus:ring-1 focus:ring-[#5BB8D4] transition"
        />
        {state?.errors?.password && (
          <p className="text-xs text-red-500 mt-1">
            {state.errors.password[0]}
          </p>
        )}
      </div>

      {/* Remember me + Forgot password */}
      <div className="w-full flex items-center justify-between mb-6">
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            name="rememberMe"
            className="w-4 h-4 accent-[#3DBFA4] cursor-pointer"
          />
          Remember me
        </label>
        <Link
          href="/forgot-password"
          className="text-sm text-[#5BB8D4] hover:underline"
        >
          Forget Password?
        </Link>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[#3DBFA4] hover:bg-[#35ab93] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-md text-sm transition-colors cursor-pointer"
      >
        {pending ? "Logging in…" : "Login"}
      </button>

      <p className="mt-6 text-sm text-gray-400">
        Not registered yet?{" "}
        <Link href="#" className="text-[#5BB8D4] hover:underline font-medium">
          Create an account
        </Link>
      </p>
    </form>
  );
}
