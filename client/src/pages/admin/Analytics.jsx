import { useState, useEffect } from 'react';
import api from '../../utils/api';

const S = {
  page: { padding: '24px', maxWidth: '900px', margin: '0 auto' },
  header: { marginBottom: '24px' },
  title: { fontSize: '22px', fontWeight: '700', color: '#1a3a6b', margin: '0 0 4px 0' },
  sub: { fontSize: '14px', color: '#666', margin: 0 },
  periodBar: { display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' },
  periodBtn: (active) => ({
    padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600',
    background: active ? '#1a3a6b' : '#f0f0f0',
    color: active ? '#fff' : '#333',
  }),
  tabBar: { display: 'flex', gap: '0', marginBottom: '28px', borderBottom: '2px solid #e5e7eb' },
  tab: (active) => ({
    padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
    fontSize: '14px', fontWeight: '600',
    color: active ? '#1a3a6b' : '#666',
    borderBottom: active ? '2px solid #1a3a6b' : '2px solid transparent',
    marginBottom: '-2px',
  }),
  grid: (cols) => ({
    display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '16px', marginBottom: '24px',
  }),
  card: {
    background: '#fff', borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  kpiLabel: { fontSize: '12px', color: '#888', fontWeight: '600', textTransform: 'uppercase', margin: '0 0 6px 0' },
  kpiValue: { fontSize: '26px', fontWeight: '800', color: '#1a3a6b', margin: 0 },
  kpiSub: { fontSize: '12px', color: '#666', marginTop: '4px' },
  sectionTitle: { fontSize: '15px', fontWeight: '700', color: '#1a3a6b', margin: '0 0 16px 0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e5e7eb', color: '#555', fontWeight: '600', fontSize: '12px' },
  td: { padding: '10px', borderBottom: '1px solid #f3f4f6', color: '#333' },
  badge: (color) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
    background: color === 'green' ? '#dcfce7' : color === 'blue' ? '#dbeafe' : color === 'yellow' ? '#fef9c3' : '#f3f4f6',
    color: color === 'green' ? '#166534' : color === 'blue' ? '#1e40af' : color === 'yellow' ? '#854d0e' : '#555',
  }),
  bar: (pct, color) => ({
    height: '8px', borderRadius: '4px',
    background: color || '#1a3a6b',
    width: `${Math.min(pct, 100)}%`,
    minWidth: '2px',
  }),
  barBg: { height: '8px', borderRadius: '4px', background: '#f0f0f0', marginTop: '6px' },
  loading: { textAlign: 'center', padding: '60px', color: '#888' },
  error: { textAlign: 'center', padding: '40px', color: '#dc2626' },
  green: { color: '#00c853', fontWeight: '700' },
};

const PERIODS = ['7d', '30d', '90d', '365d'];
const TABS = ['Overview', 'Orders', 'Financial', 'Logistics', 'Users'];

