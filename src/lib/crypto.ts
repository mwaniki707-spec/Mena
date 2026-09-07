/**
 * Storage utility for sensitive app data in localStorage.
 */
export class SecureStorage {
  /**
   * Store data in localStorage
   */
  static setItem<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`mena:${key}`, JSON.stringify(value));
    } catch (error) {
      console.error("Failed to store item:", error);
    }
  }

  /**
   * Retrieve data from localStorage
   */
  static getItem<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(`mena:${key}`) ?? localStorage.getItem(key);
      if (!stored) return null;
      return JSON.parse(stored) as T;
    } catch (error) {
      console.error("Failed to retrieve item:", error);
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  static removeItem(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`mena:${key}`);
    localStorage.removeItem(key);
  }

  /**
   * Clear all mena storage items
   */
  static clear(): void {
    if (typeof window === "undefined") return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith("mena:"))
      .forEach((k) => localStorage.removeItem(k));
  }
}

/**
 * No-op hook for backward compatibility.
 */
export function useSecureStorageInit(): void {}