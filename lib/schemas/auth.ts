import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address').transform(v => v.toLowerCase().trim()),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  full_name: z.string().min(1, 'Full name is required').max(200).trim(),
  organization_name: z.string().min(1, 'Organization name is required').max(200).trim(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform(v => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const magicLinkRequestSchema = z.object({
  email: z.string().email('Invalid email address').transform(v => v.toLowerCase().trim()),
});

export type MagicLinkRequestInput = z.infer<typeof magicLinkRequestSchema>;

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address').transform(v => v.toLowerCase().trim()),
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetVerifySchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

export type PasswordResetVerifyInput = z.infer<typeof passwordResetVerifySchema>;

export const inviteAcceptSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  full_name: z.string().min(1, 'Full name is required').max(200).trim(),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;
