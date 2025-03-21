import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '../../../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, setDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
const storage = getStorage();

const GOOGLE_PHOTO_BASE_URL = 'https://places.googleapis.com/v1/';
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

export async function POST(request) {
  try {
    // Verify authenticationß
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the request data
    const body = await request.json();
    const { 
      userId, 
      userName, 
      barId, 
      barName, 
      guinnessId, 
      score, 
      letterGrade, 
      time, 
      imageUrl,
      photoName,
      latitude,
      longitude,
      formattedAddress
    } = body;

    // Validate required fields
    if (!userId || !barId || !barName || !guinnessId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Update the user's guinness document with bar information
    const userDocRef = doc(db, 'users', userId);
    const guinnessDocRef = doc(collection(userDocRef, 'guinness'), guinnessId);
    
    // Check if the guinness document exists
    const guinnessDoc = await getDoc(guinnessDocRef);
    if (!guinnessDoc.exists()) {
      return NextResponse.json(
        { error: 'Guinness document not found' },
        { status: 404 }
      );
    }

    // Update the guinness document with bar information
    await updateDoc(guinnessDocRef, {
      barId,
      barName,
      updatedAt: new Date().toISOString()
    });

    // 2. Add or update the bar in the 'bars' collection
    const barDocRef = doc(db, 'bars', barId);
    const barDoc = await getDoc(barDocRef);
    
    const guinnessData = {
      id: guinnessId,
      userId,
      userName,
      score,
      letterGrade,
      time,
      imageUrl,
      timestamp: Timestamp.now()
    };

    if (barDoc.exists()) {
      // Bar exists, add this guinness to its collection
      const barGuinnessCollectionRef = collection(barDocRef, 'guinnesses');
      await addDoc(barGuinnessCollectionRef, guinnessData);
      
      // Update the bar document with latest activity
      await updateDoc(barDocRef, {
        lastActivity: new Date().toISOString(),
        pourCount: (barDoc.data().pourCount || 0) + 1
      });
    } else { 
      var photoUrl = null;
      if(photoName) {
        const blob = await callGooglePlacesApi(photoName);
        const filename = `${barId}-barLogo.jpg`;
        const storageRef = ref(storage, `barPhotos/${filename}`);
        await uploadBytes(storageRef, blob);
        photoUrl = await getDownloadURL(storageRef);
      }
      // Bar doesn't exist, create it with this guinness
      await setDoc(barDocRef, {
        id: barId,
        name: barName,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        pourCount: 1,
        photoName,
        latitude,
        longitude,
        formattedAddress,
        photoUrl
      });
      
      // Add the guinness to the new bar's collection
      const barGuinnessCollectionRef = collection(barDocRef, 'guinnesses');
      await addDoc(barGuinnessCollectionRef, guinnessData);
    }

    return NextResponse.json({
      success: true,
      message: 'Guinness added to bar successfully'
    });

  } catch (error) {
    console.error('Error adding Guinness to bar:', error);
    return NextResponse.json(
      { error: 'Failed to add Guinness to bar' },
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