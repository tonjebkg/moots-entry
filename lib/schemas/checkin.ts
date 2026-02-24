import { z } from 'zod';

export const checkInGuestSchema = z.object({
  contact_id: z.string().uuid().optional(),
  invitation_id: z.string().uuid().optional(),
  source: z.enum(['INVITATION', 'WALK_IN', 'QR_SCAN']).default('INVITATION'),
  notes: z.string().max(1000).optional(),
});

export type CheckInGuestInput = z.infer<typeof checkInGuestSchema>;

export const walkInSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email().optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type WalkInInput = z.infer<typeof walkInSchema>;

export const checkinSearchSchema = z.object({
  q: z.string().min(1).max(200),
});
