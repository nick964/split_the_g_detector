import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
const storage = getStorage();

const GOOGLE_PHOTO_BASE_URL = 'https://places.googleapis.com/v1/';
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

export async function POST(request) {
  try {
    // Get the request data
    const body = await request.json();
    const { 
      barId, 
      barName, 
      photoName,
      latitude,
      longitude,
      formattedAddress
    } = body;

    // Validate required fields
    if (!barId || !barName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if bar already exists
    const barDocRef = doc(db, 'bars', barId);
    const barDoc = await getDoc(barDocRef);

    if (barDoc.exists()) {
      return NextResponse.json(
        { error: 'Bar already exists' },
        { status: 400 }
      );
    }

    // Handle bar photo if available
    let photoUrl = null;
    if (photoName) {
      const blob = await callGooglePlacesApi(photoName);
      const filename = `${barId}-barLogo.jpg`;
      const storageRef = ref(storage, `barPhotos/${filename}`);
      await uploadBytes(storageRef, blob);
      photoUrl = await getDownloadURL(storageRef);
    }

    // Create the new bar
    await setDoc(barDocRef, {
      id: barId,
      name: barName,
      createdAt: Timestamp.now(),
      lastActivity: Timestamp.now(),
      pourCount: 0,
      photoName,
      latitude,
      longitude,
      formattedAddress,
      photoUrl
    });

    return NextResponse.json({
      success: true,
      message: 'Bar added successfully'
    });

  } catch (error) {
    console.error('Error adding bar:', error);
    return NextResponse.json(
      { error: 'Failed to add bar' },
      { status: 500 }
    );
  }
}

async function callGooglePlacesApi(photoName) {
  const photoUrl = `${GOOGLE_PHOTO_BASE_URL}${photoName}/media?key=${API_KEY}&maxHeightPx=300`;
  console.log('photoUrl', photoUrl);
  const response = await fetch(photoUrl);
  if(!response.ok) {
    throw new Error('Failed to fetch photo from Google Places');
  }
  return await response.blob();
}