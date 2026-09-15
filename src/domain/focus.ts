import type { FocusRelation } from '../api/types';

/**
 * Return whether a directed path exists in the prerequisite graph.
 * Keeping this small pure helper in the domain layer lets the browser mock
 * enforce the same cycle rule as the Rust repository without duplicating UI
 * logic in a component.
 */
export function hasDirectedFocusPath(
  relations: FocusRelation[],
  fromId: string,
  toId: string
): boolean {
  if (fromId === toId) return true;

  const successors = new Map<string, string[]>();
  for (const relation of relations) {
    if (relation.relation_type !== 'prerequisite') continue;
    const next = successors.get(relation.source_focus_id) || [];
    next.push(relation.target_focus_id);
    successors.set(relation.source_focus_id, next);
  }

  const visited = new Set<string>();
  const queue = [fromId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    queue.push(...(successors.get(current) || []));
  }
  return false;
}

export function normalizeMutualFocusEndpoints(sourceId: string, targetId: string) {
  return sourceId < targetId
    ? { sourceId, targetId }
    : { sourceId: targetId, targetId: sourceId };
}
