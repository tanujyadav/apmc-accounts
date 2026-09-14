import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { appSecuritySettings } from "@/db/schema";

// Initial PIN for a fresh installation. The Settings page prominently asks the
// administrator to change it before operational use.
export const DEFAULT_SECURITY_PIN = "1234";

export function hashSecurityPin(pin: string): string {
  return createHash("sha256").update(pin, "utf8").digest("hex");
}

export async function verifySecurityPin(pin: string): Promise<boolean> {
  if (!/^\d{4,8}$/.test(pin)) return false;
  const [settings] = await db.select().from(appSecuritySettings).limit(1);
  const expected = settings?.pinHash ?? hashSecurityPin(DEFAULT_SECURITY_PIN);
  const actualBuffer = Buffer.from(hashSecurityPin(pin), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

// Extra guard for irreversible operations (e.g. full data reset): refuse to
// proceed while the office is still on the factory-default PIN.
export async function isSecurityPinStillDefault(): Promise<boolean> {
  const [settings] = await db.select().from(appSecuritySettings).limit(1);
  if (!settings) return true;
  return settings.pinHash === hashSecurityPin(DEFAULT_SECURITY_PIN);
}
