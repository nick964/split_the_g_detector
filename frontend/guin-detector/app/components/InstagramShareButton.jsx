import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";

export default function InstagramShareButton({ imageUrl }) {
  const handleShare = () => {
    // Instagram story sharing URL
    const instagramUrl = `instagram-stories://share?AssetPath=${encodeURIComponent(imageUrl)}`;
    
    // Try to open Instagram app
    window.location.href = instagramUrl;
    
    // Fallback to Instagram website after a short delay
    setTimeout(() => {
      if (document.hidden) return; // User was redirected successfully
      window.open('https://instagram.com', '_blank');
    }, 1000);
  };

  return (
    <Button
      onClick={handleShare}
      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
    >
      <Instagram className="h-4 w-4 mr-2" />
      Share to Instagram
    </Button>
  );
}