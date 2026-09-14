import { invoke } from '@tauri-apps/api/core';
import type { AppError } from './types';
import { mockHandler } from './mock';

// 检测是否处于 Tauri 桌面容器中
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * 统一将各类运行时错误规范化为标准 AppError
 */
export function toAppError(err: unknown): AppError {
  if (!err) {
    return { message: '未知异常发生' };
  }

  if (typeof err === 'string') {
    // 尝试解析 JSON 错误字符串
    try {
      const parsed = JSON.parse(err);
      if (typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
        return {
          code: parsed.code,
          message: String(parsed.message),
          details: parsed.details ? String(parsed.details) : undefined,
        };
      }
    } catch {
      // 纯字符串错误
    }
    return { message: err };
  }

  if (err instanceof Error) {
    return {
      message: err.message,
      details: err.stack,
    };
  }

  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>;
    return {
      code: typeof record.code === 'string' ? record.code : undefined,
      message: typeof record.message === 'string' ? record.message : JSON.stringify(err),
      details: typeof record.details === 'string' ? record.details : undefined,
    };
  }

  return { message: String(err) };
}

/**
 * 底层 Tauri IPC / 浏览器 Mock 调用通道
 * 提供统一错误捕获、错误规范化及开发调试日志
 */
export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    try {
      return await invoke<T>(cmd, args);
    } catch (err) {
      const appErr = toAppError(err);
      console.error(`[Tauri IPC Error] ${cmd}:`, appErr);
      throw appErr;
    }
  }

  // 浏览器开发调试 Mock 降级支持
  try {
    return mockHandler<T>(cmd, args);
  } catch (err) {
    const appErr = toAppError(err);
    console.error(`[Browser Mock Error] ${cmd}:`, appErr);
    throw appErr;
  }
}
