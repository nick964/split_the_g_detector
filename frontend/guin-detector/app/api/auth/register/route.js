import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { userName, email, password } = await req.json();

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

    // Create user in Firestore
    await setDoc(userDoc, {
      name: userName,
      email,
      password: hashedPassword, // Store hashed password
      createdAt: new Date(),
    });

    return NextResponse.json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
