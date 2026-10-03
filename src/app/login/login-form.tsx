"use client";

import { useActionState } from "react";
import { loginWithCredentials, loginWithMagicLink } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [passwordState, passwordAction, isPasswordPending] = useActionState(
    loginWithCredentials,
    undefined
  );
  const [magicLinkState, magicLinkAction, isMagicLinkPending] = useActionState(
    loginWithMagicLink,
    undefined
  );

  return (
    <div className="w-full space-y-8">
      <form action={passwordAction} className="space-y-4">
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
        {passwordState?.error && (
          <p className="text-sm text-red-600">{passwordState.error}</p>
        )}
        <button
          type="submit"
          disabled={isPasswordPending}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-base font-medium text-white disabled:opacity-60"
        >
          {isPasswordPending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">or</span>
        </div>
      </div>

      <form action={magicLinkAction} className="space-y-3">
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        <div>
          <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700">
            Email a sign-in link
          </label>
          <input
            id="magic-email"
            name="email"
            type="email"
            autoComplete="email"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
        {magicLinkState?.error && (
          <p className="text-sm text-red-600">{magicLinkState.error}</p>
        )}
        <button
          type="submit"
          disabled={isMagicLinkPending}
          className="w-full rounded-md border border-gray-300 px-4 py-3 text-base font-medium text-gray-700 disabled:opacity-60"
        >
          {isMagicLinkPending ? "Sending..." : "Email me a link"}
        </button>
      </form>
    </div>
  );
}
