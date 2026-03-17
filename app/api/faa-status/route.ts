export const dynamic = "force-dynamic";

export async function GET() {
  const FAA_URL =
    "https://nasstatus.faa.gov/api/airport-status-information";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(FAA_URL, {
      headers: {
        "User-Agent": "AirportMonitor/1.0 (personal travel app)",
        Accept: "application/xml, text/xml",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`FAA error: ${response.status}`);
    const xml = await response.text();
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    clearTimeout(timeout);
    return Response.json(
      { error: "FAA API unavailable", detail: String(error) },
      { status: 500 }
    );
  }
}
