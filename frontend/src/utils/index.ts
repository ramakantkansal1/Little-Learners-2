import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  });
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export const STAGE_COLORS: Record<string, string> = {
  playgroup: "#FFB3BA",
  nursery: "#BAFFC9",
  lkg: "#BAE1FF",
  ukg: "#FFFFBA",
};

export const STAGE_ICONS: Record<string, string> = {
  playgroup: "baby",
  nursery: "blocks",
  lkg: "abc",
  ukg: "book",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  image_selection: "Image Selection",
  color_identification: "Color Identification",
  shape_matching: "Shape Matching",
  picture_matching: "Picture Matching",
  alphabet_recognition: "Alphabet Recognition",
  letter_sound: "Letter Sound",
  number_recognition: "Number Recognition",
  counting: "Counting",
  sorting: "Sorting",
  sequencing: "Sequencing",
  tracing: "Tracing",
  story_listening: "Story Listening",
  picture_comprehension: "Picture Comprehension",
  simple_quiz: "Simple Quiz",
  audio_identification: "Audio Identification",
};

export const REWARD_TYPE_LABELS: Record<string, string> = {
  star: "Star",
  sticker: "Sticker",
  badge: "Badge",
  certificate: "Certificate",
};

export const REWARD_TYPE_ICONS: Record<string, string> = {
  star: "star",
  sticker: "award",
  badge: "medal",
  certificate: "file-text",
};
