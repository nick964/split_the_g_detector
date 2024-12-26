"use client"

import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <div className="flex justify-center mt-8">
      <button
        onClick={() => signIn('google')}
        className="bg-black text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors"
      >
        Sign In
      </button>
    </div>
  );
}
