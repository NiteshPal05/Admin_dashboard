import { requireAuth } from '../middleware/auth.js';
import { getDashboard, updateDashboard } from '../data/repository.js';

function updateSummary(summary = []) {
  return summary.map((item) => {
    const nextValue = item.label === 'New sign ups' ? '1' : item.label === 'Subscriptions' ? '1' : item.label === 'Monthly users' ? '12' : '120';
    return { ...item, value: nextValue, change: '100%', tone: 'positive' };
  });
}

function updateSeries(values = [], nextValue = 1) {
  if (values.length === 0) {
    return [nextValue];
  }

  return [...values.slice(1), nextValue];
}

function getTrailingMonthLabels(count = 12) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - count + index + 1, 1);
    return formatter.format(date);
  });
}

export function registerDashboardRoutes(app) {
  app.get('/api/dashboard', requireAuth, async (_req, res, next) => {
    try {
      const dashboard = await getDashboard();
      if (!dashboard) {
        return res.status(404).json({ message: 'Dashboard data not found' });
      }

      res.json(typeof dashboard.toJSON === 'function' ? dashboard.toJSON() : dashboard);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/dashboard/reports', requireAuth, async (_req, res, next) => {
    try {
      const dashboard = await getDashboard();
      if (!dashboard) {
        return res.status(404).json({ message: 'Dashboard data not found' });
      }

      const orders = Array.isArray(dashboard.orders) ? dashboard.orders : [];
      const nextNumber = 1000 + orders.length + 1;
      const amount = 100 + orders.length * 25;
      const report = {
        id: `#${nextNumber}`,
        date: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
        status: 'Pending',
        total: `$${amount.toFixed(2)}`
      };

      dashboard.orders = [report, ...orders];
      dashboard.summary = updateSummary(dashboard.summary);
      dashboard.revenue = {
        ...dashboard.revenue,
        total: `$${amount.toFixed(2)}`,
        growth: '100%',
        labels: getTrailingMonthLabels(dashboard.revenue?.revenue?.length || 12),
        revenue: updateSeries(dashboard.revenue?.revenue, amount),
        expenses: updateSeries(dashboard.revenue?.expenses, Math.round(amount * 0.32))
      };
      dashboard.profit = {
        ...dashboard.profit,
        total: `$${Math.round(amount * 0.68).toFixed(2)}`,
        growth: '100%',
        bars: updateSeries(dashboard.profit?.bars, 68)
      };
      dashboard.sessions = {
        ...dashboard.sessions,
        total: '12',
        growth: '100%',
        points: updateSeries(dashboard.sessions?.points, 12)
      };
      dashboard.deviceUsers = [
        { label: 'Desktop users', value: 7, color: '#cb3cff' },
        { label: 'Phone app users', value: 3, color: '#9a91fb' },
        { label: 'Laptop users', value: 2, color: '#00c2ff' }
      ];
      dashboard.countries = [
        { label: 'India', value: 100, color: '#cb3cff' }
      ];
      const updated = await updateDashboard((doc) => {
        doc.orders = dashboard.orders;
        doc.summary = dashboard.summary;
        doc.revenue = dashboard.revenue;
        doc.profit = dashboard.profit;
        doc.sessions = dashboard.sessions;
        doc.deviceUsers = dashboard.deviceUsers;
        doc.countries = dashboard.countries;
      });

      res.status(201).json(typeof updated?.toJSON === 'function' ? updated.toJSON() : updated);
    } catch (err) {
      next(err);
    }
  });
}
