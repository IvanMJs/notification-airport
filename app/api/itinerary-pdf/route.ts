import { createClient } from "@/utils/supabase/server";
import { TripTab } from "@/lib/types";
import { generateItineraryHtml } from "@/lib/itineraryPdf";

// POST /api/itinerary-pdf
// Body: { trip: TripTab; locale?: "es" | "en" }
// Returns: HTML page that auto-triggers print dialog
export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { trip?: TripTab; locale?: "es" | "en" };
  try {
    body = (await req.json()) as { trip?: TripTab; locale?: "es" | "en" };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { trip, locale = "en" } = body;

  if (!trip || !trip.id || !trip.name) {
    return new Response(JSON.stringify({ error: "Missing required trip fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const itineraryHtml = generateItineraryHtml({ trip, locale });

  // Inject auto-print script before closing </body> tag
  const htmlWithPrint = itineraryHtml.replace(
    "</body>",
    `<script>
  window.addEventListener("load", function () {
    window.print();
  });
</script>
</body>`,
  );

  return new Response(htmlWithPrint, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
