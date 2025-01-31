import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Beer, Clock } from "lucide-react";
import InstagramShareButton from "./InstagramShareButton";
  
  export default function GuinnessPourModal({ isOpen, onClose, pour }) {
    if (!pour) return null;
  
    const formatTime = (time) => {
      if (!time) return "N/A";
      const seconds = Math.floor(time / 1000);
      const milliseconds = Math.floor((time % 1000) / 10);
      return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Split Score</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Image */}
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <img
                src={pour.url}
                alt="Guinness pour"
                className="object-cover w-full h-full"
              />
            </div>
  
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black text-white rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Beer className="h-5 w-5 text-[#FFC107]" />
                  <span>Score</span>
                </div>
                <span className="text-xl font-bold text-[#FFC107]">
                  {(pour.score * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-black text-white rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#FFC107]" />
                  <span>Time</span>
                </div>
                <span className="text-xl font-bold text-[#FFC107]">
                  {formatTime(pour.sipLength)}
                </span>
              </div>
            </div>
          
          {/* Share Button */}
          <div className="flex justify-center">
            <InstagramShareButton imageUrl={pour.url} />
          </div>
  
            {/* Date and Time */}
            <div className="text-sm text-gray-500 text-center">
              Split on {new Date(pour.timestamp).toLocaleString()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }