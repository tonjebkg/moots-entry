import { USDateString, USTimeString } from './types';

export function parseUSDate(date: USDateString) {
  const [month, day, year] = date.split('/').map(Number);
  return { year, month, day };
}

export function parseUSTime(time: USTimeString) {
  const [hm, ampm] = time.split(' ');
  let [hour, minute] = hm.split(':').map(Number);

  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  return { hour, minute };
}