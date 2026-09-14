import WorkspaceApp from "@/components/workspace-app";
import { requireWorkspacePage } from "@/lib/runtime";
export const dynamic = "force-dynamic";
export default async function Home() {
  const mode = await requireWorkspacePage();
  return <WorkspaceApp mode={mode} />;
}
