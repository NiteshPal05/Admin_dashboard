import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  Calendar,
  Check,
  Download,
  Eye,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Users
} from 'lucide-react';
import { api, setAuthToken } from './services/api.js';
import './styles.css';

const initialForm = { name: '', email: '', role: 'Viewer', status: 'Active' };

function getTrailingMonthLabels(count = 12) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - count + index + 1, 1);
    return formatter.format(date);
  });
}

function getDateRangeLabel(labels) {
  if (!labels.length) {
    return 'No date range';
  }

  return `${labels[0]} - ${labels[labels.length - 1]}`;
}

function getCurrentMonthLabel() {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date());
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('dm_token', data.token);
      localStorage.setItem('dm_user', JSON.stringify(data.user));
      setAuthToken(data.token);
      onLogin(data.user);
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.request) {
        setError('Unable to reach the backend API. Check VITE_API_URL on Netlify and CLIENT_URL on Render.');
      } else {
        setError('Unable to login');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark"><LayoutDashboard size={26} /></div>
        <h1>Admin Dashboard</h1>
        <p>Sign in to continue to your analytics workspace.</p>
        <label>Email</label>
        <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <label>Password</label>
        <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        {error && <span className="form-error">{error}</span>}
        <button className="primary-btn" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
      </form>
    </main>
  );
}

function App() {
  const savedToken = localStorage.getItem('dm_token');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('dm_user');
    return saved ? JSON.parse(saved) : null;
  });

  setAuthToken(savedToken);

  function logout() {
    localStorage.removeItem('dm_token');
    localStorage.removeItem('dm_user');
    setAuthToken(null);
    setUser(null);
  }

  return user && savedToken ? <Dashboard user={user} logout={logout} /> : <Login onLogin={setUser} />;
}

function Dashboard({ user, logout }) {
  const [activePage, setActivePage] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 5 });
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadUsers(1);
  }, [search]);

  async function loadDashboard() {
    try {
      const { data } = await api.get('/dashboard');
      setDashboard(data);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers(page = meta.page) {
    try {
      const { data } = await api.get('/users', { params: { search, page, limit: meta.limit } });
      setUsers(data.users);
      setMeta({ total: data.total, page: data.page, limit: data.limit });
    } catch (err) {
      handleApiError(err);
    }
  }

  async function saveUser(event) {
    event.preventDefault();
    try {
      const request = editingId ? api.put(`/users/${editingId}`, form) : api.post('/users', form);
      await request;
      setForm(initialForm);
      setEditingId(null);
      setNotice(editingId ? 'User updated' : 'User added');
      loadUsers(1);
    } catch (err) {
      handleApiError(err);
    }
  }

  function editUser(row) {
    setEditingId(row.id);
    setForm({ name: row.name, email: row.email, role: row.role, status: row.status });
  }

  async function removeUser(id) {
    try {
      await api.delete(`/users/${id}`);
      setNotice('User deleted');
      loadUsers(meta.page);
    } catch (err) {
      handleApiError(err);
    }
  }

  async function createReport() {
    try {
      const { data } = await api.post('/dashboard/reports');
      setDashboard(data);
      setActivePage('reports');
      setNotice('Report created');
    } catch (err) {
      handleApiError(err);
    }
  }

  function downloadCsv(filename, rows) {
    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`${filename} exported`);
  }

  function exportDashboardData() {
    downloadCsv('dashboard-export.csv', [
      ['Metric', 'Value', 'Change'],
      ...dashboard.summary.map((item) => [item.label, item.value, item.change]),
      ['Revenue total', dashboard.revenue.total, dashboard.revenue.growth],
      ['Profit total', dashboard.profit.total, dashboard.profit.growth],
      ['Sessions total', dashboard.sessions.total, dashboard.sessions.growth]
    ]);
  }

  function exportReportsData() {
    downloadCsv('reports-export.csv', [
      ['Order', 'Date', 'Status', 'Total'],
      ...dashboard.orders.map((order) => [order.id, order.date, order.status, order.total])
    ]);
  }

  function exportCountryData() {
    downloadCsv('country-report.csv', [
      ['Country', 'Share'],
      ...dashboard.countries.map((country) => [country.label, `${country.value}%`])
    ]);
  }

  function handleApiError(err) {
    if (err.response?.status === 401) {
      logout();
      return;
    }

    setError(err.response?.data?.message || 'Something went wrong');
  }

  const totalPages = Math.max(Math.ceil(meta.total / meta.limit), 1);
  const pageTitles = {
    dashboard: ['Welcome back, ' + user.name, 'Measure your advertising ROI and report website traffic.'],
    reports: ['Reports overview', 'Review orders, devices, and country data from a fresh workspace.'],
    users: ['User management', 'Add the first real users for this workspace.']
  };

  if (loading || !dashboard) {
    return <div className="loader">Loading dashboard...</div>;
  }

  return (
    <main className="dashboard-shell">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <section className="workspace">
        <Header user={user} logout={logout} />
        {error && <div className="notice error">{error}</div>}
        <div className="hero-row">
          <div>
            <h1>{pageTitles[activePage][0]}</h1>
            <p>{pageTitles[activePage][1]}</p>
          </div>
          {activePage !== 'users' && (
            <div className="top-actions">
              <button className="dark-btn" onClick={activePage === 'reports' ? exportReportsData : exportDashboardData}>Export data <Download size={14} /></button>
              <button className="primary-btn small" onClick={createReport}>Create report</button>
            </div>
          )}
        </div>
        {notice && activePage !== 'users' && <p className="notice">{notice}</p>}

        {activePage === 'dashboard' && <DashboardOverview dashboard={dashboard} openReports={() => setActivePage('reports')} />}
        {activePage === 'reports' && <ReportsPage dashboard={dashboard} exportCountryData={exportCountryData} />}
        {activePage === 'users' && (
          <UserManagement
            users={users}
            form={form}
            setForm={setForm}
            saveUser={saveUser}
            editUser={editUser}
            removeUser={removeUser}
            search={search}
            setSearch={setSearch}
            meta={meta}
            totalPages={totalPages}
            loadUsers={loadUsers}
            editingId={editingId}
            notice={notice}
          />
        )}
      </section>
    </main>
  );
}

