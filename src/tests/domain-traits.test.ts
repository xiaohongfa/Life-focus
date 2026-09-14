import { describe, it, expect } from 'vitest';
import {
  isTraitActive,
  isTraitBenched,
  isTraitUnequipped,
  hasDirectedPath,
  resolveActiveEquippedTraits,
} from '../domain/traits';
import type { Trait, TraitRelation } from '../api/types';

describe('Domain Traits Logic', () => {
  const mockTrait = (overrides: Partial<Trait>): Trait => ({
    id: 't-1',
    life_id: 'l-1',
    title: 'Test Trait',
    body_md: 'Desc',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  describe('Predicates', () => {
    it('correctly evaluates equip_state active', () => {
      expect(isTraitActive(mockTrait({ equip_state: 'active' }))).toBe(true);
      expect(isTraitActive(mockTrait({ equip_state: 'benched' }))).toBe(false);
      expect(isTraitActive(mockTrait({ equip_state: 'unequipped' }))).toBe(false);
    });

    it('falls back to icon for legacy records', () => {
      expect(isTraitActive(mockTrait({ equip_state: null, icon: 'active' }))).toBe(true);
      expect(isTraitBenched(mockTrait({ equip_state: null, icon: 'benched' }))).toBe(true);
      expect(isTraitUnequipped(mockTrait({ equip_state: null, icon: 'other' }))).toBe(true);
    });

    it('correctly evaluates equip_state benched and unequipped', () => {
      expect(isTraitBenched(mockTrait({ equip_state: 'benched' }))).toBe(true);
      expect(isTraitBenched(mockTrait({ equip_state: 'active' }))).toBe(false);
      expect(isTraitUnequipped(mockTrait({ equip_state: 'unequipped' }))).toBe(true);
      expect(isTraitUnequipped(mockTrait({ equip_state: 'active' }))).toBe(false);
    });
  });

  describe('Directed Path & Cycle Detection', () => {
    const relations: TraitRelation[] = [
      { id: 'r1', life_id: 'l1', predecessor_id: 'A', successor_id: 'B', occurred_at: '' },
      { id: 'r2', life_id: 'l1', predecessor_id: 'B', successor_id: 'C', occurred_at: '' },
      { id: 'r3', life_id: 'l1', predecessor_id: 'C', successor_id: 'D', occurred_at: '' },
    ];

    it('finds path from predecessor to transitive successor', () => {
      expect(hasDirectedPath(relations, 'A', 'B')).toBe(true);
      expect(hasDirectedPath(relations, 'A', 'C')).toBe(true);
      expect(hasDirectedPath(relations, 'A', 'D')).toBe(true);
    });

    it('returns false for reverse or non-connected pairs', () => {
      expect(hasDirectedPath(relations, 'D', 'A')).toBe(false);
      expect(hasDirectedPath(relations, 'B', 'A')).toBe(false);
      expect(hasDirectedPath(relations, 'A', 'Z')).toBe(false);
    });

    it('detects self-loop as path', () => {
      expect(hasDirectedPath(relations, 'A', 'A')).toBe(true);
    });
  });

  describe('resolveActiveEquippedTraits', () => {
    it('returns empty array when traits is empty', () => {
      expect(resolveActiveEquippedTraits([], [])).toEqual([]);
    });

    it('resolves standalone unbenched traits', () => {
      const traits = [
        mockTrait({ id: 't1', title: 'Trait 1', equip_state: 'unequipped' }),
        mockTrait({ id: 't2', title: 'Trait 2', equip_state: 'benched' }),
      ];
      const active = resolveActiveEquippedTraits(traits, []);
      expect(active.map((t) => t.id)).toEqual(['t1']);
    });

    it('resolves active stage in a multi-stage lineage chain', () => {
      const traits = [
        mockTrait({ id: 's1', title: 'Stage 1', equip_state: 'unequipped' }),
        mockTrait({ id: 's2', title: 'Stage 2', equip_state: 'active' }),
        mockTrait({ id: 's3', title: 'Stage 3', equip_state: 'unequipped' }),
      ];
      const relations: TraitRelation[] = [
        { id: 'r1', life_id: 'l1', predecessor_id: 's1', successor_id: 's2', occurred_at: '' },
        { id: 'r2', life_id: 'l1', predecessor_id: 's2', successor_id: 's3', occurred_at: '' },
      ];
      const active = resolveActiveEquippedTraits(traits, relations);
      expect(active.map((t) => t.id)).toEqual(['s2']);
    });

    it('defaults to root trait if no stage marked active and not benched', () => {
      const traits = [
        mockTrait({ id: 's1', title: 'Stage 1', equip_state: 'unequipped' }),
        mockTrait({ id: 's2', title: 'Stage 2', equip_state: 'unequipped' }),
      ];
      const relations: TraitRelation[] = [
        { id: 'r1', life_id: 'l1', predecessor_id: 's1', successor_id: 's2', occurred_at: '' },
      ];
      const active = resolveActiveEquippedTraits(traits, relations);
      expect(active.map((t) => t.id)).toEqual(['s1']);
    });

    it('resolves nothing if lineage chain has any benched member', () => {
      const traits = [
        mockTrait({ id: 's1', title: 'Stage 1', equip_state: 'benched' }),
        mockTrait({ id: 's2', title: 'Stage 2', equip_state: 'unequipped' }),
      ];
      const relations: TraitRelation[] = [
        { id: 'r1', life_id: 'l1', predecessor_id: 's1', successor_id: 's2', occurred_at: '' },
      ];
      const active = resolveActiveEquippedTraits(traits, relations);
      expect(active).toEqual([]);
    });

    it('filters out archived traits', () => {
      const traits = [
        mockTrait({ id: 't1', title: 'Trait 1', equip_state: 'active', archived_at: new Date().toISOString() }),
        mockTrait({ id: 't2', title: 'Trait 2', equip_state: 'active', archived_at: null }),
      ];
      const active = resolveActiveEquippedTraits(traits, []);
      expect(active.map((t) => t.id)).toEqual(['t2']);
    });
  });
});
