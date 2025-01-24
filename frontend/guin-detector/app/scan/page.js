"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Upload from "../components/upload";
import GuinnessTimer from "../components/GuinnessTimer";
import AnalysisLoader from "../components/AnalysisLoader";
import { Beer, XCircle } from "lucide-react";
import { signIn } from "next-auth/react";

function ProcessPageContent() {
  const { data: session, status } = useSession();
  const [isRecording, setIsRecording] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false); // Add loading state
  const [error, setError] = useState(null);


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

      if (!result.analyzeResult?.score) {
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
          Please sign in to analyze your pour
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
            Perfect Pour Challenge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isRecording && !showUpload && !analysisResult && (
            <div className="text-center space-y-4">
              <p className="text-lg text-gray-600">
                Ready to test your Guinness pouring skills? Click start when
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

              <Button
                onClick={handleTryAgain}
                className="bg-[#FFC107] text-black hover:bg-[#ffd454]"
              >
                Try Again
              </Button>
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
