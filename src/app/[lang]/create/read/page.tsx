import { redirect } from "next/navigation";
import { lp, type Lang } from "@/i18n/config";

/* Create > Read a voice note became the Interpreter on 2026-11-01; an old link lands there. */
export default async function Read({ params }: { params: Promise<{ lang: string }> }) {
  redirect(lp((await params).lang as Lang, "/create/interpret"));
}
