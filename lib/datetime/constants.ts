import { USDateString, USTimeString } from './types';

export function formatISOToUSDate(iso: string): USDateString {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(
    d.getDate()
  ).padStart(2, '0')}/${d.getFullYear()}` as USDateString;
}

export function formatISOToUSTime(iso: string): USTimeString {
  const d = new Date(iso);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12 || 12;

  return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}` as USTimeString;
}
