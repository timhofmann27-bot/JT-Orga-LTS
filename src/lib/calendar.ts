export function generateVCalendar(event: { title: string, description: string, location: string, date: string }, eventUrl?: string) {
  const startDate = new Date(event.date);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default to 2 hours

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JT-ORGA//EN',
    'BEGIN:VEVENT',
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}${eventUrl ? `\\n\\nLink zur Einladung: ${eventUrl}` : ''}`,
    `LOCATION:${event.location}`,
    eventUrl ? `URL:${eventUrl}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(event.title || 'Event').replace(/\s+/g, '_')}.ics`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

