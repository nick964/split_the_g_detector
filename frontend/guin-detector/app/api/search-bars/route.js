import { NextRequest, NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const keyWord = searchParams.get("keyWord");

    if (!keyWord) {
      return NextResponse.json({ error: "Key word is required." }, { status: 400 });
    }

    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

    // Use the Places Text Search endpoint instead of Nearby Search
    const url = `https://places.googleapis.com/v1/places:searchText`;

    const payload = {
      textQuery: keyWord,
      includedType: "bar", // Only include bars and restaurants
      maxResultCount: 20
    };
    
    console.log('logging request');
    console.log(JSON.stringify(payload));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.rating,places.id,places.name,places.photos",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.log(response);
      throw new Error(`Google API Error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.places || data.places.length === 0) {
      return NextResponse.json({ message: "No places found matching your search." }, { status: 404 });
    }



    // Map the response to a flattened structure
    const mappedPlaces = data.places.map(place => ({
      id: place.id,
      formattedAddress: place.formattedAddress || "No address available",
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      rating: place.rating || null,
      displayName: place.displayName?.text || "Unnamed Bar",
      photoName: getPhotoName(place.photos)
    }));

    // loging the mapped places
    console.log('logging mapped places');
    console.log(JSON.stringify(mappedPlaces));

    return NextResponse.json(mappedPlaces, { status: 200 });
  } catch (error) {
    console.error("Error searching for places:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function getPhotoName(photos) {
  if (!photos || photos.length === 0) {
    return null;
  }

  const photo = photos[0];
  return photo.name;
}