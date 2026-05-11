export function getAdminAccount() {
  return {
    name: process.env.ADMIN_NAME || 'Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@digitalmongers.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    role: process.env.ADMIN_ROLE || 'Admin'
  };
}

function getTrailingMonthLabels(count = 12) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - count + index + 1, 1);
    return formatter.format(date);
  });
}

export const demoUsers = [
  { id: 'u-1001', name: 'Aria Blake', email: 'aria@example.com', role: 'Admin', status: 'Active', createdDate: '2026-04-28' },
  { id: 'u-1002', name: 'Miles Carter', email: 'miles@example.com', role: 'Editor', status: 'Active', createdDate: '2026-04-30' },
  { id: 'u-1003', name: 'Nora Singh', email: 'nora@example.com', role: 'Analyst', status: 'Inactive', createdDate: '2026-05-02' },
  { id: 'u-1004', name: 'Dev Patel', email: 'dev@example.com', role: 'Viewer', status: 'Active', createdDate: '2026-05-04' },
  { id: 'u-1005', name: 'Isha Rao', email: 'isha@example.com', role: 'Manager', status: 'Active', createdDate: '2026-05-07' }
];

export const dashboard = {
  summary: [
    { label: 'Pageviews', value: '0', change: '0%', tone: 'positive' },
    { label: 'Monthly users', value: '0', change: '0%', tone: 'positive' },
    { label: 'New sign ups', value: '0', change: '0%', tone: 'positive' },
    { label: 'Subscriptions', value: '0', change: '0%', tone: 'positive' }
  ],
  revenue: {
    total: '$0',
    growth: '0%',
    labels: getTrailingMonthLabels(),
    revenue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    expenses: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  profit: {
    total: '$0',
    growth: '0%',
    bars: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  sessions: {
    total: '0',
    growth: '0%',
    points: [0, 0, 0, 0, 0, 0, 0]
  },
  deviceUsers: [],
  orders: [],
  countries: []
};
