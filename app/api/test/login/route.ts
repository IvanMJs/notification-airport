import { NextResponse } from "next/server";
import { TEST_USER } from "@/lib/testUser";

export async function POST() {
  if (process.env.TEST_MODE !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  return NextResponse.json({ user: TEST_USER });
}
