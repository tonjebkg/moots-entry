import { USDateString, USTimeString, ISODateTimeString } from './types';
import { parseUSDate, parseUSTime } from './parse';

export function combineToISO(
  date: USDateString,
  time: USTimeString
): ISODateTimeString {
  const { year, month, day } = parseUSDate(date);
  const { hour, minute } = parseUSTime(time);

  return new Date(
    Date.UTC(year, month - 1, day, hour, minute)
  ).toISOString();
}