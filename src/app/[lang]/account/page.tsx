import { redirect } from "next/navigation";
import { lp, type Lang } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function Account({ params }: { params: Promise<{ lang: string }> }) {
  redirect(lp((await params).lang as Lang, "/account/keys"));
}
