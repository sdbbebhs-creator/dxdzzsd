import { useSyncExternalStore } from 'react';
import { getFSRSSettings, subscribeFSRSSettings, type FSRSSettings } from '../utils/fsrs';

/**
 * Đọc cài đặt FSRS dùng chung. Component sẽ tự re-render mỗi khi cài đặt
 * thay đổi (từ modal Cài đặt, trợ lý AI hoặc tab trình duyệt khác).
 */
export function useFSRSSettings(): FSRSSettings {
  return useSyncExternalStore(subscribeFSRSSettings, getFSRSSettings, getFSRSSettings);
}
