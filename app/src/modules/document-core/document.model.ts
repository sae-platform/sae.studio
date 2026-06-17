export type DocumentNode = {
  id: string;
  type: string;
  children?: DocumentNode[];
  properties: Record<string, unknown>;
};

export interface DocumentModel {
  id: string;
  kind: string;
  width: number;
  height: number;
  nodes: DocumentNode[];
  variables: Record<string, string>;
  metadata: Record<string, string>;
}

export function createDocument(kind: string, width: number, height: number): DocumentModel {
  return {
    id: crypto.randomUUID(),
    kind,
    width,
    height,
    nodes: [],
    variables: {},
    metadata: {},
  };
}

export function addNode(doc: DocumentModel, node: DocumentNode, parentId?: string): DocumentModel {
  const newNode = { ...node, id: node.id || crypto.randomUUID() };
  if (!parentId) {
    return { ...doc, nodes: [...doc.nodes, newNode] };
  }
  const updateChildren = (nodes: DocumentNode[]): DocumentNode[] =>
    nodes.map((n) =>
      n.id === parentId
        ? { ...n, children: [...(n.children || []), newNode] }
        : n.children
          ? { ...n, children: updateChildren(n.children) }
          : n,
    );
  return { ...doc, nodes: updateChildren(doc.nodes) };
}

export function removeNode(doc: DocumentModel, nodeId: string): DocumentModel {
  const filterNodes = (nodes: DocumentNode[]): DocumentNode[] =>
    nodes
      .filter((n) => n.id !== nodeId)
      .map((n) => (n.children ? { ...n, children: filterNodes(n.children) } : n));
  return { ...doc, nodes: filterNodes(doc.nodes) };
}
