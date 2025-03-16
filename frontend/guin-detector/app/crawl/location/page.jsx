"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Beer } from "lucide-react";

export default function DisabledCrawlLocationPage() {
  const router = useRouter();

  // Redirect to home page after a short delay
  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      router.push('/');
    }, 3000);

    return () => clearTimeout(redirectTimer);
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]" 
      style={{ background: 'url("https://www.transparenttextures.com/patterns/classy-fabric.png")', backgroundColor: '#F5F5F5' }}>
      <Card className="border-4 border-[#0D3B1A] shadow-xl max-w-md w-full">
        <CardHeader className="bg-[#0D3B1A] text-white">
          <CardTitle className="text-2xl font-bold flex items-center">
            <Beer className="h-6 w-6 text-[#FFC107] mr-2" />
            Page Disabled
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-[#0D3B1A]" />
            </div>
            <h3 className="text-xl font-bold text-[#0D3B1A] mb-2">Crawl Location Feature Disabled</h3>
            <p className="text-gray-600 mb-4">
              This feature is currently unavailable.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you to the home page...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
