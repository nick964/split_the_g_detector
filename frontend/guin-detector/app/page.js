import Image from "next/image";
import SignIn from "./components/signin";
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">Guinness Line Detector</h1>
        
        <div className="bg-white/30 p-8 rounded-lg backdrop-blur-sm">
          <h2 className="text-2xl font-semibold mb-4">Perfect Pour Analyzer</h2>
          <p className="mb-6">
            Ever wondered if you've mastered the perfect Guinness pour? Our app helps you:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-4 bg-black/5 rounded-lg">
            
              <h3 className="font-bold mb-2">Scan Your Pour</h3>
              <p>Upload a photo of your Guinness and let our AI analyze the line</p>
            </div>
            
            <div className="p-4 bg-black/5 rounded-lg">
              <h3 className="font-bold mb-2">Get Your Score</h3>
              <p>Receive instant feedback on how well you split the G</p>
            </div>
            
            <div className="p-4 bg-black/5 rounded-lg">
              <h3 className="font-bold mb-2">Track Progress</h3>
              <p>Monitor your pouring skills over time and compete with friends</p>
            </div>
          </div>

          <SignIn />

          <div className="text-center">
            <button className="bg-black text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors">
              Start Scanning
            </button>
          </div>
        </div>
      </div>

      <div className="relative mt-16">
        <Image
          src="/guinness-pour.jpg"
          alt="Perfect Guinness Pour"
          width={400}
          height={300}
          className="rounded-lg shadow-lg"
          priority
        />
      </div>
    </main>

  );
}
