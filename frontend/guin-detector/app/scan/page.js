"use client"

import { useSession } from "next-auth/react"
import { SessionProvider } from "next-auth/react";
import Upload from "../components/upload";
import { useState } from "react";

function ProcessPageContent() {
  const { data: session, status } = useSession();
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleImageUploaded = async (imageData) => {
    try {
      // Call your API endpoint to analyze the image
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          userId: session?.user?.email
        })
      });

      const result = await response.json();
      setAnalysisResult(result);
      
    } catch (error) {
      console.error('Error analyzing image:', error);
    }
  };

  if (status === "loading") {   
    return <div>Loading...</div>
  }

  if (!session) {
    return <div>You are not logged in</div>
  }

  return (
    <div>
      <h1>Upload Guinness Images</h1>
      <Upload onImageUploaded={handleImageUploaded} />
      
      {analysisResult && (
        <div className="mt-8">
          <h2>Analysis Result</h2>
          <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default function ProcessPage() {
  return (
    <SessionProvider>
      <ProcessPageContent />
    </SessionProvider>
  );
}