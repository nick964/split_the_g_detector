"use client";

import { useState } from "react";
import Link from "next/link";
import { Beer, Menu, X, Trophy, Map, ChevronUp, ChevronDown, Award } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [crawlDropdownOpen, setCrawlDropdownOpen] = useState(false);

  const handleLogin = () => {
    signIn();
  };

  const handleLogout = () => {
    signOut();
  };

  const toggleCrawlDropdown = () => {
    setCrawlDropdownOpen(!crawlDropdownOpen);
  };

  const NavLinks = () => {
    if (!session) return null;
    
    return (
      <>
        <Link href="/profile" className="text-white hover:underline block">
          Profile
        </Link>
        <Link href="/scan" className="text-white hover:underline block">
          Scan Guinness
        </Link>
      </>
    );
  };

  return (
    <nav className="sticky w-full z-50 top-0 bg-black/95 backdrop-blur-sm border-b border-neutral-800">
      <div className="flex items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center space-x-2">
          <Beer className="h-6 w-6 text-[#FFC107]" />
          <span className="font-bold text-white">Split The G</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-4">
            <NavLinks />
            {/* Daily Champs link - visible to all users */}
            <Link href="/crawl/rankings" className="text-white hover:underline flex items-center">
              <Award className="h-4 w-4 mr-1 text-[#FFC107]" />
              Daily Champs
            </Link>
            {/* Bar Wall link - visible to all users */}
            <Link href="/bar-wall" className="text-white hover:underline flex items-center">
              <Beer className="h-4 w-4 mr-1 text-[#FFC107]" />
              Bar Wall
            </Link>
          </div>
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

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          className="md:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-black/95 border-b border-neutral-800">
          <div className="flex flex-col space-y-4 p-4">
            <NavLinks />
            {/* Daily Champs link - visible to all users */}
            <Link href="/crawl/rankings" className="text-white hover:underline flex items-center">
              <Award className="h-4 w-4 mr-1 text-[#FFC107]" />
              Daily Champs
            </Link>
            {/* Bar Wall link - visible to all users */}
            <Link href="/bar-wall" className="text-white hover:underline flex items-center">
              <Beer className="h-4 w-4 mr-1 text-[#FFC107]" />
              Bar Wall
            </Link>
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
        </div>
      )}
    </nav>
  );
}