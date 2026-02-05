// lib/datetime/types.ts

export type USDateString = `${number}/${number}/${number}`; // MM/DD/YYYY
export type USTimeString = `${number}:${number} ${'AM' | 'PM'}`; // hh:mm AM/PM
export type ISODateTimeString = string; // stored / transmitted
