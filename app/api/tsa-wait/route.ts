export const dynamic = "force-dynamic";

const TSA_URL = "https://apps.tsa.dhs.gov/mytsa/ctt_data.xml";

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(TSA_URL, {
      headers: { "User-Agent": "AirportMonitor/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`TSA returned ${res.status}`);

    const xml = await res.text();
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=600, s-maxage=600",
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    return Response.json(
      { error: "TSA unavailable", detail: String(err) },
      { status: 502 },
    );
  }
}
