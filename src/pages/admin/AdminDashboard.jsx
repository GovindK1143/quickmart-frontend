import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "../../context/useAuth";
import { getAllOrders } from "../../services/orderService";
import { getAllProducts } from "../../services/productService";
import "../../styles/admin-dashboard.css";
import AdminOrders from "./AdminOrders";

const adminNavigation = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Your store performance at a glance.",
  },
  {
    id: "orders",
    label: "Orders",
    icon: ShoppingCart,
    description: "Review customer orders and order statuses.",
  },
  {
    id: "products",
    label: "Products & Inventory",
    icon: Package,
    description: "Manage products, pricing and stock levels.",
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    description: "Review customer accounts and profile information.",
  },
  {
    id: "payments",
    label: "Payments",
    icon: CreditCard,
    description: "Review payment outcomes and transaction records.",
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    icon: BarChart3,
    description: "Explore business performance and sales trends.",
  },
];

const LOW_STOCK_THRESHOLD = 10;

const unwrapArray = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const getLocalDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatOrderDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusClass = (value) =>
  String(value || "UNKNOWN")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [ordersLoadError, setOrdersLoadError] = useState(false);
  const [productsLoadError, setProductsLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      const [ordersResult, productsResult] = await Promise.allSettled([
        getAllOrders(),
        getAllProducts(),
      ]);

      if (cancelled) {
        return;
      }

      if (ordersResult.status === "fulfilled") {
        setOrders(unwrapArray(ordersResult.value));
        setOrdersLoadError(false);
      } else {
        setOrdersLoadError(true);
      }

      if (productsResult.status === "fulfilled") {
        setProducts(unwrapArray(productsResult.value));
        setProductsLoadError(false);
      } else {
        setProductsLoadError(true);
      }

      setDashboardLoading(false);
    };

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Refresh dashboard data every 30 seconds.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRefreshKey((previous) => previous + 1);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const activeItem =
    adminNavigation.find((item) => item.id === activeSection) ||
    adminNavigation[0];

  const displayName = user?.name?.trim() || user?.email || "Administrator";

  const openSection = (sectionId) => {
    setActiveSection(sectionId);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/home", { replace: true });
  };

  const ActiveIcon = activeItem.icon;

  const todayKey = getLocalDateKey(new Date());

  const paidOrdersToday = orders.filter(
    (order) =>
      getLocalDateKey(order.orderDate) === todayKey &&
      String(order.paymentStatus).toUpperCase() === "SUCCESS" &&
      String(order.orderStatus).toUpperCase() === "CONFIRMED",
  );

  const todayRevenue = paidOrdersToday.reduce(
    (total, order) => total + (Number(order.totalAmount) || 0),
    0,
  );

  const pendingOrderCount = orders.filter(
    (order) => String(order.orderStatus).toUpperCase() === "PENDING",
  ).length;

  const lowStockProducts = products
    .filter(
      (product) =>
        product.active !== false &&
        Number(product.stock) <= LOW_STOCK_THRESHOLD,
    )
    .sort((a, b) => Number(a.stock) - Number(b.stock));

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
    )
    .slice(0, 5);

  const salesTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    const dateKey = getLocalDateKey(date);

    const successfulOrders = orders.filter(
      (order) =>
        getLocalDateKey(order.orderDate) === dateKey &&
        String(order.paymentStatus).toUpperCase() === "SUCCESS" &&
        String(order.orderStatus).toUpperCase() === "CONFIRMED",
    );

    const revenue = successfulOrders.reduce(
      (total, order) => total + (Number(order.totalAmount) || 0),
      0,
    );

    return {
      dateKey,
      label: date.toLocaleDateString("en-IN", {
        weekday: "short",
      }),
      revenue,
      count: successfulOrders.length,
    };
  });

  const maxSalesRevenue = Math.max(1, ...salesTrend.map((day) => day.revenue));

  const dashboardMetrics = [
    {
      id: "revenue",
      label: "Today's Revenue",
      value: dashboardLoading
        ? "…"
        : ordersLoadError
          ? "—"
          : formatCurrency(todayRevenue),
      description: ordersLoadError
        ? "Order data unavailable"
        : "Confirmed orders with successful payments",
      icon: CreditCard,
      color: "green",
    },
    {
      id: "orders",
      label: "Total Orders",
      value: dashboardLoading
        ? "…"
        : ordersLoadError
          ? "—"
          : orders.length.toLocaleString("en-IN"),
      description: "All orders returned by Order Service",
      icon: ShoppingCart,
      color: "blue",
    },
    {
      id: "pending",
      label: "Pending Orders",
      value: dashboardLoading
        ? "…"
        : ordersLoadError
          ? "—"
          : pendingOrderCount.toLocaleString("en-IN"),
      description: "Orders awaiting completion",
      icon: Clock3,
      color: "orange",
    },
    {
      id: "inventory",
      label: "Low-stock Products",
      value: dashboardLoading
        ? "…"
        : productsLoadError
          ? "—"
          : lowStockProducts.length.toLocaleString("en-IN"),
      description: `Active products with stock ≤ ${LOW_STOCK_THRESHOLD}`,
      icon: AlertTriangle,
      color: "red",
    },
  ];

  return (
    <div
      className={`qm-admin-shell ${
        mobileMenuOpen ? "is-mobile-menu-open" : ""
      }`}
    >
      {mobileMenuOpen && (
        <button
          type="button"
          className="qm-admin-mobile-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className="qm-admin-sidebar">
        <div className="qm-admin-brand">
          <span className="qm-admin-brand-icon">
            <ShoppingCart size={23} />
          </span>

          <div className="qm-admin-brand-copy">
            <h1>QuickMart</h1>
            <span>ADMIN CONSOLE</span>
          </div>

          <button
            type="button"
            className="qm-admin-mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="qm-admin-sidebar-label">WORKSPACE</div>

        <nav className="qm-admin-navigation" aria-label="Admin navigation">
          {adminNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                type="button"
                key={item.id}
                className={`qm-admin-nav-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => openSection(item.id)}
              >
                <Icon size={19} />

                <span>{item.label}</span>

                {isActive && <span className="qm-admin-nav-indicator" />}
              </button>
            );
          })}
        </nav>

        <div className="qm-admin-sidebar-bottom">
          <div className="qm-admin-security-card">
            <span className="qm-admin-security-icon">
              <ShieldCheck size={20} />
            </span>

            <div>
              <strong>Secure workspace</strong>
              <span>Administrator access</span>
            </div>
          </div>

          <div className="qm-admin-user">
            <span className="qm-admin-avatar">
              {displayName.charAt(0).toUpperCase()}
            </span>

            <div className="qm-admin-user-info">
              <strong>{displayName}</strong>
              <span>{user?.email || "Admin account"}</span>
            </div>

            <button
              type="button"
              className="qm-admin-logout-button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="qm-admin-main">
        <header className="qm-admin-topbar">
          <div className="qm-admin-topbar-heading">
            <button
              type="button"
              className="qm-admin-mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="qm-admin-breadcrumb">
                QuickMart <ChevronRight size={14} /> Admin
              </div>

              <h2>{activeItem.label}</h2>
            </div>
          </div>

          <div className="qm-admin-topbar-right">
            <button
              type="button"
              className="qm-admin-refresh-button"
              onClick={() => setRefreshKey((previous) => previous + 1)}
              disabled={dashboardLoading}
            >
              <RefreshCw
                size={15}
                className={dashboardLoading ? "qm-admin-refresh-spinning" : ""}
              />
              Refresh
            </button>
            <span className="qm-admin-role-badge">
              <ShieldCheck size={15} />
              ADMIN
            </span>
          </div>
        </header>

        <div className="qm-admin-page-content">
          {activeSection === "overview" ? (
            <>
              {/* Welcome section */}
              <section className="qm-admin-welcome">
                <div>
                  <span className="qm-admin-eyebrow">STORE OVERVIEW</span>

                  <h3>Welcome back, {displayName.split("@")[0]}!</h3>

                  <p>
                    Monitor your store, review orders and keep your operations
                    running smoothly.
                  </p>
                </div>

                <div className="qm-admin-welcome-illustration">
                  <span className="qm-admin-welcome-circle">
                    <ShoppingCart size={39} />
                  </span>
                  <span className="qm-admin-welcome-check">
                    <CheckCircle2 size={23} />
                  </span>
                </div>
              </section>

              {/* Summary cards */}
              <section className="qm-admin-metrics" aria-label="Store summary">
                {dashboardMetrics.map((metric) => {
                  const Icon = metric.icon;

                  return (
                    <article className="qm-admin-metric-card" key={metric.id}>
                      <div className="qm-admin-metric-top">
                        <span className="qm-admin-metric-label">
                          {metric.label}
                        </span>

                        <span
                          className={`qm-admin-metric-icon ${metric.color}`}
                        >
                          <Icon size={21} />
                        </span>
                      </div>

                      <div className="qm-admin-metric-value">
                        {metric.value}
                      </div>

                      <p className="qm-admin-metric-description">
                        {metric.description}
                      </p>
                    </article>
                  );
                })}
              </section>

              {/* Analytics panel */}
              <section className="qm-admin-panel qm-admin-analytics">
                <div className="qm-admin-panel-header">
                  <div>
                    <h3>Sales analytics</h3>
                    <p>Track revenue and order trends over time.</p>
                  </div>

                  <span className="qm-admin-panel-icon">
                    <BarChart3 size={21} />
                  </span>
                </div>

                <div className="qm-admin-sales-chart-area">
                  {dashboardLoading ? (
                    <div className="qm-admin-chart-message">
                      Loading sales data…
                    </div>
                  ) : ordersLoadError ? (
                    <div className="qm-admin-chart-message" role="alert">
                      Unable to load sales data. Check Order Service and admin
                      access.
                    </div>
                  ) : (
                    <>
                      <div className="qm-admin-chart-summary">
                        <span>Successful revenue · Last 7 days</span>
                        <strong>
                          {formatCurrency(
                            salesTrend.reduce(
                              (total, day) => total + day.revenue,
                              0,
                            ),
                          )}
                        </strong>
                      </div>

                      <div className="qm-admin-sales-chart">
                        {salesTrend.map((day) => {
                          const barHeight =
                            day.revenue > 0
                              ? Math.max(
                                  (day.revenue / maxSalesRevenue) * 100,
                                  8,
                                )
                              : 3;

                          return (
                            <div
                              className="qm-admin-sales-day"
                              key={day.dateKey}
                            >
                              <span className="qm-admin-sales-value">
                                {formatCurrency(day.revenue)}
                              </span>

                              <div className="qm-admin-sales-bar-area">
                                <div
                                  className="qm-admin-sales-bar"
                                  style={{ height: `${barHeight}%` }}
                                  title={`${day.label}: ${formatCurrency(day.revenue)} from ${day.count} successful orders`}
                                />
                              </div>

                              <span className="qm-admin-sales-day-label">
                                {day.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Recent orders and inventory */}
              <div className="qm-admin-bottom-grid">
                <section className="qm-admin-panel">
                  <div className="qm-admin-panel-header">
                    <div>
                      <h3>Recent orders</h3>
                      <p>Latest five orders from your store.</p>
                    </div>

                    <button
                      type="button"
                      className="qm-admin-text-button"
                      onClick={() => openSection("orders")}
                    >
                      View orders
                      <ArrowUpRight size={16} />
                    </button>
                  </div>

                  <div className="qm-admin-table-wrap">
                    <table className="qm-admin-data-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Payment</th>
                        </tr>
                      </thead>

                      <tbody>
                        {dashboardLoading ? (
                          <tr>
                            <td colSpan={5} className="qm-admin-table-message">
                              Loading orders…
                            </td>
                          </tr>
                        ) : ordersLoadError ? (
                          <tr>
                            <td colSpan={5} className="qm-admin-table-message">
                              Unable to load orders. Check Order Service and
                              admin access.
                            </td>
                          </tr>
                        ) : recentOrders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="qm-admin-table-message">
                              No orders found.
                            </td>
                          </tr>
                        ) : (
                          recentOrders.map((order) => (
                            <tr key={order.orderId}>
                              <td className="qm-admin-order-id">
                                #{order.orderId}
                              </td>

                              <td>{formatOrderDate(order.orderDate)}</td>

                              <td className="qm-admin-order-amount">
                                {formatCurrency(order.totalAmount)}
                              </td>

                              <td>
                                <span
                                  className={`qm-admin-status-pill ${statusClass(
                                    order.orderStatus,
                                  )}`}
                                >
                                  {order.orderStatus || "Unknown"}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`qm-admin-status-pill ${statusClass(
                                    order.paymentStatus,
                                  )}`}
                                >
                                  {order.paymentStatus || "Unknown"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="qm-admin-panel">
                  <div className="qm-admin-panel-header">
                    <div>
                      <h3>Inventory alerts</h3>
                      <p>
                        Active products with {LOW_STOCK_THRESHOLD} or fewer
                        units.
                      </p>
                    </div>

                    <span className="qm-admin-panel-icon warning">
                      <AlertTriangle size={21} />
                    </span>
                  </div>

                  {dashboardLoading ? (
                    <div className="qm-admin-inventory-message">
                      Loading product inventory…
                    </div>
                  ) : productsLoadError ? (
                    <div className="qm-admin-inventory-message" role="alert">
                      Unable to load inventory. Check Product Service and admin
                      access.
                    </div>
                  ) : lowStockProducts.length === 0 ? (
                    <div className="qm-admin-inventory-empty">
                      <span className="qm-admin-empty-icon">
                        <CheckCircle2 size={27} />
                      </span>
                      <h4>No low-stock products</h4>
                      <p>
                        All active products are above the configured stock
                        threshold.
                      </p>
                    </div>
                  ) : (
                    <div className="qm-admin-stock-list">
                      {lowStockProducts.slice(0, 5).map((product) => {
                        const stock = Number(product.stock);

                        return (
                          <div className="qm-admin-stock-row" key={product.id}>
                            <span className="qm-admin-stock-product-icon">
                              <Package size={18} />
                            </span>

                            <div className="qm-admin-stock-product-info">
                              <strong>{product.name}</strong>
                              <span>{product.category || "Product"}</span>
                            </div>

                            <span
                              className={`qm-admin-stock-count ${
                                stock === 0 ? "out" : "low"
                              }`}
                            >
                              {stock === 0 ? "Out of stock" : `${stock} left`}
                            </span>
                          </div>
                        );
                      })}

                      {lowStockProducts.length > 5 && (
                        <p className="qm-admin-stock-more">
                          +{lowStockProducts.length - 5} more low-stock products
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="qm-admin-secondary-button"
                    onClick={() => openSection("products")}
                  >
                    Manage products
                    <ChevronRight size={16} />
                  </button>
                </section>
              </div>

              {/* Quick navigation */}
              <section className="qm-admin-quick-access">
                <div className="qm-admin-quick-access-heading">
                  <h3>Quick access</h3>
                  <p>Navigate to a management area.</p>
                </div>

                <div className="qm-admin-quick-access-grid">
                  {adminNavigation
                    .filter((item) => item.id !== "overview")
                    .map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          type="button"
                          key={item.id}
                          className="qm-admin-quick-card"
                          onClick={() => openSection(item.id)}
                        >
                          <span>
                            <Icon size={21} />
                          </span>

                          <strong>{item.label}</strong>

                          <ChevronRight size={17} />
                        </button>
                      );
                    })}
                </div>
              </section>
            </>
          ) : activeSection === "orders" ? (
            <AdminOrders />
          ) : (
            <section className="qm-admin-module-placeholder">
              <span className="qm-admin-module-icon">
                <ActiveIcon size={32} />
              </span>

              <span className="qm-admin-eyebrow">ADMIN WORKSPACE</span>

              <h3>{activeItem.label}</h3>

              <p>{activeItem.description}</p>

              <div className="qm-admin-module-notice">
                This section is prepared for the next implementation stage. We
                will connect it to the existing QuickMart backend APIs without
                duplicating business logic.
              </div>

              <button
                type="button"
                className="qm-admin-primary-button"
                onClick={() => openSection("overview")}
              >
                <LayoutDashboard size={17} />
                Back to overview
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
