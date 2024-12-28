import { Beer } from "lucide-react";

export default function AnalysisLoader() {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center space-y-4">
        <div className="relative">
          <Beer className="h-12 w-12 text-[#FFC107] mx-auto animate-bounce" />
          <div className="absolute inset-0 animate-ping">
            <Beer className="h-12 w-12 text-[#FFC107] mx-auto opacity-75" />
          </div>
        </div>
        <h3 className="text-xl font-bold">Analyzing Your Split</h3>
        <div className="space-y-2">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#FFC107] rounded-full animate-progress"></div>
          </div>
          <p className="text-sm text-gray-600">Running our complicated Guinness AI to grade your split... hold tight</p>
        </div>
      </div>
    </div>
  );
}