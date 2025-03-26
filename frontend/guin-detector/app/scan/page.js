"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Upload from "../components/upload";
import GuinnessTimer from "../components/GuinnessTimer";
import AnalysisLoader from "../components/AnalysisLoader";
import { Beer, XCircle, MapPin, Check, X, Trophy } from "lucide-react";
import { signIn } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import BarSearch from "../components/BarSearch";
import Link from "next/link";

function ProcessPageContent() {
  const { data: session, status } = useSession();
  const [isRecording, setIsRecording] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [barLocation, setBarLocation] = useState("");
  const [showBarSearch, setShowBarSearch] = useState(false);
  const [addedToBar, setAddedToBar] = useState(false);
  const [selectedBar, setSelectedBar] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (time) => {
    const seconds = Math.floor(time / 1000);
    const milliseconds = Math.floor((time % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  const handleTryAgain = () => {
    setIsRecording(false);
    setShowUpload(false);
    setAnalysisResult(null);
    setError(null);
  };

  const handleStart = () => {
    setIsRecording(true);
    setShowUpload(false);
    setAnalysisResult(null);
    setError(null);
  };

  const handleStop = () => {
    setIsRecording(false);
    setShowUpload(true);
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  const handleImageUploaded = async (imageData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageData,
          userId: session?.user?.email,
          time: currentTime, // Include the timer value
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process image');
      }

      if (result.analyzeResult?.score == null) {
        throw new Error('Invalid analysis result received');
      }

      setAnalysisResult(result);
      setShowUpload(false);
    } catch (error) {
      console.error("Error analyzing image:", error);
      setError(error.message || 'Failed to process image. Please try again')
      setShowUpload(true);
      setAnalysisResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissError = () => {
    setError(null);
  };

  const handleBarSelection = (bar) => {
    if (!bar || !bar.id) {
      setError("Invalid bar selection. Please try again.");
      return;
    }
    
    setSelectedBar(bar);
    setShowConfirmation(true);
    setShowBarSearch(false);
  };

  const handleConfirmAddToBar = async () => {
    if (!selectedBar || !analysisResult) {
      setError("Missing data. Please try again.");
      return;
    }
    
    try {
      setLoading(true);
      // Call API to add the pour to the bar
      const response = await fetch("/api/add-to-bar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: session?.user?.email,
          userName: session?.user?.name,
          barId: selectedBar.id,
          barName: selectedBar.name || "Unknown Bar",
          guinnessId: analysisResult.analyzeResult.guinnessDocId,
          score: analysisResult.analyzeResult.score,
          letterGrade: analysisResult.analyzeResult.letterGrade,
          time: currentTime,
          imageUrl: analysisResult.analyzeResult.processedUrl,
          photoName: selectedBar.photoName || null,
          latitude: selectedBar.latitude || null,
          longitude: selectedBar.longitude || null,
          formattedAddress: selectedBar.address || null
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add pour to bar");
      }

      setAddedToBar(true);
      setShowConfirmation(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAddToBar = () => {
    setShowConfirmation(false);
    setShowBarSearch(true);
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC107]"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h2 className="text-xl font-semibold">
          Please sign in to analyze your G split
        </h2>
        <Button onClick={() => signIn()}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
        {loading && <AnalysisLoader/>}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleDismissError}
              className="text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Beer className="h-6 w-6 text-[#FFC107]" />
            Split the G Challenge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isRecording && !showUpload && !analysisResult && (
            <div className="text-center space-y-4">
              <p className="text-lg text-gray-600">
                Ready to test your G splitting skills? Click start when
                you begin your sip!
              </p>
              <Button
                onClick={handleStart}
                className="bg-[#FFC107] text-black hover:bg-[#ffd454] text-lg px-8 py-6"
              >
                Start Recording
              </Button>
            </div>
          )}

          {isRecording && (
            <div className="text-center space-y-4">
                <GuinnessTimer 
                  isRecording={isRecording} 
                  onTimeUpdate={handleTimeUpdate}
                />
                <p className="text-gray-600">Take your time, savor the moment...</p>
                <Button 
                  onClick={handleStop}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                Stop Recording
              </Button>
            </div>
          )}

          {showUpload && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">
                  Time: {formatTime(currentTime)}
                </p>
                <p className="text-gray-600">
                  Now, let's see how well you split the G!
                </p>
              </div>
              <Upload onImageUploaded={handleImageUploaded} 
                      isLoading={loading}
              />
            </div>
          )}

          {!error && analysisResult && (
            <div className="text-center space-y-6">
              <h3 className="text-xl font-bold">Results</h3>
              <div className="bg-gray-50 p-6 rounded-lg space-y-6">

                {/* Letter Grade */}
                <div className="mb-2 relative">
                  <h4 className="text-gray-600 mb-2">Grade</h4>
                  <div className="relative inline-block">
                    <span className="text-6xl font-bold text-[#FFC107] animate-grade-pop grade-glow score-stroke">
                    {analysisResult.analyzeResult.letterGrade}
                    </span>
                    <div className="absolute inset-0 animate-ping opacity-75">
                      <span className="text-6xl font-bold text-[#FFC107] opacity-0">
                      {analysisResult.analyzeResult.letterGrade}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="mb-">
                  <h4 className="text-gray-600 mb-2">Accuracy</h4>
                  <div className="relative">
                    <span className="text-4xl font-bold text-[#FFC107] animate-score-slide score-stroke inline-block">
                      {(analysisResult.analyzeResult.score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>


                {/* Time */}
                <p className="text-xl text-gray-600">
                  Time: {formatTime(currentTime)}
                </p>

                {/* Bar Location (if provided) */}
                {barLocation && (
                  <p className="text-lg text-gray-600">
                    Location: {barLocation}
                  </p>
                )}

                {/* Processed Image */}
                <div className="mt-4">
                  <h4 className="text-gray-800 mb-2">Calculated Image</h4>
                  <div className="relative w-80 mx-auto">
                    <img
                      src={analysisResult.analyzeResult.processedUrl}
                      alt="Processed Guinness pour"
                      className="rounded-lg shadow-md"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleTryAgain}
                  className="bg-[#FFC107] text-black hover:bg-[#ffd454]"
                >
                  Try Again
                </Button>
                
                {!addedToBar && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="relative overflow-hidden bg-gradient-to-r from-[#1e3a8a] to-[#0D3B1A] text-white hover:from-[#0D3B1A] hover:to-[#1e3a8a] shadow-lg transition-all duration-300 transform hover:scale-105 border-2 border-[#FFC107] group px-6"
                      >
                        {/* Animated background effects */}
                        <span className="absolute inset-0 w-full h-full opacity-20">
                          <span className="absolute top-0 left-0 w-full h-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
                          <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-[#FFC107] blur-xl opacity-50 animate-pulse"></span>
                        </span>
                        
                        {/* Icon with animation */}
                        <span className="relative flex items-center gap-2">
                          <span className="relative">
                            <MapPin className="h-5 w-5 text-[#FFC107] group-hover:animate-bounce" />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FFC107] rounded-full animate-ping opacity-75"></span>
                          </span>
                          
                          {/* Text with shine effect */}
                          <span className="font-bold relative inline-block">
                            Add To Bar Wall
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 animate-shine"></span>
                          </span>
                          
                          {/* Bonus message */}
                          <span className="ml-1 bg-[#FFC107] text-black text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                            🏆 New!
                          </span>
                        </span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md border-2 border-[#0D3B1A] shadow-xl">
                      {showConfirmation ? (
                        <>
                          <DialogHeader className="bg-gradient-to-r from-[#0D3B1A]/90 to-[#1e3a8a]/90 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg text-white">
                            <DialogTitle className="text-xl flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-[#FFC107]" />
                              Confirm Bar Selection
                            </DialogTitle>
                            <DialogDescription className="text-gray-200">
                              Are you sure you want to add your G Split to {selectedBar?.name}?
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="p-4 mb-4 bg-gray-50 rounded-md border border-gray-200 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 opacity-10">
                                <Beer className="w-full h-full text-[#0D3B1A]" />
                              </div>
                              <div className="font-medium text-lg">{selectedBar?.name}</div>
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-gray-500" />
                                {selectedBar?.address}
                              </div>
                            </div>
                            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-md">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 rounded-full bg-[#FFC107]/20 flex items-center justify-center">
                                    <Trophy className="h-5 w-5 text-[#FFC107]" />
                                  </div>
                                </div>
                                <div>
                                  <p className="font-bold text-gray-800">Become Part of Pub History!</p>
                                  <p className="text-sm text-gray-600">
                                    Your score will be displayed on this bar's wall of fame!
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-white rounded-md">
                                <Beer className="h-6 w-6 text-[#764C25]" />
                                <div>
                                  <div className="font-medium">Your G Split Score:</div>
                                  <div className="font-bold text-lg text-[#0D3B1A]">
                                    {analysisResult.analyzeResult.score ? 
                                    (analysisResult.analyzeResult.score * 100).toFixed(1) : 0}%
                                    <span className="ml-2 text-sm text-gray-500">Grade: {analysisResult.analyzeResult.letterGrade}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="flex justify-end gap-3 sm:gap-2 border-t border-gray-100 pt-4">
                            <Button
                              variant="outline"
                              onClick={handleCancelAddToBar}
                              className="flex items-center gap-1"
                              disabled={loading}
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </Button>
                            <Button
                              onClick={handleConfirmAddToBar}
                              className="bg-gradient-to-r from-[#0D3B1A] to-[#0D3B1A] hover:from-[#0A2E14] hover:to-[#154a29] text-white shadow-md flex items-center gap-1 border border-[#FFC107]"
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4" />
                                  Add to Wall of Fame!
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                          
                          {/* Loading overlay for the entire modal */}
                          {loading && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                              <div className="flex flex-col items-center bg-white p-6 rounded-lg shadow-lg border border-[#0D3B1A]">
                                <div className="relative">
                                  <div className="w-16 h-16 border-4 border-[#FFC107] border-t-transparent rounded-full animate-spin mb-4"></div>
                                  <Beer className="h-8 w-8 text-[#764C25] absolute top-4 left-4" />
                                </div>
                                <p className="text-[#0D3B1A] font-bold text-lg mb-1">Adding to Bar Wall</p>
                                <p className="text-gray-600 text-sm">Please wait while we update {selectedBar?.name}'s wall of fame</p>
                              </div>
                            </div>
                          )}
                        </>
                      ) : showBarSearch ? (
                        <>
                          <DialogHeader className="bg-gradient-to-r from-[#0D3B1A]/90 to-[#1e3a8a]/90 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg text-white">
                            <div className="absolute top-2 right-2">
                              <span className="inline-block text-2xl animate-bounce">🍺</span>
                            </div>
                            <DialogTitle className="text-xl flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-[#FFC107]" />
                              Add Your Split to a Bar
                            </DialogTitle>
                            <DialogDescription className="text-gray-200">
                              Select a bar to add your G Split to their wall of fame!
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
                              <div className="flex items-start gap-2">
                                <div className="text-amber-500 text-lg mt-0.5">💡</div>
                                <div className="text-gray-700">
                                  <p className="font-medium mb-1">Add your G Split to a bar!</p>
                                  <p>Search for your favorite pubs and add your score to your local's wall of fame.</p>
                                </div>
                              </div>
                            </div>
                            <BarSearch onBarSelect={handleBarSelection} />
                          </div>
                        </>
                      ) : (
                        <>
                          <DialogHeader className="bg-gradient-to-r from-[#0D3B1A]/90 to-[#1e3a8a]/90 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg text-white">
                            <div className="absolute top-2 right-2">
                              <span className="inline-block text-2xl animate-bounce">🍺</span>
                            </div>
                            <DialogTitle className="text-xl flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-[#FFC107]" />
                              Join the Bar Wall of Fame!
                            </DialogTitle>
                            <DialogDescription className="text-gray-200">
                              Show off your G Split skills at your favorite local pubs!
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="flex flex-col gap-4">
                              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-12 h-12 rounded-full bg-[#FFC107]/20 flex items-center justify-center">
                                    <Trophy className="h-6 w-6 text-[#FFC107]" />
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-gray-800">Become a Legend!</h3>
                                    <p className="text-sm text-gray-600">Your G Split will be showcased at local pubs</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                                  <div className="text-xl">🎯</div>
                                  <p className="text-sm text-gray-700">Score: <span className="font-bold text-[#0D3B1A]">{(analysisResult.analyzeResult.score * 100).toFixed(1)}%</span></p>
                                </div>
                              </div>
                              
                              <p className="text-center text-gray-600 text-sm">We'll need to access your location to find nearby bars</p>
                              
                              <div className="flex justify-center gap-3">
                                <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button 
                                  onClick={() => setShowBarSearch(true)}
                                  className="bg-gradient-to-r from-[#FFC107] to-[#FFA000] text-black hover:from-[#FFA000] hover:to-[#FFC107] shadow-md font-bold px-6 py-2"
                                >
                                  Find Nearby Bars
                                </Button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>
                )}
                
                {addedToBar && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border border-green-200 shadow-md relative overflow-hidden group">
                    <div className="absolute inset-0 bg-success-pattern opacity-5"></div>
                    <div className="absolute -bottom-2 right-0 text-4xl opacity-20 transform rotate-12 group-hover:scale-110 transition-transform duration-300">
                      🏆
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-semibold text-green-800">Successfully added to {selectedBar?.name}!</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{selectedBar.name}</span>
                          </div>
                          <a 
                            href={`/bar-wall?bar=${selectedBar.id}`}
                            className="text-sm text-[#FFC107] hover:text-[#ffd454] cursor-pointer z-10 relative"
                          >
                            View On Bar Wall
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProcessPage() {
  return <ProcessPageContent />;
}
