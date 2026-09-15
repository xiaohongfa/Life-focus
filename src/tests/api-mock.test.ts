import { describe, it, expect } from 'vitest';
import { mockHandler, mockData } from '../api/mock';
import type { Life, ArchiveItem } from '../api/types';

describe('Browser Mock Contract & Operations', () => {
  it('lists existing mock lives', () => {
    const lives = mockHandler<Life[]>('list_lives');
    expect(Array.isArray(lives)).toBe(true);
    expect(lives.length).toBeGreaterThanOrEqual(1);
    expect(lives[0].name).toBe('第一人生');
  });

  it('creates life and initializes default entities', () => {
    const newLife = mockHandler<Life>('create_life', { name: '自动化测试人生' });
    expect(newLife.id).toBeDefined();
    expect(newLife.name).toBe('自动化测试人生');

    // 验证单例对象被同步初始化
    expect(mockData.leaders[newLife.id]).toBeDefined();
    expect(mockData.leaders[newLife.id].name).toBe('最高统帅');
    expect(mockData.situations[newLife.id]).toBeDefined();
    expect(mockData.philosophies[newLife.id]).toBeDefined();
    expect(mockData.stability[newLife.id]).toBeDefined();

    // 验证默认注入5位战略参谋
    const staff = mockData.staffMembers.filter((m) => m.life_id === newLife.id);
    expect(staff.length).toBe(5);
  });

  it('renames an existing life', () => {
    const newLife = mockHandler<Life>('create_life', { name: '待改名人生' });
    mockHandler('rename_life', { lifeId: newLife.id, name: '已改名人生' });
    const found = mockData.lives.find((l) => l.id === newLife.id);
    expect(found?.name).toBe('已改名人生');
  });

  it('cascades and cleans up all data on delete_life', () => {
    const newLife = mockHandler<Life>('create_life', { name: '待删除人生' });
    const lifeId = newLife.id;

    // 为该人生添加关联数据
    mockHandler('create_focus', { lifeId, title: '专项国策', status: 'active', positionX: 0, positionY: 0 });
    mockHandler('create_trait', { lifeId, title: '专项特质' });
    mockHandler('create_world_snapshot', { lifeId, name: '备份快照', payloadJson: '{}' });

    expect(mockData.foci.some((f) => f.life_id === lifeId)).toBe(true);
    expect(mockData.traits.some((t) => t.life_id === lifeId)).toBe(true);
    expect(mockData.snapshots.some((s) => s.life_id === lifeId)).toBe(true);
    expect(mockData.leaders[lifeId]).toBeDefined();

    // 执行删除
    mockHandler('delete_life', { lifeId });

    // 验证级联清理完成
    expect(mockData.lives.some((l) => l.id === lifeId)).toBe(false);
    expect(mockData.foci.some((f) => f.life_id === lifeId)).toBe(false);
    expect(mockData.traits.some((t) => t.life_id === lifeId)).toBe(false);
    expect(mockData.snapshots.some((s) => s.life_id === lifeId)).toBe(false);
    expect(mockData.staffMembers.some((m) => m.life_id === lifeId)).toBe(false);
    expect(mockData.leaders[lifeId]).toBeUndefined();
    expect(mockData.situations[lifeId]).toBeUndefined();
    expect(mockData.philosophies[lifeId]).toBeUndefined();
    expect(mockData.stability[lifeId]).toBeUndefined();
  });

  it('aggregates archive feed with correct types and ordering', () => {
    const life = mockHandler<Life>('create_life', { name: '归档测试人生' });
    const lifeId = life.id;

    mockHandler('create_event', { lifeId, title: '历史大转折', kind: 'super', occurredOn: '2026-01-01', quote: '开端' });
    mockHandler('create_essay', { lifeId, title: '新年寄语', bodyMd: '沉淀心境' });

    const feed = mockHandler<ArchiveItem[]>('get_archive_feed', { lifeId });
    expect(feed.length).toBeGreaterThanOrEqual(2);
    expect(feed.some((item) => item.item_type === 'super_event' && item.title === '历史大转折')).toBe(true);
    expect(feed.some((item) => item.item_type === 'essay' && item.title.includes('新年寄语'))).toBe(true);
  });

  it('rejects invalid enum values and cross-life relations like the backend', () => {
    const lifeA = mockHandler<Life>('create_life', { name: 'Mock隔离A' });
    const lifeB = mockHandler<Life>('create_life', { name: 'Mock隔离B' });
    const focusA = mockHandler<{ id: string }>('create_focus', {
      lifeId: lifeA.id,
      title: 'A',
      status: 'active',
      positionX: 0,
      positionY: 0,
    });
    const focusB = mockHandler<{ id: string }>('create_focus', {
      lifeId: lifeB.id,
      title: 'B',
      status: 'active',
      positionX: 0,
      positionY: 0,
    });

    expect(() => mockHandler('create_focus', {
      lifeId: lifeA.id,
      title: '非法状态',
      status: 'not-a-status',
      positionX: 0,
      positionY: 0,
    })).toThrow();
    expect(() => mockHandler('add_focus_relation', {
      lifeId: lifeA.id,
      sourceId: focusA.id,
      targetId: focusB.id,
      relationType: 'prerequisite',
    })).toThrow();
  });

  it('prevents mock prerequisite cycles and normalizes mutual exclusions', () => {
    const life = mockHandler<Life>('create_life', { name: 'Mock图约束' });
    const createFocus = (title: string) => mockHandler<{ id: string }>('create_focus', {
      lifeId: life.id,
      title,
      status: 'active',
      positionX: 0,
      positionY: 0,
    });
    const a = createFocus('A');
    const b = createFocus('B');
    const c = createFocus('C');

    mockHandler('add_focus_relation', { lifeId: life.id, sourceId: a.id, targetId: b.id, relationType: 'prerequisite' });
    mockHandler('add_focus_relation', { lifeId: life.id, sourceId: b.id, targetId: c.id, relationType: 'prerequisite' });
    expect(() => mockHandler('add_focus_relation', {
      lifeId: life.id,
      sourceId: c.id,
      targetId: a.id,
      relationType: 'prerequisite',
    })).toThrow();

    const first = mockHandler<{ id: string; source_focus_id: string; target_focus_id: string }>('add_focus_relation', {
      lifeId: life.id,
      sourceId: a.id,
      targetId: c.id,
      relationType: 'mutually_exclusive',
    });
    const duplicate = mockHandler<{ id: string }>('add_focus_relation', {
      lifeId: life.id,
      sourceId: c.id,
      targetId: a.id,
      relationType: 'mutually_exclusive',
    });
    expect(duplicate.id).toBe(first.id);
    expect(first.source_focus_id < first.target_focus_id).toBe(true);
  });
});
