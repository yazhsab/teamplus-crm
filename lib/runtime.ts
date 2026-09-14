// Standard Next.js always uses Supabase. Only the Sites Vite build aliases this
// module to lib/preview/runtime.ts; production has no demo-auth fallback.
export { requireWorkspacePage } from "./server/session";
export { workspaceGET, workspacePOST } from "./server/workspace";
export { filesGET, filesPOST } from "./server/files";
