import { cache } from "react";
import { db } from "@/db";
import { apmcProfile } from "@/db/schema";

// Deduplicates profile reads within the same server render (layout + page).
// It is request-scoped, so a saved profile is visible on the next request.
export const getApmcProfile = cache(async () => {
  const [profile] = await db.select().from(apmcProfile).limit(1);
  return profile;
});
