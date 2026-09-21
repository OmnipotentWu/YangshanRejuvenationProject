import { NextResponse } from "next/server";
import { publishedArchives } from "../../../lib/content";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(publishedArchives().map((a) => a.id));
}
