import { requireChatGPTUser } from "@/app/chatgpt-auth";
export { GET as workspaceGET, POST as workspacePOST } from "./workspace";
export { GET as filesGET, POST as filesPOST } from "./files";
export async function requireWorkspacePage() {
  await requireChatGPTUser("/");
  return "preview" as const;
}
