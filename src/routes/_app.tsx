import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { rangeSearchSchema } from "@/lib/range";

export const Route = createFileRoute("/_app")({
  validateSearch: rangeSearchSchema,
  component: AppShell,
});
