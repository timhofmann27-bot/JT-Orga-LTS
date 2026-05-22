import { db } from '../db/index.ts';
import { sendPushNotification } from './fcmService.ts';

export async function checkAndSendDeadlineReminders() {
  const now = new Date();

  // Window: deadline is between 23h and 25h from now
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

  const events = db.prepare(`
    SELECT id, title, response_deadline
    FROM events
    WHERE response_deadline IS NOT NULL
      AND response_deadline > ?
      AND response_deadline <= ?
      AND (deadline_reminder_sent IS NULL OR deadline_reminder_sent = 0)
      AND (is_archived IS NULL OR is_archived = 0)
  `).all(windowStart, windowEnd) as { id: number; title: string; response_deadline: string }[];

  for (const event of events) {
    const inviteesToRemind = db.prepare(`
      SELECT i.person_id, i.status
      FROM invitees i
      WHERE i.event_id = ? AND (i.status = 'pending' OR i.status IS NULL OR i.status = 'maybe')
    `).all(event.id) as { person_id: number; status: string | null }[];

    let sent = 0;
    for (const invitee of inviteesToRemind) {
      if (!invitee.person_id) continue;
      const isMaybe = invitee.status === 'maybe';
      await sendPushNotification('person', invitee.person_id, {
        title: `Frist läuft ab: ${event.title}`,
        body: isMaybe
          ? 'Du hast noch mit „Vielleicht" geantwortet — kannst du dich jetzt festlegen?'
          : 'Noch 24 Stunden! Bitte gib jetzt deine Rückmeldung ab.',
        data: { eventId: String(event.id), type: 'deadline_reminder' }
      });
      sent++;
    }

    db.prepare('UPDATE events SET deadline_reminder_sent = 1 WHERE id = ?').run(event.id);
    console.log(`[Reminder] Event "${event.title}" — ${sent} Erinnerungen gesendet.`);
  }
}
