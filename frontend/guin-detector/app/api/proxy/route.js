export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get("url");
  
    if (!imageUrl) return new Response("Missing URL", { status: 400 });
  
    try {
      const response = await fetch(imageUrl, { headers: { "Content-Type": "image/jpeg" } });
      const imageBlob = await response.blob();
  
      return new Response(imageBlob, { headers: { "Content-Type": "image/jpeg" } });
    } catch (error) {
      return new Response("Error fetching image", { status: 500 });
    }
  }
  