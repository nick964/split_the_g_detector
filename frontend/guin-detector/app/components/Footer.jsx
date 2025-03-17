import Link from "next/link";
import { Beer, Mail, Github, Twitter, Heart } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-black/95 text-white border-t border-neutral-800 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo and Tagline */}
          <div className="flex flex-col items-center md:items-start mb-6 md:mb-0">
            <div className="flex items-center space-x-2 mb-2">
              <Beer className="h-6 w-6 text-[#FFC107]" />
              <span className="font-bold text-lg">Split The G</span>
            </div>
            <p className="text-sm text-gray-400 text-center md:text-left">
              The perfect split is just a sip away
            </p>
          </div>
          
          {/* Links */}
          <div className="flex flex-col items-center md:items-end">
            <div className="flex items-center space-x-4 mb-4">
              <Link href="mailto:nickr964@gmail.com" className="text-gray-400 hover:text-[#FFC107] transition-colors">
                <Mail className="h-5 w-5" />
              </Link>
              <Link href="https://github.com/nick964" className="text-gray-400 hover:text-[#FFC107] transition-colors">
                <Github className="h-5 w-5" />
              </Link>
              <Link href="https://x.com/nicky_robby" className="text-gray-400 hover:text-[#FFC107] transition-colors">
                <Twitter className="h-5 w-5" />
              </Link>
            </div>
            <div className="text-sm text-gray-400">
              <span>Contact: </span>
              <Link href="mailto:nickr964@gmail.com" className="hover:text-[#FFC107] transition-colors">
                nickr964@gmail.com
              </Link>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-neutral-800 mt-6 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-gray-500 mb-2 md:mb-0">
            &copy; {currentYear} Split The G. All rights reserved.
          </p>
          <p className="text-xs text-gray-500 flex items-center">
            Made with <Heart className="h-3 w-3 text-red-500 mx-1" /> and Guinness
          </p>
        </div>
        
        {/* Irish Decoration */}
        <div className="flex justify-center mt-4 space-x-2 text-sm">
          <span className="text-green-600">☘️</span>
          <span className="text-white">Sláinte!</span>
          <span className="text-green-600">☘️</span>
        </div>
      </div>
    </footer>
  );
} 