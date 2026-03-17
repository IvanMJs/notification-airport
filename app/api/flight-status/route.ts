export const dynamic = "force-dynamic";

const AVIATIONSTACK_BASE = "http://api.aviationstack.com/v1";

export async function GET(req: Request) {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AVIATIONSTACK_API_KEY not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const flightIata = url.searchParams.get("flight_iata") ?? "";
  const flightDate = url.searchParams.get("flight_date") ?? "";

  if (!flightIata.trim()) {
    return Response.json({ error: "flight_iata required" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const params = new URLSearchParams({
      access_key: apiKey,
      flight_iata: flightIata,
      limit: "1",
    });
    if (flightDate) params.set("flight_date", flightDate);

    const res = await fetch(`${AVIATIONSTACK_BASE}/flights?${params}`, {
      headers: { "User-Agent": "AirportMonitor/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`AviationStack returned ${res.status}`);

    const json = await res.json();
    return Response.json(json, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    });
  } catch (err) {
    clearTimeout(timeout);
    return Response.json(
      { error: "AviationStack unavailable", detail: String(err) },
      { status: 502 },
    );
  }
}