const fmt = (n) =>
  n >= 1_000_000
    ? `MWK ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `MWK ${(n / 1_000).toFixed(0)}K`
    : `MWK ${(n || 0).toLocaleString()}`;

const num = (n) => (n || 0).toLocaleString();

const statusColor = (s) =>
  ['completed'].includes(s) ? 'green'
  : ['in_transit', 'collected', 'delivered', 'confirmed'].includes(s) ? 'blue'
  : ['disputed', 'cancelled'].includes(s) ? 'red'
  : 'yellow';

export default function AdminAnalytics() {
  const [tab, setTab] = useState('Overview');
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const endpointMap = {
    Overview: '/admin/analytics/overview',
    Orders: `/admin/analytics/orders?period=${period}`,
    Financial: `/admin/analytics/financial?period=${period}`,
    Logistics: `/admin/analytics/logistics?period=${period}`,
    Users: `/admin/analytics/users?period=${period}`,
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(endpointMap[tab]);
        setData(res.data);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, period]);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Platform Analytics</h1>
        <p style={S.sub}>Admin-level view across all users, orders, and financials</p>
      </div>

      {/* Tab bar */}
      <div style={S.tabBar}>
        {TABS.map((t) => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Period selector — hidden on Overview (it's all-time) */}
      {tab !== 'Overview' && (
        <div style={S.periodBar}>
          {PERIODS.map((p) => (
            <button key={p} style={S.periodBtn(period === p)} onClick={() => setPeriod(p)}>
              {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : p === '90d' ? 'Last 90 days' : 'Last year'}
            </button>
          ))}
        </div>
      )}

      {loading && <div style={S.loading}>Loading…</div>}
      {error && <div style={S.error}>{error}</div>}

      {!loading && !error && (
        <>
          {tab === 'Overview' && <OverviewTab d={data} />}
          {tab === 'Orders' && <OrdersTab d={data} />}
          {tab === 'Financial' && <FinancialTab d={data} />}
          {tab === 'Logistics' && <LogisticsTab d={data} />}
          {tab === 'Users' && <UsersTab d={data} />}
        </>
      )}
    </div>
  );
}

// ─── OVERVIEW ────────────────────────────────────────────────
function OverviewTab({ d }) {
  const kpis = [
    { label: 'Gross Merchandise Value', value: fmt(d.gmv), sub: 'All non-cancelled orders' },
    { label: 'Platform Commission', value: fmt(d.totalCommission), sub: 'Fees collected' },
    { label: 'Escrow Held', value: fmt(d.escrowHeld), sub: 'Paid, not yet released' },
    { label: 'Total Paid Out', value: fmt(d.totalPaidOut), sub: 'Net to wholesalers + logistics' },
    { label: 'Total Orders', value: num(d.totalOrders), sub: `${num(d.completedOrders)} completed` },
    { label: 'Fulfilment Rate', value: `${d.fulfilmentRate || 0}%`, sub: 'Completed / non-cancelled' },
    { label: 'Total Users', value: num(d.totalUsers), sub: `${num(d.activeUsers)} active` },
    { label: 'Logistics Companies', value: num(d.totalLogistics), sub: `${num(d.approvedLogistics)} approved` },
  ];

  return (
    <>
      <div style={S.grid(2)}>
        {kpis.map((k) => (
          <div key={k.label} style={S.card}>
            <p style={S.kpiLabel}>{k.label}</p>
            <p style={S.kpiValue}>{k.value}</p>
            <p style={S.kpiSub}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Pending issues */}
      <div style={S.card}>
        <p style={S.sectionTitle}>Pending Attention</p>
        <div style={S.grid(3)}>
          <div>
            <p style={S.kpiLabel}>Pending Escrow Release</p>
            <p style={{ ...S.kpiValue, fontSize: '20px' }}>{num(d.pendingEscrowOrders)}</p>
            <p style={S.kpiSub}>orders awaiting release</p>
          </div>
          <div>
            <p style={S.kpiLabel}>Open Disputes</p>
            <p style={{ ...S.kpiValue, fontSize: '20px' }}>{num(d.disputedOrders)}</p>
            <p style={S.kpiSub}>orders in dispute</p>
          </div>
          <div>
            <p style={S.kpiLabel}>Cancelled Orders</p>
            <p style={{ ...S.kpiValue, fontSize: '20px' }}>{num(d.cancelledOrders)}</p>
            <p style={S.kpiSub}>all time</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── ORDERS ──────────────────────────────────────────────────
function OrdersTab({ d }) {
  const maxVol = Math.max(...(d.volumeByDay || []).map((x) => x.count), 1);

  return (
    <>
      {/* Volume chart (bar) */}
      <div style={{ ...S.card, marginBottom: '20px' }}>
        <p style={S.sectionTitle}>Order Volume</p>
        {(d.volumeByDay || []).length === 0 ? (
          <p style={{ color: '#888', fontSize: '13px' }}>No orders in this period.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
            {(d.volumeByDay || []).map((row) => (
              <div
                key={row._id}
                title={`${row._id}: ${row.count} orders`}
                style={{
                  flex: 1, background: '#1a3a6b',
                  height: `${Math.max((row.count / maxVol) * 100, 4)}%`,
                  borderRadius: '3px 3px 0 0', minWidth: '4px',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div style={S.grid(2)}>
        {/* Status breakdown */}
        <div style={S.card}>
          <p style={S.sectionTitle}>Order Status Breakdown</p>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Status</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {(d.statusBreakdown || []).map((row) => (
                <tr key={row._id}>
                  <td style={S.td}><span style={S.badge(statusColor(row._id))}>{row._id}</span></td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: '700' }}>{num(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top wholesalers */}
        <div style={S.card}>
          <p style={S.sectionTitle}>Top Wholesalers by Revenue</p>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Wholesaler</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(d.topWholesalers || []).map((w) => (
                <tr key={w._id}>
                  <td style={S.td}>
                    <div style={{ fontWeight: '600' }}>{w.name || 'Unknown'}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{w.orderCount} orders</div>
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: '700', color: '#1a3a6b' }}>
                    {fmt(w.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top retailers */}
      <div style={S.card}>
        <p style={S.sectionTitle}>Top Retailers by Spend</p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Retailer</th>
              <th style={S.th}>Business</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Orders</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Total Spent</th>
            </tr>
          </thead>
          <tbody>
            {(d.topRetailers || []).map((r) => (
              <tr key={r._id}>
                <td style={S.td}>{r.name || '—'}</td>
                <td style={S.td}>{r.businessName || '—'}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{num(r.orderCount)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: '700', color: '#1a3a6b' }}>
                  {fmt(r.totalSpent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── FINANCIAL ───────────────────────────────────────────────
function FinancialTab({ d }) {
  const s = d.summary || {};
  return (
    <>
      <div style={S.grid(2)}>
        {[
          { label: 'Gross Payouts', value: fmt(s.grossTotal), sub: `${num(s.count)} releases` },
          { label: 'VAT Collected', value: fmt(d.vatCollected), sub: 'From wholesaler payouts' },
          { label: 'Net Payouts', value: fmt(s.netTotal), sub: 'After VAT deductions' },
          { label: 'Platform Commission', value: fmt(d.commission?.total), sub: `${num(d.commission?.count)} orders` },
          { label: 'Refunds Issued', value: fmt(d.refunds?.total), sub: `${num(d.refunds?.count)} orders refunded` },
        ].map((k) => (
          <div key={k.label} style={S.card}>
            <p style={S.kpiLabel}>{k.label}</p>
            <p style={S.kpiValue}>{k.value}</p>
            <p style={S.kpiSub}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div style={S.grid(2)}>
        {/* By recipient type */}
        <div style={S.card}>
          <p style={S.sectionTitle}>Payouts by Recipient</p>
          {(d.byRecipientType || []).map((row) => (
            <div key={row._id} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{row._id}</span>
                <span style={{ color: '#1a3a6b', fontWeight: '700' }}>{fmt(row.net)}</span>
              </div>
              <div style={S.barBg}>
                <div style={S.bar((row.net / (s.netTotal || 1)) * 100, row._id === 'wholesaler' ? '#1a3a6b' : '#00c853')} />
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
                {num(row.count)} payouts · VAT {fmt(row.vat)}
              </div>
            </div>
          ))}
        </div>

        {/* Payouts over time */}
        <div style={S.card}>
          <p style={S.sectionTitle}>Payouts Over Time</p>
          {(d.payoutsByDay || []).length === 0 ? (
            <p style={{ color: '#888', fontSize: '13px' }}>No payouts in this period.</p>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Date</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Releases</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Net Paid</th>
                </tr>
              </thead>
              <tbody>
                {(d.payoutsByDay || []).slice(-10).map((row) => (
                  <tr key={row._id}>
                    <td style={S.td}>{row._id}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>{num(row.count)}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: '600' }}>{fmt(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

// ─── LOGISTICS ───────────────────────────────────────────────
function LogisticsTab({ d }) {
  return (
    <>
      <div style={{ ...S.card, marginBottom: '20px' }}>
        <p style={S.sectionTitle}>Delivery Status Breakdown</p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {(d.statusBreakdown || []).map((row) => (
            <div key={row._id} style={{ textAlign: 'center' }}>
              <p style={{ ...S.kpiValue, fontSize: '20px' }}>{num(row.count)}</p>
              <span style={S.badge(statusColor(row._id))}>{row._id}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={S.card}>
        <p style={S.sectionTitle}>Company Performance</p>
        {(d.companyStats || []).length === 0 ? (
          <p style={{ color: '#888', fontSize: '13px' }}>No logistics data in this period.</p>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Company</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Assigned</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Delivered</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Rate</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Rating</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Fees Earned</th>
              </tr>
            </thead>
            <tbody>
              {(d.companyStats || []).map((c) => (
                <tr key={c._id}>
                  <td style={S.td}>
                    <div style={{ fontWeight: '600' }}>{c.companyName || 'Unknown'}</div>
                    <span style={S.badge(c.status === 'approved' ? 'green' : 'yellow')}>{c.status}</span>
                  </td>
                  <td style={{ ...S.td, textAlign: 'right' }}>{num(c.totalAssigned)}</td>
                  <td style={{ ...S.td, textAlign: 'right' }}>{num(c.delivered)}</td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    <span style={{ color: c.deliveryRate >= 80 ? '#00c853' : c.deliveryRate >= 50 ? '#f59e0b' : '#dc2626', fontWeight: '700' }}>
                      {Math.round(c.deliveryRate || 0)}%
                    </span>
                  </td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    {c.avgRating ? `${c.avgRating.toFixed(1)} ★` : '—'}
                    {c.ratingCount ? <span style={{ fontSize: '11px', color: '#888' }}> ({c.ratingCount})</span> : null}
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: '700', color: '#1a3a6b' }}>
                    {fmt(c.totalFees)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ─── USERS ───────────────────────────────────────────────────
function UsersTab({ d }) {
  const maxGrowth = Math.max(...(d.growthByDay || []).map((x) => x.count), 1);

  return (
    <>
      <div style={S.grid(2)}>
        {/* All-time totals by role */}
        <div style={S.card}>
          <p style={S.sectionTitle}>Users by Role (All Time)</p>
          {(d.totalByRole || []).map((row) => (
            <div key={row._id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
              <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{row._id}</span>
              <span style={{ fontWeight: '800', color: '#1a3a6b' }}>{num(row.count)}</span>
            </div>
          ))}
        </div>

        {/* New users in period by role */}
        <div style={S.card}>
          <p style={S.sectionTitle}>New Signups This Period by Role</p>
          {(d.newUsersByRole || []).length === 0 ? (
            <p style={{ color: '#888', fontSize: '13px' }}>No new signups in this period.</p>
          ) : (
            (d.newUsersByRole || []).map((row) => (
              <div key={row._id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{row._id}</span>
                  <span style={{ fontWeight: '700', color: '#1a3a6b' }}>{num(row.count)}</span>
                </div>
                <div style={S.barBg}>
                  <div style={S.bar(
                    (row.count / Math.max(...(d.newUsersByRole || []).map((r) => r.count), 1)) * 100
                  )} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Growth chart */}
      <div style={{ ...S.card, marginBottom: '20px' }}>
        <p style={S.sectionTitle}>Signup Growth</p>
        {(d.growthByDay || []).length === 0 ? (
          <p style={{ color: '#888', fontSize: '13px' }}>No signups in this period.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
            {(d.growthByDay || []).map((row) => (
              <div
                key={row._id}
                title={`${row._id}: ${row.count} signups`}
                style={{
                  flex: 1, background: '#00c853',
                  height: `${Math.max((row.count / maxGrowth) * 100, 4)}%`,
                  borderRadius: '3px 3px 0 0', minWidth: '4px',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent signups */}
      <div style={S.card}>
        <p style={S.sectionTitle}>Most Recent Signups</p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Name</th>
              <th style={S.th}>Email</th>
              <th style={S.th}>Role</th>
              <th style={S.th}>Business</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {(d.recentSignups || []).map((u) => (
              <tr key={u._id}>
                <td style={S.td}>{u.name}</td>
                <td style={{ ...S.td, color: '#555' }}>{u.email}</td>
                <td style={S.td}><span style={S.badge('blue')}>{u.role}</span></td>
                <td style={S.td}>{u.businessName || '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontSize: '12px', color: '#888' }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}