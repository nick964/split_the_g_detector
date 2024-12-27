import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../lib/firebase';
import { doc, setDoc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import fetch from 'node-fetch';
const apiKey = process.env.NEXT_PUBLIC_GUINESS_API_KEY;

function base64ToUint8Array(base64) {
  const binaryString = atob(base64); // Decode Base64 string to binary
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function POST(request) {
  try {
    // Verify authentication
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the form data from the request
    const body = await request.json();

    const { image, time } = body;
    console.log('logging time', time);

    
    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Extract the Base64 data and file type
    const base64Data = image.split(',')[1];
    const mimeType = image.match(/data:(.*?);base64/)[1];
    const fileExtension = mimeType.split('/')[1];
    const fileName = `image_${Date.now()}.${fileExtension}`;

    // Convert Base64 to Uint8Array
    const imageBuffer = base64ToUint8Array(base64Data);

    const storageRef = ref(storage, 'images/' + fileName);
    const uploadTask = uploadBytesResumable(storageRef, imageBuffer, {
      contentType: mimeType
    });

    // Wait for the upload to complete
    await uploadTask;
    

    // Get the download URL of the uploaded image
    const url = await getDownloadURL(uploadTask.snapshot.ref);

    // Call external image analysis API
    const analyzeResponse = await fetch(
      'https://analyze-image-nwfcxhboma-uc.a.run.app/guin-line-detector/us-central1/analyze_image',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'API-Key': apiKey },
        body: JSON.stringify({ url: url }),
      }
    );
    console.log('logging response from analysis');
    console.log(JSON.stringify(analyzeResponse));
    if (!analyzeResponse.ok) {
      throw new Error('Failed to analyze image');
    }
    const analyzeResult = await analyzeResponse.json();

    if(analyzeResult.status != "success") {
      throw new Error("Image was not analyzed")
    }

    const userDocRef = doc(db, 'users', session.user.email);
    const guinnessCollectionRef = collection(userDocRef, 'guinness');

    // Add a record to the Firestore 'guinness' collection
    const guinnessDoc = {
      userId: session.user.email,
      url,
      timestamp: new Date().toISOString(),
      score: analyzeResult.score,
      sipLength: time
    };

    await addDoc(guinnessCollectionRef, guinnessDoc);

    
    return NextResponse.json({
      success: true,
      message: 'Image processed successfully',
      url: url,
      analsis: analyzeResult
    });

  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}