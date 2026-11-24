import raw from '../data/content.json';
import type { Content } from '../types';

export const content = raw as Content;

export const focusSkills = new Set(content.profile.focusSkills ?? []);

/** Puts the owner's focus skills first, keeping the rest in source order. */
export function sortByFocus(ids: string[]): string[] {
  return [...ids].sort((a, b) => Number(focusSkills.has(b)) - Number(focusSkills.has(a)));
}
