import { describe, it, expect } from 'vitest';
import { toAppError } from '../api/core';

describe('Error Normalization (toAppError)', () => {
  it('handles null/undefined gracefully', () => {
    expect(toAppError(null)).toEqual({ message: '未知异常发生' });
    expect(toAppError(undefined)).toEqual({ message: '未知异常发生' });
  });

  it('normalizes simple string errors', () => {
    const err = toAppError('数据库连接断开');
    expect(err).toEqual({ message: '数据库连接断开' });
  });

  it('normalizes JSON string error if structured', () => {
    const jsonStr = JSON.stringify({ code: 'NOT_FOUND', message: '资源未找到', details: 'line 42' });
    const err = toAppError(jsonStr);
    expect(err).toEqual({
      code: 'NOT_FOUND',
      message: '资源未找到',
      details: 'line 42',
    });
  });

  it('normalizes standard Error objects', () => {
    const stdErr = new Error('网络请求超时');
    const err = toAppError(stdErr);
    expect(err.message).toBe('网络请求超时');
    expect(err.details).toBeDefined();
  });

  it('normalizes arbitrary object errors', () => {
    const obj = { code: 'ERR_TIMEOUT', message: 'Timeout reached', details: '3000ms' };
    const err = toAppError(obj);
    expect(err).toEqual({
      code: 'ERR_TIMEOUT',
      message: 'Timeout reached',
      details: '3000ms',
    });
  });
});
