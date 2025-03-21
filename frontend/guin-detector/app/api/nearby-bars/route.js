import { NextRequest, NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
      return NextResponse.json({ error: "Latitude and longitude are required." }, { status: 400 });
    }

    const latitude = parseFloat(lat).toFixed(3);
    const longitude = parseFloat(lon).toFixed(3);

    const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    const radius = 5000; // 5km search radius

    const url = `https://places.googleapis.com/v1/places:searchNearby`;

    const payload = {
      includedTypes: ["bar"], // Only include bars and restaurants
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: Number(latitude), longitude: Number(longitude) },
          radius: radius,
        },
      }
    };
    console.log('logging request');
    console.log(JSON.stringify(payload));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.id,places.rating",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.log(response);
      throw new Error(`Google API Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(JSON.stringify(data));

    if (!data.places || data.places.length === 0) {
      return NextResponse.json({ message: "No Guinness bars found nearby." }, { status: 404 });
    }

    // Map the response to a flattened structure
    const mappedPlaces = data.places.map(place => ({
      id: place.id,
      formattedAddress: place.formattedAddress || "No address available",
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      rating: place.rating || null,
      displayName: place.displayName?.text || "Unnamed Bar"
    }));

    return NextResponse.json(mappedPlaces, { status: 200 });
  } catch (error) {
    console.error("Error fetching nearby bars:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
