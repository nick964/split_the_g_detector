import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Beer, Timer, Camera, Trophy, ArrowRight } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Timer,
    title: "Time Your Sip",
    description: "Start the timer as you begin your sip. Take your time - the perfect split is an art!"
  },
  {
    icon: Camera,
    title: "Capture the Moment",
    description: "After your sip, quickly snap a photo of your glass showing where the foam line intersects with the Guinness logo."
  },
  {
    icon: Trophy,
    title: "Get Your Score",
    description: "Our AI analyzes how perfectly you've split the 'G' in the Guinness logo and gives you a precision score."
  }
];

export default function Home() {
  return (
    <main className="flex flex-col items-center min-h-screen">
      {/* Hero Section */}
      <section className="w-full bg-black text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Beer className="h-12 w-12 text-[#FFC107]" />
            <h1 className="text-5xl font-bold">Split The G</h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Master the perfect Guinness sip by hitting the sweet spot - where the foam line perfectly splits the 'G' in the Guinness logo. Challenge your friends and perfect your technique!
          </p>
          <Link href="/scan">
            <Button className="bg-[#FFC107] text-black hover:bg-[#ffd454] mt-6 text-lg px-8 py-6">
              Start Challenge
              <ArrowRight className="ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 w-full max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-2">
              <CardHeader className="text-center">
                <div className="mx-auto bg-black rounded-full p-3 w-fit mb-4">
                  <feature.icon className="h-8 w-8 text-[#FFC107]" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-gray-600">
                {feature.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Scoring Section */}
      <section className="w-full bg-gray-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold">The Perfect Split</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Precision Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-4xl font-bold text-[#FFC107]">0-100%</div>
                <p className="text-gray-600">
                  Get scored on how accurately you split the 'G' in the Guinness logo. The closer to the middle, the higher your score!
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-xl">Time Challenge</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-4xl font-bold text-[#FFC107]">
                  <span className="font-mono">0.00s</span>
                </div>
                <p className="text-gray-600">
                  Track your sip time with millisecond precision. Compare with friends to find the perfect balance of speed and accuracy!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold">Ready to Perfect Your Split?</h2>
          <p className="text-gray-600">
            Join the community of Guinness enthusiasts and start tracking your splits today.
          </p>
          <Link href="/scan">
            <Button className="bg-black text-white hover:bg-gray-800 mt-4">
              Take the Challenge
              <ArrowRight className="ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}