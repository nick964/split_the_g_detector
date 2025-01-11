"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";

export function EmailSignUpForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
       // Create form data to send file and user details
       const formDataToSend = new FormData();
       formDataToSend.append("userName", formData.name);
       formDataToSend.append("email", formData.email);
       formDataToSend.append("password", formData.password);
       if (formData.profilePicture) {
         formDataToSend.append("profilePicture", formData.profilePicture);
       }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: formDataToSend,
      });


      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create account");
      }

      // Automatically sign in after successful registration
      await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        callbackUrl: "/",
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0]; // Get selected file
    setFormData((prev) => ({ ...prev, profilePicture: file }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="John Doe"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profilePicture">Profile Picture</Label>
        <Input id="profilePicture" name="profilePicture" type="file" accept="image/*" onChange={handleFileChange} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button
        type="submit"
        className="w-full bg-[#FFC107] text-black hover:bg-[#ffd454]"
        disabled={isLoading}
      >
        {isLoading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}