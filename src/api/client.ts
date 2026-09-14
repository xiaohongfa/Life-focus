/**
 * 历史 API 客户端入口（重导出聚合器）
 * 提供 100% 向后兼容性，内部模块已解耦至 `src/api/*` 与 `src/domain/*` (§P1-API-01, §P1-MOCK-03)
 */
export * from './index';
export { resolveActiveEquippedTraits } from '../domain/traits';
export { default } from './index';
