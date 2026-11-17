import { Suspense } from "react";
import { getFamilyData, getTree } from "@/lib/queries";
import { hasRole, requireTreePage } from "@/lib/permissions";
import { FamilyTreeView } from "@/components/tree/family-tree-view";

export default async function TreePage({ params }: { params: Promise<{ treeId: string }> }) {
  const { treeId } = await params;
  const { role } = await requireTreePage(treeId);
  const [tree, data] = await Promise.all([getTree(treeId), getFamilyData(treeId)]);
  return (
    <Suspense>
      <FamilyTreeView
        data={data}
        title={tree?.name ?? "Silsilah"}
        profileHrefBase={`/trees/${treeId}/members`}
        canEdit={hasRole(role, "EDITOR")}
      />
    </Suspense>
  );
}