function Sidebar({ activePage, setActivePage }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reports', label: 'Reports', icon: Shield }
  ];

  return (
    <aside className="sidebar">
      <div className="logo"><LayoutDashboard size={22} /> Admin Dashboard</div>
      <nav>
        {items.map(({ id, label, icon: Icon }) => (
          <button key={id} className={activePage === id ? 'active' : ''} onClick={() => setActivePage(id)}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function DashboardOverview({ dashboard, openReports }) {
  return (
    <>
      <section className="summary-grid">
        {dashboard.summary.map((item, index) => (
          <MetricCard key={item.label} item={item} icon={[Eye, Users, Sparkles, Star][index]} />
        ))}
      </section>

      <section className="analytics-grid">
        <RevenueCard data={dashboard.revenue} />
        <SideAnalytics profit={dashboard.profit} sessions={dashboard.sessions} openReports={openReports} />
      </section>
    </>
  );
}

function ReportsPage({ dashboard, exportCountryData }) {
  return (
    <>
      <section className="reports-grid page-grid">
        <DeviceCard data={dashboard.deviceUsers} />
        <OrdersCard orders={dashboard.orders} />
      </section>
      <CountryCard countries={dashboard.countries} exportCountryData={exportCountryData} />
    </>
  );
}

function Header({ user, logout }) {
  return (
    <header className="header">
      <div className="search-box"><Search size={16} /><input placeholder="Search dashboard" /></div>
      <div className="profile">
        <span>{user.role}</span>
        <button className="icon-btn" onClick={logout} aria-label="Logout"><LogOut size={16} /></button>
      </div>
    </header>
  );
}

function MetricCard({ item, icon: Icon }) {
  return (
    <article className="metric-card">
      <div className="metric-title"><Icon size={13} /> {item.label}<MoreHorizontal size={14} /></div>
      <div className="metric-value">{item.value} <Badge tone={item.tone}>{item.change}</Badge></div>
    </article>
  );
}

function Badge({ tone = 'positive', children }) {
  return <span className={`badge ${tone}`}>{children} ↗</span>;
}

function RevenueCard({ data }) {
  const monthLabels = useMemo(() => getTrailingMonthLabels(data.revenue?.length || 12), [data.revenue?.length]);
  const shortLabels = useMemo(() => monthLabels.map((label) => label.split(' ')[0]), [monthLabels]);

  return (
    <article className="panel revenue-panel">
      <div className="panel-header">
        <div><span>Total revenue</span><h2>{data.total} <Badge>{data.growth}</Badge></h2></div>
        <div className="legend"><i className="pink" />Revenue <i className="blue" />Expenses <span className="range-pill">{getDateRangeLabel(monthLabels)}</span></div>
      </div>
      <LineChart labels={shortLabels} a={data.revenue} b={data.expenses} />
    </article>
  );
}

function LineChart({ labels, a, b }) {
  const max = Math.max(...a, ...b, 1);
  const hasData = [...a, ...b].some((value) => Number(value) > 0);
  const pointsA = a.map((value, index) => `${(index / Math.max(a.length - 1, 1)) * 100},${100 - (value / max) * 100}`).join(' ');
  const pointsB = b.map((value, index) => `${(index / Math.max(b.length - 1, 1)) * 100},${100 - (value / max) * 100}`).join(' ');
  return (
    <div className="chart-wrap">
      {!hasData && <EmptyState title="No chart data yet" text="Create a report to populate this chart." />}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="revFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#cb3cff" stopOpacity=".42" />
            <stop offset="100%" stopColor="#cb3cff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="expFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00c2ff" stopOpacity=".42" />
            <stop offset="100%" stopColor="#00c2ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="grid-line" />)}
        <polygon points={`0,100 ${pointsB} 100,100`} fill="url(#expFill)" />
        <polygon points={`0,100 ${pointsA} 100,100`} fill="url(#revFill)" />
        <polyline points={pointsB} className="line blue-line" />
        <polyline points={pointsA} className="line pink-line" />
      </svg>
      <div className="months">{labels.map((label) => <span key={label}>{label}</span>)}</div>
    </div>
  );
}

function SideAnalytics({ profit, sessions, openReports }) {
  return (
    <div className="side-stack">
      <article className="panel compact">
        <div className="mini-title">Total profit</div>
        <h2>{profit.total} <Badge>{profit.growth}</Badge></h2>
        <BarChart values={profit.bars} />
        <footer><span>Last 12 months</span><button className="link-btn" onClick={openReports}>View report</button></footer>
      </article>
      <article className="panel compact">
        <div className="mini-title">Total sessions</div>
        <h2>{sessions.total} <Badge>{sessions.growth}</Badge></h2>
        <SparkChart points={sessions.points} />
        <footer><span><b className="live-dot" /> Live &nbsp; 0 visitors</span><button className="link-btn" onClick={openReports}>View report</button></footer>
      </article>
    </div>
  );
}

function BarChart({ values }) {
  const hasData = values.some((value) => Number(value) > 0);
  return (
    <div className="bar-chart">
      {!hasData && <EmptyState title="No profit data yet" text="Create a report to fill the bars." />}
      {values.map((value, index) => <i key={index} style={{ height: `${Math.max(value, hasData ? 4 : 0)}%` }} />)}
    </div>
  );
}

function SparkChart({ points }) {
  const max = Math.max(...points, 1);
  const hasData = points.some((value) => Number(value) > 0);
  const plot = points.map((value, index) => `${(index / Math.max(points.length - 1, 1)) * 100},${90 - (value / max) * 78}`).join(' ');
  return (
    <div className="spark-wrap">
      {!hasData && <EmptyState title="No session data yet" text="Create a report to draw the trend." />}
      <svg className="spark" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={plot} className="pink-line line" />
      </svg>
    </div>
  );
}

function DeviceCard({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <article className="panel device-card">
      <div className="gauge"><span>{total.toLocaleString()}<small>Users by device</small></span></div>
      {data.length === 0 ? (
        <EmptyState title="No device reports yet" text="Device analytics will appear after reports are added." />
      ) : data.map((item) => (
        <div className="device-row" key={item.label}><span><i style={{ background: item.color }} />{item.label}</span><b>{item.value.toLocaleString()}</b></div>
      ))}
    </article>
  );
}

function OrdersCard({ orders }) {
  return (
    <article className="panel orders-card">
      <div className="panel-title"><h3>Recent orders</h3><span className="range-pill"><Calendar size={12} />{getCurrentMonthLabel()}</span></div>
      <table>
        <thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
        <tbody>{orders.length === 0 ? (
          <tr><td colSpan="4"><EmptyState title="No orders yet" text="New report orders will show here." /></td></tr>
        ) : orders.map((order) => <tr key={order.id}><td><Check size={12} />{order.id}</td><td>{order.date}</td><td><span className={`status ${order.status.toLowerCase()}`}>{order.status}</span></td><td>{order.total}</td></tr>)}</tbody>
      </table>
    </article>
  );
}

function CountryCard({ countries, exportCountryData }) {
  return (
    <article className="panel country-panel">
      <div className="country-list">
        <h3>Users by country</h3>
        <h2>0 <Badge>0%</Badge></h2>
        <button className="dark-btn mini" onClick={exportCountryData}>Export <Download size={12} /></button>
        {countries.length === 0 ? <EmptyState title="No country data yet" text="Traffic by country will appear here." /> : countries.map((country) => (
          <div className="country-row" key={country.label}>
            <span>{country.label}</span><b>{country.value}%</b>
            <div><i style={{ width: `${country.value * 2.3}%`, background: country.color }} /></div>
          </div>
        ))}
      </div>
      <div className="map-art">
        {Array.from({ length: 230 }).map((_, index) => <i key={index} />)}
        {countries.length > 0 ? (
          <>
            <span className="pin p1" /><span className="pin p2" /><span className="pin p3" /><span className="pin p4" />
            <strong>{countries[0].value}%<small>{countries[0].label}</small></strong>
          </>
        ) : <strong>0<small>No locations</small></strong>}
      </div>
    </article>
  );
}

function UserManagement(props) {
  const { users, form, setForm, saveUser, editUser, removeUser, search, setSearch, meta, totalPages, loadUsers, editingId, notice } = props;
  return (
    <section className="users-panel panel">
      <div className="section-heading inline">
        <h2>User management</h2>
        <div className="search-box"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users" /></div>
      </div>
      <form className="user-form" onSubmit={saveUser}>
        <input required placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option>Admin</option><option>Manager</option><option>Editor</option><option>Analyst</option><option>Viewer</option>
        </select>
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
          <option>Active</option><option>Inactive</option>
        </select>
        <button className="primary-btn small"><Plus size={14} />{editingId ? 'Update user' : 'Add user'}</button>
      </form>
      {notice && <p className="notice">{notice}</p>}
      <div className="responsive-table">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th /></tr></thead>
          <tbody>{users.length === 0 ? (
            <tr><td colSpan="6"><EmptyState title="No users yet" text="Add your first user with the form above." /></td></tr>
          ) : users.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td><td>{row.email}</td><td>{row.role}</td><td><span className={`status ${row.status.toLowerCase()}`}>{row.status}</span></td><td>{row.createdDate}</td>
              <td className="row-actions"><button onClick={() => editUser(row)}>Edit</button><button onClick={() => removeUser(row.id)}><Trash2 size={13} /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="pagination">
        <button disabled={meta.page <= 1} onClick={() => loadUsers(meta.page - 1)}>Previous</button>
        <span>Page {meta.page} of {totalPages}</span>
        <button disabled={meta.page >= totalPages} onClick={() => loadUsers(meta.page + 1)}>Next</button>
      </div>
    </section>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
