"use client"

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

export default function Upload() {
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { data: session } = useSession();

  const handleCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!imagePreview || !session) return;

    setIsUploading(true);
    try {
      //call the process api in next route
      
      const response = await fetch('/api/process', {
        method: 'POST',
        body: JSON.stringify({ image: imagePreview })
      });
      const result = await response.json();
      console.log(result);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="w-full max-w-md">
        {imagePreview ? (
          <div className="relative">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="w-full rounded-lg shadow-lg"
            />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">Take a picture or select an image</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapture}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              Take Picture
            </button>
          </div>
        )}
      </div>

      {imagePreview && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className={`bg-black text-white px-8 py-3 rounded-full transition-colors ${
            isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </button>
      )}
    </div>
  );
}
