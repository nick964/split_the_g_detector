import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";

export default function InstagramShareButton({ imageUrl }) {
  const handleDownloadAndShare = async () => {
    try {
      // Step 1: Download the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create a temporary anchor element
      const a = document.createElement("a");
      a.href = url;
      a.download = "share-image.jpg"; // File name
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url); // Cleanup

      // Step 2: Delay execution to ensure image is saved
      setTimeout(() => {
        // Step 3: Open Instagram's share interface
        const instagramUrl = `instagram://library`;
        window.location.href = instagramUrl;

        // Step 4: Fallback to Instagram's website if needed
        setTimeout(() => {
          if (document.hidden) return; // If redirected successfully, stop
          window.open("https://instagram.com", "_blank");
        }, 1000);
      }, 2000); // Allow some time for saving
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  return (
    <Button
      onClick={handleDownloadAndShare}
      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
    >
      <Instagram className="h-4 w-4 mr-2" />
      Share to Instagram
    </Button>
  );
}
