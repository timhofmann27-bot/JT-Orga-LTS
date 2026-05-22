import { Router } from 'express';
import { db } from '../../db/index.ts';

export const calendarRouter = Router();

calendarRouter.get('/events', (req, res) => {
  // Return all non-archived and recent archived events for calendar display
  const events = db.prepare(`
    SELECT e.id, e.title, e.date, e.location, e.type, e.description,
      (SELECT COUNT(*) FROM invitees i WHERE i.event_id = e.id) as participant_count
    FROM events e
    WHERE e.is_archived = 0 OR e.date >= date('now', '-30 days')
    ORDER BY e.date ASC
  `).all();
  res.json(events);
});
