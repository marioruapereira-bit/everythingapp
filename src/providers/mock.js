// Sample data so the app runs before any account is connected.
export function createMockProvider(now = () => new Date()) {
  const at = (minutesFromNow, durationMinutes = 30) => {
    const start = new Date(now().getTime() + minutesFromNow * 60_000);
    return { start: start.toISOString(), end: new Date(start.getTime() + durationMinutes * 60_000).toISOString() };
  };

  return {
    name: 'mock',
    async getEvents() {
      return [
        { id: 'e1', title: 'Team standup', ...at(10, 15), location: 'Video call' },
        { id: 'e2', title: 'Dentist', ...at(120, 60), location: 'Main St clinic' },
        { id: 'e3', title: 'Project review', ...at(125, 45), location: 'Room 4' },
        { id: 'e4', title: 'Dinner with Ana', ...at(300, 90), location: 'Downtown' },
      ];
    },
    async getEmails() {
      return [
        {
          id: 'm1',
          from: 'Ana Costa <ana@example.com>',
          subject: 'Dinner Saturday?',
          date: now().toISOString(),
          snippet: 'Are we still on for Saturday at 8?',
        },
        {
          id: 'm2',
          from: 'billing@utility.example',
          subject: 'Invoice due in 3 days',
          date: now().toISOString(),
          snippet: 'Your invoice of 84.20 is due on the 14th.',
        },
        {
          id: 'm3',
          from: 'newsletter@store.example',
          subject: '20% off this weekend',
          date: now().toISOString(),
          snippet: 'Our weekend sale starts now.',
        },
      ];
    },
  };
}
