import { notFound } from "next/navigation";
import { getTree } from "@/lib/queries";
import { hasRole, requireTreePage } from "@/lib/permissions";
import { TreeNav } from "@/components/layout/tree-nav";

export default async function TreeLayout({ children, params }: { children: React.ReactNode; params: Promise<{ treeId: string }> }) {
  const { treeId } = await params;
  const { role } = await requireTreePage(treeId);
  const tree = await getTree(treeId);
  if (!tree) notFound();
  return (
    <>
      <div className="border-b bg-card/50">
        <div className="mx-auto max-w-7xl space-y-2 px-4 pt-4 pb-2 sm:px-6">
          <h1 className="truncate text-2xl font-bold">{tree.name}</h1>
          <TreeNav treeId={treeId} isAdmin={hasRole(role, "ADMIN")} canEdit={hasRole(role, "EDITOR")} />
        </div>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
