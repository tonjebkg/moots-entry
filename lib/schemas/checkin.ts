import { z } from 'zod';

export const checkInGuestSchema = z.object({
  contact_id: z.string().uuid().optional(),
  invitation_id: z.string().uuid().optional(),
  source: z.enum(['INVITATION', 'WALK_IN', 'QR_SCAN']).default('INVITATION'),
  notes: z.string().max(1000).optional(),
});

export type CheckInGuestInput = z.infer<typeof checkInGuestSchema>;

export const walkInSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone is required').max(50),
  company: z.string().min(1, 'Company is required').max(200),
  linkedin_url: z.string().url().max(500).optional().nullable(),
  attached_to_contact_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  // Backward compat: Door View may still send full_name during transition
  full_name: z.string().max(200).optional().nullable(),
});

export type WalkInInput = z.infer<typeof walkInSchema>;

export const checkinSearchSchema = z.object({
  q: z.string().min(1).max(200),
});
