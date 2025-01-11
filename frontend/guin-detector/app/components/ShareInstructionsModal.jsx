import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
  } from "@/components/ui/dialog";
  import { Instagram, Smartphone, Camera, Share2 } from "lucide-react";
  
  export default function ShareInstructionsModal({ isOpen, onClose }) {
    const steps = [
      {
        icon: Camera,
        title: "Take a Screenshot",
        description: "Take a screenshot of your Guinness score and split details"
      },
      {
        icon: Instagram,
        title: "Open Instagram",
        description: "Open the Instagram app on your device"
      },
      {
        icon: Share2,
        title: "Share to Story",
        description: "Create a new story and share your screenshot"
      }
    ];
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Instagram className="h-6 w-6 text-pink-600" />
              Share to Instagram
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
            Mark Zuckerberg is too busy curling his hair and folding Dana White's undies to allow us to post directly to Instagram. In the mean time please follow these instructions to share your split!
          </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
                    <step.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-sm text-gray-500 text-center">
              Tag us using <span className="font-semibold">#SplitTheG</span> to be featured!
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }