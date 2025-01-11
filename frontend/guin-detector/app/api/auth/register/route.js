import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const userName = formData.get("userName");
    const email = formData.get("email");
    const password = formData.get("password");
    const profilePicture = formData.get("profilePicture");

    // Validate request data
    if (!userName || !email || !password) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    // Hash password before storing
    const hashedPassword = await hash(password, 10);

    // Check if the user already exists
    const userDoc = doc(db, "users", email);
    const userSnapshot = await getDoc(userDoc);

    if (userSnapshot.exists()) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

     // Upload profile picture if provided
     let profilePictureUrl = null;
     if (profilePicture) {
       const storage = getStorage();
       const storageRef = ref(storage, `profilePics/${email}_${Date.now()}`);
       const fileBuffer = await profilePicture.arrayBuffer();
       await uploadBytes(storageRef, new Uint8Array(fileBuffer));
 
       // Get the URL of the uploaded image
       profilePictureUrl = await getDownloadURL(storageRef);
     }

    // Create user in Firestore
    await setDoc(userDoc, {
      name: userName,
      email,
      password: hashedPassword, // Store hashed password
      createdAt: new Date(),
      image: profilePictureUrl
    });

    return NextResponse.json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
