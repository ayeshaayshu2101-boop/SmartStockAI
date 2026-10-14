import React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Boxes, ChartNoAxesCombined, ClipboardList, LogOut, Package, Plus, RefreshCw, ShoppingCart, Trash2, Pencil, X } from 'lucide-react';

const API = 'http://localhost:8080/api';
const emptyForm = { name: '', category: 'Grocery', quantity: 0, price: 0, supplier: '', expiryDate: '' };

async function request(path, options = {}) {
  const token = localStorage.getItem('smartstock-token');
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
  return data;
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      localStorage.setItem('smartstock-token', data.token);
      localStorage.setItem('smartstock-user', JSON.stringify({ username: data.username, role: data.role }));
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return <div className="login-page">
    <div className="login-card">
      <div className="brand-mark"><Boxes size={28} /></div>
      <p className="eyebrow">SMART INVENTORY PLATFORM</p>
      <h1>SmartStock <span>AI</span></h1>
      <p className="muted">Manage inventory, sales and expiry risks in one place.</p>
      <form onSubmit={submit} className="form-stack">
        <label>Username<input value={username} onChange={e => setUsername(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        {error && <p className="error">{error}</p>}
        <button className="primary full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in to dashboard'}</button>
      </form>
      <div className="demo-hint"><strong>Demo access</strong><br />Admin: admin / admin123<br />Staff: staff / staff123</div>
    </div>
  </div>;
}

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('smartstock-user') || 'null'); } catch { return null; }
  });
  const [tab, setTab] = useState('Overview');
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saleForm, setSaleForm] = useState({ productId: '', quantity: 1 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!localStorage.getItem('smartstock-token')) return;
    setError('');
    try {
      const [p, s, d, r] = await Promise.all([
        request('/products'), request('/sales'), request('/dashboard'), request('/dashboard/recommendations')
      ]);
      setProducts(p); setSales(s); setSummary(d); setRecommendations(r);
      setSaleForm(old => ({ ...old, productId: old.productId || (p[0]?.id ? String(p[0].id) : '') }));
    } catch (err) { setError(`${err.message}. Check that the backend is running and MySQL credentials are correct.`); }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const nearExpiry = useMemo(() => products.filter(p => p.expiryDate && p.expiryDate >= new Date().toISOString().slice(0, 10) && p.expiryDate <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)), [products]);
  const expired = useMemo(() => products.filter(p => p.expiryDate && p.expiryDate < new Date().toISOString().slice(0, 10)), [products]);

  function logout() {
    localStorage.removeItem('smartstock-token');
    localStorage.removeItem('smartstock-user');
    setUser(null);
  }

  function openAdd() {
    setEditingId(null); setForm(emptyForm); setShowProductForm(true);
  }

  function openEdit(product) {
    setEditingId(product.id);
    setForm({ name: product.name || '', category: product.category || '', quantity: product.quantity ?? 0, price: product.price ?? 0, supplier: product.supplier || '', expiryDate: product.expiryDate || '' });
    setShowProductForm(true);
  }

  async function saveProduct(e) {
    e.preventDefault(); setBusy(true); setNotice(''); setError('');
    try {
      const payload = { ...form, quantity: Number(form.quantity), price: Number(form.price), expiryDate: form.expiryDate || null };
      await request(editingId ? `/products/${editingId}` : '/products', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      setShowProductForm(false); setNotice(editingId ? 'Product updated successfully.' : 'Product added successfully.'); await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function deleteProduct(id) {
    if (!window.confirm('Delete this product? Products linked to sales may not be deletable.')) return;
    setError(''); setNotice('');
    try { await request(`/products/${id}`, { method: 'DELETE' }); setNotice('Product deleted.'); await load(); }
    catch (err) { setError(err.message); }
  }

  async function recordSale(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await request('/sales', { method: 'POST', body: JSON.stringify({ productId: Number(saleForm.productId), quantity: Number(saleForm.quantity) }) });
      setNotice('Sale recorded and stock updated.'); await load(); setTab('Sales');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (!user) return <Login onLogin={setUser} />;

  const navItems = [
    { label: 'Overview', icon: ChartNoAxesCombined },
    { label: 'Products', icon: Package },
    { label: 'Sales', icon: ShoppingCart },
    { label: 'Recommendations', icon: Activity }
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark small"><Boxes size={21} /></div><div><strong>SmartStock <span>AI</span></strong><small>Inventory platform</small></div></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{navItems.map(item => <button key={item.label} className={`nav-item ${tab === item.label ? 'active' : ''}`} onClick={() => setTab(item.label)}><item.icon size={18} />{item.label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="user-chip"><div className="avatar">{user.username.slice(0, 1).toUpperCase()}</div><div><strong>{user.username}</strong><small>{user.role}</small></div></div><button className="logout" onClick={logout}><LogOut size={16} /> Log out</button></div>
    </aside>

    <main className="main">
      <header className="topbar"><div><p className="eyebrow">INVENTORY / {tab.toUpperCase()}</p><h1>{tab === 'Overview' ? 'Business overview' : tab}</h1></div><div className="top-actions"><span className="status-dot">● System online</span><button className="icon-button" onClick={load} title="Refresh"><RefreshCw size={17} /></button><div className="avatar">{user.username.slice(0, 1).toUpperCase()}</div></div></header>

      {notice && <div className="notice">{notice}<button onClick={() => setNotice('')}><X size={15}/></button></div>}
      {error && <div className="error-banner"><AlertTriangle size={17}/><span>{error}</span><button onClick={() => setError('')}><X size={15}/></button></div>}

      {tab === 'Overview' && <div className="content">
        <div className="welcome-row"><div><h2>Good day, {user.username} 👋</h2><p className="muted">Here is what is happening with your inventory today.</p></div><button className="primary" onClick={openAdd}><Plus size={17}/> Add product</button></div>
        <div className="stats-grid">
          <Stat icon={Boxes} label="Total products" value={summary.totalProducts ?? 0} note={`${summary.totalUnits ?? 0} units in stock`} />
          <Stat icon={ShoppingCart} label="Total sales" value={summary.totalSales ?? 0} note={`₹${Number(summary.revenue || 0).toLocaleString('en-IN')} revenue`} />
          <Stat icon={AlertTriangle} label="Low stock" value={summary.lowStock ?? 0} note="5 units or less" warn />
          <Stat icon={ClipboardList} label="Expiring soon" value={summary.expiringSoon ?? 0} note="Within next 30 days" warn />
        </div>
        <div className="two-columns">
          <section className="panel"><div className="panel-heading"><div><h3>Inventory snapshot</h3><p className="muted">Recent products and current stock</p></div><button className="text-button" onClick={() => setTab('Products')}>View all</button></div>
            <ProductTable products={products} compact onEdit={openEdit} onDelete={deleteProduct} />
          </section>
          <section className="panel"><div className="panel-heading"><div><h3>Attention needed</h3><p className="muted">Items that may need action</p></div><AlertTriangle size={19} className="orange"/></div>
            <AlertRow title="Low-stock products" count={summary.lowStock ?? 0} description="Review replenishment needs" />
            
{products.filter(p => p.quantity <= 5).length > 0 && (
  <div className="low-stock-list">
    {products
      .filter(p => p.quantity <= 5)
      .map(p => (
        <div key={p.id} className="alert-row">
          <div>
            <strong>{p.name}</strong>
            <p className="muted">Stock remaining: {p.quantity} units</p>
          </div>
          <span className="tag orange-tag">Low stock</span>
        </div>
      ))}
  </div>
)}

            <AlertRow title="Expiring soon" count={nearExpiry.length} description="Expiry within 30 days" />
            {nearExpiry.map(p => (
  <div key={p.id} className="alert-row">
    <div>
      <strong>{p.name}</strong>
      <p className="muted">Expiry date: {p.expiryDate}</p>
    </div>
    <span className="tag orange-tag">Expiring soon</span>
  </div>
))}

            <AlertRow title="Already expired" count={expired.length} description="Review and remove from sale" />
            {expired.map(p => (
  <div key={p.id} className="alert-row">
    <div>
      <strong>{p.name}</strong>
      <p className="muted">Expired on: {p.expiryDate}</p>
    </div>
    <span className="tag orange-tag">Expired</span>
  </div>
))}
            <AlertRow title="Stock suggestions" count={recommendations.length} description="Based on current stock and sales" />
            {recommendations.map((p, i) => (
  <div key={p.id ?? i} className="alert-row">
    <div>
      <strong>{p.name ?? p.productName ?? "Restock suggestion"}</strong>
      <p className="muted">
        {p.reason ?? p.message ?? "Review stock and consider replenishment"}
      </p>
    </div>
    <span className="tag orange-tag">Suggested</span>
  </div>
))}
          </section>
        </div>
        <section className="panel"><div className="panel-heading"><div><h3>Quick sale</h3><p className="muted">Record a sale and automatically reduce stock</p></div></div>
          <form className="sale-form" onSubmit={recordSale}><label>Product<select value={saleForm.productId} onChange={e => setSaleForm({...saleForm, productId: e.target.value})} required><option value="">Choose product</option>{products.filter(p => p.quantity > 0).map(p => <option key={p.id} value={p.id}>{p.name} — {p.quantity} in stock</option>)}</select></label><label>Quantity<input type="number" min="1" value={saleForm.quantity} onChange={e => setSaleForm({...saleForm, quantity: e.target.value})} required /></label><button className="primary" disabled={busy || !products.some(p => p.quantity > 0)}><ShoppingCart size={16}/> Record sale</button></form>
        </section>
      </div>}

      {tab === 'Products' && <div className="content"><div className="welcome-row"><div><h2>Product inventory</h2><p className="muted">Manage product details, quantity and expiry dates.</p></div><button className="primary" onClick={openAdd}><Plus size={17}/> Add product</button></div><section className="panel"><ProductTable products={products} onEdit={openEdit} onDelete={deleteProduct} /></section></div>}

      {tab === 'Sales' && <div className="content"><div className="welcome-row"><div><h2>Sales records</h2><p className="muted">Sales reduce the product quantity automatically.</p></div></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Product</th><th>Quantity</th><th>Total amount</th><th>Date & time</th></tr></thead><tbody>{sales.map(s => <tr key={s.id}><td><strong>{s.product?.name || 'Product'}</strong></td><td>{s.quantity}</td><td>₹{Number(s.totalAmount || 0).toLocaleString('en-IN')}</td><td>{s.saleDate ? new Date(s.saleDate).toLocaleString() : '—'}</td></tr>)}</tbody></table>{sales.length === 0 && <div className="empty">No sales recorded yet. Record a quick sale from Overview.</div>}</div></section></div>}

      {tab === 'Recommendations' && <div className="content"><div className="welcome-row"><div><h2>Stock recommendations</h2><p className="muted">Simple rule-based suggestions using stock levels and recorded sales.</p></div><span className="tag purple">DEMO AI LOGIC</span></div><section className="panel">{recommendations.length ? recommendations.map(r => <div className="recommendation" key={r.productId}><div className="recommendation-icon"><Activity size={20}/></div><div className="recommendation-body"><strong>{r.productName}</strong><p>{r.reason}</p><small>Current stock: {r.currentStock} · Units sold: {r.unitsSold}</small></div><div className="restock"><strong>{r.suggestedRestock}</strong><small>Suggested units</small></div></div>) : <div className="empty">No recommendations right now. Add products or record sales to generate suggestions.</div>}</section><p className="footnote">Note: This is a rule-based demonstration component, not a trained machine-learning model.</p></div>}

      <footer>SmartStock AI <span>·</span> Inventory, sales & waste management</footer>
    </main>

    {showProductForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowProductForm(false); }}><div className="modal"><div className="modal-head"><div><h2>{editingId ? 'Edit product' : 'Add product'}</h2><p className="muted">Enter the product information below.</p></div><button className="icon-button" onClick={() => setShowProductForm(false)}><X size={18}/></button></div><form className="form-grid" onSubmit={saveProduct}>
      <label>Product name<input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Basmati Rice" /></label>
      <label>Category<select value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option>Grocery</option><option>Beverages</option><option>Dairy</option><option>Bakery</option><option>Pharmacy</option><option>Personal care</option><option>Other</option></select></label>
      <label>Quantity<input type="number" min="0" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required /></label>
      <label>Price per unit (₹)<input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required /></label>
      <label>Supplier<input value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} placeholder="Supplier name" /></label>
      <label>Expiry date<input type="date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} /></label>
      <div className="modal-actions"><button type="button" className="secondary" onClick={() => setShowProductForm(false)}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Saving...' : 'Save product'}</button></div>
    </form></div></div>}
  </div>;
}

function Stat({ icon: Icon, label, value, note, warn }) {
  return <div className="stat-card"><div className={`stat-icon ${warn ? 'warning' : ''}`}><Icon size={20}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>;
}

function AlertRow({ title, count, description }) {
  return <div className="alert-row"><div className="alert-number">{count}</div><div><strong>{title}</strong><p className="muted">{description}</p></div><span className={`alert-state ${count ? 'needs-attention' : ''}`}>{count ? 'Review' : 'Clear'}</span></div>;
}

function ProductTable({ products, onEdit, onDelete, compact = false }) {
  return <div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Stock</th>{!compact && <th>Price</th>}<th>Expiry</th><th>Status</th><th>Actions</th></tr></thead><tbody>{products.map(p => {
    const isExpired = p.expiryDate && p.expiryDate < new Date().toISOString().slice(0, 10);
    const isExpiring = p.expiryDate && !isExpired && p.expiryDate <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const low = p.quantity <= 5;
    return <tr key={p.id}><td><div className="product-cell"><div className="product-icon"><Package size={17}/></div><div><strong>{p.name}</strong><small>{p.supplier || 'No supplier'}</small></div></div></td><td>{p.category || '—'}</td><td><strong>{p.quantity}</strong></td>{!compact && <td>₹{Number(p.price || 0).toLocaleString('en-IN')}</td>}<td>{p.expiryDate || '—'}</td><td><span className={`tag ${isExpired ? 'red' : isExpiring ? 'orange-tag' : low ? 'orange-tag' : 'green'}`}>{isExpired ? 'Expired' : isExpiring ? 'Expiring' : low ? 'Low stock' : 'In stock'}</span></td><td><div className="row-actions"><button title="Edit" onClick={() => onEdit(p)}><Pencil size={15}/></button><button title="Delete" onClick={() => onDelete(p.id)}><Trash2 size={15}/></button></div></td></tr>;
  })}</tbody></table>{products.length === 0 && <div className="empty">No products yet. Click “Add product” to create your first inventory item.</div>}</div>;
}

export default App;
