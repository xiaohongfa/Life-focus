/**
 * 冒险时长（存活时长：年月日时分）精密计算与持久化模块
 */

const STORAGE_KEY = 'life_strategy_birth_date';

export interface SurvivalDuration {
  isSet: boolean;
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  formatted: string;
}

export function getStoredBirthDate(lifeId?: string): string {
  try {
    if (lifeId) {
      const perLife = localStorage.getItem(`${STORAGE_KEY}_${lifeId}`);
      if (perLife) return perLife;
    }
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredBirthDate(dateStr: string, lifeId?: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, dateStr);
    if (lifeId) {
      localStorage.setItem(`${STORAGE_KEY}_${lifeId}`, dateStr);
    }
    window.dispatchEvent(new Event('birthdate-changed'));
  } catch {}
}

export function calculateSurvivalTime(
  birthDateStr?: string | null,
  now: Date = new Date()
): SurvivalDuration {
  if (!birthDateStr || !birthDateStr.trim()) {
    return {
      isSet: false,
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      formatted: '点击设定降生时间',
    };
  }

  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) {
    return {
      isSet: false,
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      formatted: '日期格式无效',
    };
  }

  if (birth > now) {
    return {
      isSet: true,
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      formatted: '未来降生时刻',
    };
  }

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  let hours = now.getHours() - birth.getHours();
  let minutes = now.getMinutes() - birth.getMinutes();

  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }
  if (hours < 0) {
    hours += 24;
    days -= 1;
  }
  if (days < 0) {
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthDays;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return {
    isSet: true,
    years,
    months,
    days,
    hours,
    minutes,
    formatted: `${years}年 ${months}月 ${days}天 ${hours}时 ${minutes}分`,
  };
}
