import { lifeApi } from './life';
import { focusApi } from './focus';
import { traitApi } from './trait';
import { worldApi } from './world';
import { archiveApi } from './archive';
import { staffApi } from './staff';
import { exportApi } from './export';

export * from './types';
export * from './core';
export * from './mock';
export { lifeApi } from './life';
export { focusApi } from './focus';
export { traitApi } from './trait';
export { worldApi } from './world';
export { archiveApi } from './archive';
export { staffApi } from './staff';
export { exportApi } from './export';

/**
 * 统一 API 客户端
 * 同时支持传统平铺调用与现代领域模块化命名空间调用 (§P1-API-01)
 *
 * 示例：
 * - 兼容模式: api.listLives(), api.createFocus(...)
 * - 命名空间: api.life.listLives(), api.focus.createFocus(...)
 */
export const api = {
  // 平铺方法（兼容旧有调用）
  ...lifeApi,
  ...focusApi,
  ...traitApi,
  ...worldApi,
  ...archiveApi,
  ...staffApi,
  ...exportApi,

  // 模块化命名空间
  life: lifeApi,
  focus: focusApi,
  trait: traitApi,
  world: worldApi,
  archive: archiveApi,
  staff: staffApi,
  export: exportApi,
};

export default api;
