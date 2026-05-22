import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

export const sanitizeText = (val: string) => sanitizeHtml(val, { allowedTags: [], allowedAttributes: {} });

export const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(100)
});

export const eventSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(100, 'Titel ist zu lang').transform(sanitizeText),
  description: z.string().max(2000, 'Beschreibung ist zu lang').optional().transform(v => v ? sanitizeText(v) : v),
  date: z.string().min(1, 'Datum ist erforderlich'),
  location: z.string().min(1, 'Ort ist erforderlich').max(200, 'Ort ist zu lang').transform(sanitizeText),
  meeting_point: z.string().max(200, 'Treffpunkt ist zu lang').optional().nullable().transform(v => v ? sanitizeText(v) : v),
  response_deadline: z.string().optional().nullable(),
  type: z.enum(['event', 'wanderung', 'sport', 'demo', 'spontan']).default('event')
});

export const personSchema = z.object({
   name: z.string().min(1, 'Name ist erforderlich').max(100).transform(sanitizeText),
   username: z.string().max(50).optional().nullable().transform(v => v ? sanitizeText(v) : v),
   email: z.string().email('Ungültige E-Mail Adresse').max(255).optional().nullable().or(z.literal('')),
   notes: z.string().max(1000).optional().nullable().transform(v => v ? sanitizeText(v) : v),
   avatar_url: z.string().url().optional().nullable()
});

export const inviteSchema = z.object({
  person_id: z.number()
});

export const bulkInviteSchema = z.object({
  person_ids: z.array(z.number())
});

export const respondSchema = z.object({
  status: z.enum(['yes', 'no', 'maybe']),
  comment: z.string().max(500, 'Anmerkung ist zu lang').optional().nullable().transform(v => v ? sanitizeText(v) : v),
  guests_count: z.number().min(0).max(10).optional().default(0)
});

export const settingsSchema = z.object({
  username: z.string().min(1, 'Benutzername ist erforderlich').max(50).transform(sanitizeText),
  avatar_url: z.string().url().optional().nullable(),
  currentPassword: z.string().max(100).optional(),
  newPassword: z.string().max(100).optional()
});

export const setupProfileSchema = z.object({
  username: z.string().min(3, 'Benutzername muss mindestens 3 Zeichen lang sein').max(50).transform(sanitizeText),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein').max(100)
});

export const profileUpdateSchema = z.object({
  username: z.string().min(3).max(50).optional().nullable().transform(v => v ? sanitizeText(v) : v),
  name: z.string().min(1).max(100).optional().nullable().transform(v => v ? sanitizeText(v) : v),
  avatar_url: z.string().url().optional().nullable(),
  currentPassword: z.string().max(100).optional(),
  newPassword: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein').max(100).optional()
});

export const registrationRequestSchema = z.object({
  name: z.string().min(2, 'Name ist zu kurz').max(100).transform(sanitizeText),
  email: z.string().email('Ungültige E-Mail Adresse').max(255).optional().or(z.literal(''))
});

export const registerWithCodeSchema = z.object({
  code: z.string().min(1, 'Code ist erforderlich').max(50),
  username: z.string().min(3, 'Benutzername muss mindestens 3 Zeichen lang sein').max(50).transform(sanitizeText),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein').max(100)
});
