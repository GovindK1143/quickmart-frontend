import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";

import { getAllAdminCustomers } from "../../services/userService";
import { getAllOrders } from "../../services/orderService";
import "../../styles/admin-customers.css";

const PAGE_SIZE = 10;

const unwrapArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.content)) return response.content;
  return [];
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusClass = (value) =>
  String(value || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

const getDeliveryAddress = (order) =>
  [
    order.deliveryHouseFlat,
    order.deliveryStreetArea,
    order.deliveryCity,
    order.deliveryState,
    order.deliveryPincode ? `PIN ${order.deliveryPincode}` : "",
    order.deliveryLandmark
      ? /^near\s/i.test(order.deliveryLandmark)
        ? order.deliveryLandmark
        : `Near ${order.deliveryLandmark}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [customerError, setCustomerError] = useState("");
  const [ordersError, setOrdersError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadCustomers = async () => {
      const [customerResult, orderResult] = await Promise.allSettled([
        getAllAdminCustomers(),
        getAllOrders(),
      ]);

      if (cancelled) return;

      if (customerResult.status === "fulfilled") {
        setCustomers(unwrapArray(customerResult.value));
        setCustomerError("");
      } else {
        setCustomerError(
          customerResult.reason?.response?.data?.message ||
            "Unable to load customers. Check User Service and administrator access.",
        );
      }

      if (orderResult.status === "fulfilled") {
        setOrders(unwrapArray(orderResult.value));
        setOrdersError("");
      } else {
        setOrdersError(
          orderResult.reason?.response?.data?.message ||
            "Order history is unavailable. Check Order Service and administrator access.",
        );
      }

      setLoading(false);
    };

    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const customerOrdersById = useMemo(() => {
    const result = new Map();

    for (const order of orders) {
      const key = String(order.userId ?? "");

      if (!key) continue;

      if (!result.has(key)) result.set(key, []);
      result.get(key).push(order);
    }

    for (const [key, customerOrders] of result) {
      customerOrders.sort(
        (a, b) =>
          new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
      );

      result.set(key, customerOrders);
    }

    return result;
  }, [orders]);

  const customersWithOrders = useMemo(
    () =>
      customers.filter(
        (customer) =>
          (customerOrdersById.get(String(customer.userId)) || []).length > 0,
      ).length,
    [customers, customerOrdersById],
  );

  const totalSuccessfulRevenue = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            String(order.orderStatus).toUpperCase() === "CONFIRMED" &&
            String(order.paymentStatus).toUpperCase() === "SUCCESS",
        )
        .reduce((total, order) => total + (Number(order.totalAmount) || 0), 0),
    [orders],
  );

  const filteredCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return customers
      .filter((customer) => {
        if (!query) return true;

        const searchable = [
          customer.userId,
          customer.name,
          customer.email,
          customer.mobile,
          customer.address,
          customer.role,
        ]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .sort((a, b) => Number(b.userId || 0) - Number(a.userId || 0));
  }, [customers, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const visibleCustomers = filteredCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const selectedCustomerOrders = selectedCustomer
    ? customerOrdersById.get(String(selectedCustomer.userId)) || []
    : [];

  const refresh = () => {
    setLoading(true);
    setRefreshKey((previous) => previous + 1);
  };

  const exportCustomers = () => {
    const headers = [
      "Customer ID",
      "Name",
      "Email",
      "Mobile",
      "Profile Address",
      "Total Orders",
      "Successful Spend",
    ];

    const rows = filteredCustomers.map((customer) => {
      const customerOrders =
        customerOrdersById.get(String(customer.userId)) || [];

      const spend = customerOrders
        .filter(
          (order) =>
            String(order.orderStatus).toUpperCase() === "CONFIRMED" &&
            String(order.paymentStatus).toUpperCase() === "SUCCESS",
        )
        .reduce((total, order) => total + (Number(order.totalAmount) || 0), 0);

      return [
        customer.userId,
        customer.name,
        customer.email,
        customer.mobile,
        customer.address,
        customerOrders.length,
        spend,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `quickmart-customers-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="qm-customers-page">
      <section className="qm-customers-heading">
        <div>
          <span className="qm-customers-eyebrow">CUSTOMER MANAGEMENT</span>
          <h3>Customers</h3>
          <p>
            Search customer accounts, review contact details and inspect order
            history.
          </p>
        </div>

        <div className="qm-customers-heading-actions">
          <button
            type="button"
            className="qm-customers-button secondary"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "qm-customers-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            className="qm-customers-button primary"
            onClick={exportCustomers}
            disabled={loading || filteredCustomers.length === 0}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </section>

      <section className="qm-customers-summary">
        <article>
          <span className="qm-customers-summary-icon green">
            <UserRound size={20} />
          </span>
          <div>
            <span>Total customers</span>
            <strong>{loading ? "…" : customers.length}</strong>
          </div>
        </article>

        <article>
          <span className="qm-customers-summary-icon blue">
            <ShoppingCart size={20} />
          </span>
          <div>
            <span>Customers with orders</span>
            <strong>{loading ? "…" : customersWithOrders}</strong>
          </div>
        </article>

        <article>
          <span className="qm-customers-summary-icon orange">
            <ShoppingCart size={20} />
          </span>
          <div>
            <span>Total orders</span>
            <strong>{ordersError ? "—" : loading ? "…" : orders.length}</strong>
          </div>
        </article>

        <article>
          <span className="qm-customers-summary-icon green">
            <span className="qm-customers-rupee">₹</span>
          </span>
          <div>
            <span>Successful order revenue</span>
            <strong>
              {ordersError
                ? "—"
                : loading
                  ? "…"
                  : formatCurrency(totalSuccessfulRevenue)}
            </strong>
          </div>
        </article>
      </section>

      {customerError && (
        <div className="qm-customers-error" role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Unable to load customers</strong>
            <p>{customerError}</p>
          </div>
          <button
            type="button"
            className="qm-customers-button secondary"
            onClick={refresh}
          >
            Try again
          </button>
        </div>
      )}

      {ordersError && !customerError && (
        <div className="qm-customers-warning" role="status">
          <AlertCircle size={17} />
          <span>
            Customer details are available, but order history could not be
            loaded.
          </span>
        </div>
      )}

      <section className="qm-customers-panel">
        <div className="qm-customers-toolbar">
          <label className="qm-customers-search">
            <Search size={18} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Search by customer ID, name, email or mobile..."
              aria-label="Search customers"
            />

            {searchTerm && (
              <button
                type="button"
                aria-label="Clear customer search"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
              >
                <X size={16} />
              </button>
            )}
          </label>
        </div>

        <div className="qm-customers-table-wrap">
          <table className="qm-customers-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Orders</th>
                <th>Successful spend</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="qm-customers-table-message">
                    <RefreshCw size={19} className="qm-customers-spin" />
                    <span>Loading customers...</span>
                  </td>
                </tr>
              ) : customerError && customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="qm-customers-table-message">
                    Customer data is unavailable.
                  </td>
                </tr>
              ) : visibleCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="qm-customers-table-message">
                    <UserRound size={25} />
                    <strong>No matching customers</strong>
                    <span>Try a different search term.</span>
                  </td>
                </tr>
              ) : (
                visibleCustomers.map((customer) => {
                  const customerOrders =
                    customerOrdersById.get(String(customer.userId)) || [];

                  const spend = customerOrders
                    .filter(
                      (order) =>
                        String(order.orderStatus).toUpperCase() ===
                          "CONFIRMED" &&
                        String(order.paymentStatus).toUpperCase() === "SUCCESS",
                    )
                    .reduce(
                      (total, order) =>
                        total + (Number(order.totalAmount) || 0),
                      0,
                    );

                  const displayName =
                    customer.name?.trim() || "Unnamed customer";

                  return (
                    <tr key={customer.userId}>
                      <td>
                        <div className="qm-customers-person">
                          <span className="qm-customers-avatar">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <strong>{displayName}</strong>
                            <span>Customer #{customer.userId}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="qm-customers-contact">
                          <Mail size={14} />
                          {customer.email || "—"}
                        </span>
                      </td>

                      <td>
                        <span className="qm-customers-contact">
                          <Phone size={14} />
                          {customer.mobile || "—"}
                        </span>
                      </td>

                      <td>{ordersError ? "—" : customerOrders.length}</td>

                      <td className="qm-customers-spend">
                        {ordersError ? "—" : formatCurrency(spend)}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="qm-customers-view-button"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && !customerError && filteredCustomers.length > 0 && (
          <div className="qm-customers-pagination">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredCustomers.length)} of{" "}
              {filteredCustomers.length} customers
            </span>

            <div>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((previous) => Math.min(totalPages, previous + 1))
                }
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedCustomer && (
        <div className="qm-customers-modal-overlay">
          <section
            className="qm-customers-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qm-customers-modal-title"
          >
            <header className="qm-customers-modal-header">
              <div>
                <span className="qm-customers-eyebrow">CUSTOMER PROFILE</span>
                <h3 id="qm-customers-modal-title">
                  {selectedCustomer.name || "Unnamed customer"}
                </h3>
                <p>Customer ID: {selectedCustomer.userId}</p>
              </div>

              <button
                type="button"
                className="qm-customers-modal-close"
                aria-label="Close customer details"
                onClick={() => setSelectedCustomer(null)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="qm-customers-modal-body">
              <section className="qm-customers-detail-section">
                <h4>
                  <UserRound size={17} />
                  Profile information
                </h4>

                <div className="qm-customers-info-row">
                  <span>Email</span>
                  <strong>{selectedCustomer.email || "—"}</strong>
                </div>

                <div className="qm-customers-info-row">
                  <span>Mobile</span>
                  <strong>{selectedCustomer.mobile || "—"}</strong>
                </div>

                <div className="qm-customers-info-row">
                  <span>Role</span>
                  <strong>{selectedCustomer.role || "CUSTOMER"}</strong>
                </div>
              </section>

              <section className="qm-customers-detail-section">
                <h4>
                  <MapPin size={17} />
                  Profile address
                </h4>

                <p className="qm-customers-address">
                  {selectedCustomer.address || "No profile address recorded."}
                </p>
              </section>

              <section className="qm-customers-detail-section">
                <h4>
                  <ShoppingCart size={17} />
                  Order history
                </h4>

                {ordersError ? (
                  <p className="qm-customers-muted">{ordersError}</p>
                ) : selectedCustomerOrders.length === 0 ? (
                  <p className="qm-customers-muted">
                    This customer has no orders.
                  </p>
                ) : (
                  <div className="qm-customers-order-list">
                    {selectedCustomerOrders.map((order) => (
                      <article
                        className="qm-customers-order"
                        key={order.orderId}
                      >
                        <div className="qm-customers-order-top">
                          <strong>Order #{order.orderId}</strong>
                          <strong>{formatCurrency(order.totalAmount)}</strong>
                        </div>

                        <span className="qm-customers-order-date">
                          {formatDate(order.orderDate)}
                        </span>

                        <div className="qm-customers-order-statuses">
                          <span
                            className={`qm-customers-status ${statusClass(
                              order.orderStatus,
                            )}`}
                          >
                            {order.orderStatus || "Unknown"}
                          </span>
                          <span
                            className={`qm-customers-status ${statusClass(
                              order.paymentStatus,
                            )}`}
                          >
                            Payment: {order.paymentStatus || "Unknown"}
                          </span>
                        </div>

                        <div className="qm-customers-order-items">
                          {(order.items || []).map((item, index) => (
                            <span
                              key={item.itemId ?? `${item.productId}-${index}`}
                            >
                              {item.productName} × {item.quantity}
                            </span>
                          ))}
                        </div>

                        {getDeliveryAddress(order) && (
                          <div className="qm-customers-delivery-address">
                            <MapPin size={14} />
                            <span>
                              {order.deliveryAddressLabel
                                ? `${order.deliveryAddressLabel}: `
                                : ""}
                              {getDeliveryAddress(order)}
                            </span>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <footer className="qm-customers-modal-footer">
              <button
                type="button"
                className="qm-customers-button primary"
                onClick={() => setSelectedCustomer(null)}
              >
                Close details
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminCustomers;
