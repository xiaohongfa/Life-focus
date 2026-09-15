import type { Trait, TraitRelation } from '../api/types';

/**
 * 判断特质是否处于激活上阵状态 (active)
 */
export function isTraitActive(trait: Trait): boolean {
  return trait.equip_state === 'active';
}

/**
 * 判断特质是否处于雪藏/下阵状态 (benched)
 */
export function isTraitBenched(trait: Trait): boolean {
  return trait.equip_state === 'benched';
}

/**
 * 判断特质是否处于未上阵状态 (unequipped)
 */
export function isTraitUnequipped(trait: Trait): boolean {
  return trait.equip_state === 'unequipped' || !trait.equip_state;
}

/**
 * 拓扑环检测：检测有向图中是否存在从 fromId 到 toId 的有向路径
 */
export function hasDirectedPath(
  relations: TraitRelation[],
  fromId: string,
  toId: string,
  visited = new Set<string>()
): boolean {
  if (fromId === toId) return true;
  if (visited.has(fromId)) return false;
  const nextVisited = new Set(visited);
  nextVisited.add(fromId);

  const directSuccessors = relations
    .filter((r) => r.predecessor_id === fromId)
    .map((r) => r.successor_id);

  for (const succ of directSuccessors) {
    if (hasDirectedPath(relations, succ, toId, nextVisited)) {
      return true;
    }
  }
  return false;
}

/**
 * 核心领域规则：根据特质谱系连通分量与 equip_state 计算全局激活生效的特质列表
 * 与 Rust 后端 `Repository::resolve_active_equipped_traits` 保持严格一致
 */
export function resolveActiveEquippedTraits(traits: Trait[], relations: TraitRelation[]): Trait[] {
  if (traits.length === 0) return [];

  const unarchived = traits.filter((t) => !t.archived_at);
  const adj = new Map<string, string[]>();
  for (const r of relations) {
    if (!adj.has(r.predecessor_id)) adj.set(r.predecessor_id, []);
    if (!adj.has(r.successor_id)) adj.set(r.successor_id, []);
    adj.get(r.predecessor_id)!.push(r.successor_id);
    adj.get(r.successor_id)!.push(r.predecessor_id);
  }

  const traitMap = new Map<string, Trait>();
  for (const t of unarchived) traitMap.set(t.id, t);

  const visited = new Set<string>();
  const activeTraits: Trait[] = [];

  for (const t of unarchived) {
    if (visited.has(t.id)) continue;

    const compIds: string[] = [];
    const queue = [t.id];
    visited.add(t.id);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      compIds.push(curr);
      const neighbors = adj.get(curr) || [];
      for (const n of neighbors) {
        if (traitMap.has(n) && !visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }

    const component = compIds.map((id) => traitMap.get(id)!).filter(Boolean);
    if (component.length === 0) continue;

    if (component.length === 1) {
      const single = component[0];
      if (!isTraitBenched(single)) {
        activeTraits.push(single);
      }
    } else {
      const active = component.find((item) => isTraitActive(item));
      if (active) {
        activeTraits.push(active);
      } else {
        const hasBenched = component.some((item) => isTraitBenched(item));
        if (!hasBenched) {
          const succSet = new Set(relations.map((r) => r.successor_id));
          const root = component.find((item) => !succSet.has(item.id)) || component[0];
          activeTraits.push(root);
        }
      }
    }
  }

  return activeTraits;
}
