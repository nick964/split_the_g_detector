"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Instagram, Loader2 } from "lucide-react";
import ShareInstructionsModal from "./ShareInstructionsModal";

export default function InstagramShareButton({ imageUrl }) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const downloadImage = async (imageUrl) => {
    if (!imageUrl) {
      console.error("Error: imageUrl is undefined or empty.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/proxy?url=${encodeURIComponent(imageUrl)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create a temporary anchor to trigger the download
      const a = document.createElement("a");
      a.href = url;
      a.download = "shared-image.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAndShare = async () => {
    setIsLoading(true);
    await downloadImage(imageUrl);
    const instagramUrl = `instagram://library?AssetPath=${encodeURIComponent(imageUrl)}`;
    
    // Try to open Instagram app
    window.location.href = instagramUrl;
    setTimeout(() => {
      const instagramUrl = `instagram://library`;
      window.location.href = instagramUrl;

      setTimeout(() => {
        if (document.hidden) return;
        window.open("https://instagram.com", "_blank");
      }, 1000);
    }, 2000);
  };

  return (
    <>
      <Button
        onClick={() => setShowInstructions(true)}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
      >
        <Instagram className="h-4 w-4 mr-2" />
        Share to Instagram
      </Button>

      <ShareInstructionsModal 
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </>
  );
}
