"use client";

import { Button } from "../../components/ui/button";
import Link from "next/link";
import { Beer } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";

export function Navbar() {
  const { data: session } = useSession();

  const handleLogin = () => {
    // Redirect user to Spotify authorization page
    signIn('google');
  };

  const handleLogout = () => {
    signOut(); // Logs out the user via NextAuth
  };

  return (
    <nav className="sticky w-full z-50 top-0 flex items-center justify-between px-6 py-3 bg-black/95 backdrop-blur-sm border-b border-neutral-800">
      <Link href="/" className="flex items-center space-x-2">
        <Beer className="h-6 w-6 text-[#FFC107]" />
        <span className="font-bold text-white">Split The G</span>
      </Link>

      <div className="flex items-center space-x-4">
        {session && (
            <div>
                <Link href="/profile" className="text-white hover:underline">
                    Profile
                </Link>
                <Link href="/scan" className="pl-3 text-white hover:underline">
                    Scan Guiness
                </Link>
            </div>
        )}
        {session ? (
          <Button
            className="text-black bg-[#FFC107] hover:bg-[#ffd454]"
            onClick={handleLogout}
          >
            Logout
          </Button>
        ) : (
          <Button
            className="text-black bg-[#FFC107] hover:bg-[#ffd454]"
            onClick={handleLogin}
          >
            Login
          </Button>
        )}
      </div>
    </nav>
  );
}
