import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Image as ImageIcon,
  Package,
  PackagePlus,
  Power,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";

import {
  createProduct,
  createProductsBulk,
  getAllAdminProducts,
  updateProduct,
  updateProductStatus,
} from "../../services/productService";
import "../../styles/admin-products.css";

const PAGE_SIZE = 10;
const LOW_STOCK_THRESHOLD = 10;

const emptyForm = () => ({
  name: "",
  brand: "",
  category: "",
  description: "",
  imageUrl: "",
  unit: "",
  mrp: "",
  sellingPrice: "",
  stock: "0",
  active: true,
  featured: false,
  featuredOrder: "0",
});

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const getApiErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }

  if (data?.errors && typeof data.errors === "object") {
    const messages = Object.values(data.errors).filter(
      (message) => typeof message === "string",
    );

    if (messages.length) return messages.join(" ");
  }

  if (error?.response?.status === 401) {
    return "Your session may have expired. Sign in again.";
  }

  if (error?.response?.status === 403) {
    return "Administrator permission is required for this operation.";
  }

  return "The request failed. Check Product Service and try again.";
};

const mapProductToForm = (product) => ({
  name: product.name ?? "",
  brand: product.brand ?? "",
  category: product.category ?? "",
  description: product.description ?? "",
  imageUrl: product.imageUrl ?? "",
  unit: product.unit ?? "",
  mrp: String(product.mrp ?? ""),
  sellingPrice: String(product.sellingPrice ?? ""),
  stock: String(product.stock ?? 0),
  active: product.active !== false,
  featured: product.featured === true,
  featuredOrder: String(product.featuredOrder ?? 0),
});

const BULK_CSV_HEADERS = [
  "name",
  "brand",
  "category",
  "description",
  "imageUrl",
  "unit",
  "mrp",
  "sellingPrice",
  "stock",
  "active",
  "featured",
  "featuredOrder",
];

const MAX_BULK_PRODUCTS = 500;

const normalizeCsvHeader = (value) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const parseCsvRows = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      row.push(cell);

      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (inQuotes) {
    throw new Error("The CSV contains an unclosed quoted field.");
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);

    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
};

const parseCsvBoolean = (rawValue, defaultValue, fieldName, csvRow, errors) => {
  const value = String(rawValue ?? "")
    .trim()
    .toLowerCase();

  if (!value) return defaultValue;
  if (["true", "yes", "1"].includes(value)) return true;
  if (["false", "no", "0"].includes(value)) return false;

  errors.push(
    `CSV row ${csvRow}: ${fieldName} must be true/false, yes/no, or 1/0.`,
  );

  return defaultValue;
};

const parseBulkCsv = (text) => {
  const rows = parseCsvRows(text);
  const errors = [];

  if (rows.length < 2) {
    return {
      products: [],
      errors: ["The CSV must contain a header row and at least one product."],
    };
  }

  const headers = rows[0].map(normalizeCsvHeader);
  const headerIndexes = new Map(
    headers.map((header, index) => [header, index]),
  );

  const requiredHeaders = ["name", "category", "mrp", "sellingprice", "stock"];

  const missingHeaders = requiredHeaders.filter(
    (header) => !headerIndexes.has(header),
  );

  if (missingHeaders.length > 0) {
    return {
      products: [],
      errors: [
        `Missing required CSV columns: ${missingHeaders.join(", ")}.`,
        "Download the provided CSV template and use its column headings.",
      ],
    };
  }

  const dataRows = rows
    .slice(1)
    .map((values, index) => ({
      values,
      csvRow: index + 2,
    }))
    .filter(({ values }) => values.some((value) => value.trim() !== ""));

  if (dataRows.length === 0) {
    return {
      products: [],
      errors: ["No product rows were found in the CSV."],
    };
  }

  if (dataRows.length > MAX_BULK_PRODUCTS) {
    errors.push(
      `This file contains ${dataRows.length} products. ` +
        `Import at most ${MAX_BULK_PRODUCTS} products per request.`,
    );
  }

  const products = [];
  const seenProducts = new Set();

  for (const { values, csvRow } of dataRows.slice(0, MAX_BULK_PRODUCTS)) {
    const get = (field) => {
      const columnIndex = headerIndexes.get(normalizeCsvHeader(field));

      return columnIndex === undefined
        ? ""
        : String(values[columnIndex] ?? "").trim();
    };

    const name = get("name");
    const brand = get("brand");
    const category = get("category");

    if (!name) {
      errors.push(`CSV row ${csvRow}: product name is required.`);
    }

    if (!category) {
      errors.push(`CSV row ${csvRow}: category is required.`);
    }

    const parseNumber = (field, { integer = false } = {}) => {
      const raw = get(field);
      const label = field === "sellingPrice" ? "selling price" : field;

      if (!raw) {
        errors.push(`CSV row ${csvRow}: ${label} is required.`);
        return 0;
      }

      const value = Number(raw);

      if (!Number.isFinite(value) || value < 0) {
        errors.push(
          `CSV row ${csvRow}: ${label} must be a non-negative number.`,
        );
        return 0;
      }

      if (integer && !Number.isInteger(value)) {
        errors.push(`CSV row ${csvRow}: ${label} must be a whole number.`);
        return 0;
      }

      return value;
    };

    const mrp = parseNumber("mrp");
    const sellingPrice = parseNumber("sellingPrice");
    const stock = parseNumber("stock", { integer: true });

    const featuredOrderRaw = get("featuredOrder");
    let featuredOrder = 0;

    if (featuredOrderRaw) {
      featuredOrder = Number(featuredOrderRaw);

      if (!Number.isInteger(featuredOrder) || featuredOrder < 0) {
        errors.push(
          `CSV row ${csvRow}: featuredOrder must be a non-negative whole number.`,
        );
        featuredOrder = 0;
      }
    }

    if (sellingPrice > mrp) {
      errors.push(`CSV row ${csvRow}: selling price cannot exceed MRP.`);
    }

    const fieldLimits = [
      ["name", 150],
      ["brand", 100],
      ["category", 100],
      ["description", 1000],
      ["imageUrl", 500],
      ["unit", 50],
    ];

    for (const [field, maxLength] of fieldLimits) {
      if (get(field).length > maxLength) {
        errors.push(
          `CSV row ${csvRow}: ${field} cannot exceed ${maxLength} characters.`,
        );
      }
    }

    const active = parseCsvBoolean(
      get("active"),
      true,
      "active",
      csvRow,
      errors,
    );

    const featured = parseCsvBoolean(
      get("featured"),
      false,
      "featured",
      csvRow,
      errors,
    );

    const duplicateKey = [name, brand, category]
      .map((value) => value.trim().toLowerCase())
      .join("|");

    if (name && category && seenProducts.has(duplicateKey)) {
      errors.push(
        `CSV row ${csvRow}: duplicate product name, brand and category in this file.`,
      );
    }

    if (name && category) {
      seenProducts.add(duplicateKey);
    }

    products.push({
      name,
      brand,
      category,
      description: get("description"),
      imageUrl: get("imageUrl"),
      unit: get("unit"),
      mrp,
      sellingPrice,
      stock,
      active,
      featured,
      featuredOrder,
    });
  }

  return {
    products,
    errors,
  };
};

const downloadBulkTemplate = () => {
  const escapeCsvCell = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = BULK_CSV_HEADERS.map(escapeCsvCell).join(",");

  const blob = new Blob(["\uFEFF", csv, "\r\n"], {
    type: "text/csv;charset=utf-8;",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "quickmart-products-template.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
};

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkProducts, setBulkProducts] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    let active = true;

    getAllAdminProducts()
      .then((response) => {
        if (!active) return;

        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        setProducts(list);
        setLoadError("");
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const categories = useMemo(
    () =>
      [
        ...new Set(products.map((product) => product.category).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const activeCount = products.filter(
    (product) => product.active !== false,
  ).length;

  const inactiveCount = products.length - activeCount;

  const lowStockCount = products.filter(
    (product) =>
      product.active !== false && Number(product.stock) <= LOW_STOCK_THRESHOLD,
  ).length;

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return products
      .filter((product) => {
        if (categoryFilter !== "ALL" && product.category !== categoryFilter) {
          return false;
        }

        if (statusFilter === "ACTIVE" && product.active === false) {
          return false;
        }

        if (statusFilter === "INACTIVE" && product.active !== false) {
          return false;
        }

        if (query) {
          const searchable = [
            product.id,
            product.name,
            product.brand,
            product.category,
            product.description,
            product.unit,
          ]
            .filter((value) => value !== null && value !== undefined)
            .join(" ")
            .toLowerCase();

          if (!searchable.includes(query)) return false;
        }

        return true;
      })
      .sort((a, b) => Number(b.id) - Number(a.id));
  }, [products, searchTerm, categoryFilter, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const reloadProducts = () => {
    setLoading(true);
    setRefreshKey((previous) => previous + 1);
  };

  const openCreateForm = () => {
    setEditingProduct(null);
    setForm(emptyForm());
    setFormError("");
    setNotice(null);
    setModalOpen(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setForm(mapProductToForm(product));
    setFormError("");
    setNotice(null);
    setModalOpen(true);
  };

  const closeForm = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingProduct(null);
    setForm(emptyForm());
    setFormError("");
  };

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setNotice(null);

    const mrp = Number(form.mrp);
    const sellingPrice = Number(form.sellingPrice);
    const stock = Number(form.stock);
    const featuredOrder = Number(form.featuredOrder);

    if (!form.name.trim()) {
      setFormError("Product name is required.");
      return;
    }

    if (!form.category.trim()) {
      setFormError("Product category is required.");
      return;
    }

    if (form.mrp.trim() === "" || !Number.isFinite(mrp) || mrp < 0) {
      setFormError("Enter a valid, non-negative MRP.");
      return;
    }

    if (
      form.sellingPrice.trim() === "" ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      setFormError("Enter a valid, non-negative selling price.");
      return;
    }

    if (sellingPrice > mrp) {
      setFormError("Selling price cannot be greater than MRP.");
      return;
    }

    if (form.stock.trim() === "" || !Number.isInteger(stock) || stock < 0) {
      setFormError("Stock must be a non-negative whole number.");
      return;
    }

    if (
      form.featuredOrder.trim() === "" ||
      !Number.isInteger(featuredOrder) ||
      featuredOrder < 0
    ) {
      setFormError("Featured order must be a non-negative whole number.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      unit: form.unit.trim(),
      mrp,
      sellingPrice,
      stock,
      active: Boolean(form.active),
      featured: Boolean(form.featured),
      featuredOrder,
    };

    try {
      setSaving(true);

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);

        setNotice({
          type: "success",
          message: `Product "${payload.name}" updated successfully.`,
        });
      } else {
        await createProduct(payload);

        setNotice({
          type: "success",
          message: `Product "${payload.name}" added successfully.`,
        });
      }

      setModalOpen(false);
      setEditingProduct(null);
      setForm(emptyForm());
      setLoading(true);
      setRefreshKey((previous) => previous + 1);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (product) => {
    const nextActive = product.active === false;

    const action = nextActive ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${product.name}"?`,
    );

    if (!confirmed) return;

    setNotice(null);
    setUpdatingProductId(product.id);

    try {
      await updateProductStatus(product.id, nextActive);

      setNotice({
        type: "success",
        message: `"${product.name}" has been ${nextActive ? "activated" : "deactivated"}.`,
      });

      setLoading(true);
      setRefreshKey((previous) => previous + 1);
    } catch (error) {
      setNotice({
        type: "error",
        message: getApiErrorMessage(error),
      });
    } finally {
      setUpdatingProductId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("ALL");
    setStatusFilter("ALL");
    setPage(1);
  };

  const resetBulkImport = () => {
    setBulkFileName("");
    setBulkProducts([]);
    setBulkErrors([]);
  };

  const handleBulkFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setBulkFileName(file.name);
    setBulkProducts([]);
    setBulkErrors([]);
    setNotice(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setBulkErrors(["Please select a .csv file."]);
      return;
    }

    try {
      const text = await file.text();
      const result = parseBulkCsv(text);

      setBulkProducts(result.products);
      setBulkErrors(result.errors);
    } catch (error) {
      setBulkProducts([]);
      setBulkErrors([
        error instanceof Error
          ? error.message
          : "Unable to read this CSV file.",
      ]);
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkSaving || bulkProducts.length === 0 || bulkErrors.length > 0) {
      return;
    }

    setBulkSaving(true);
    setNotice(null);

    try {
      const result = await createProductsBulk(bulkProducts);

      const importedCount = Array.isArray(result)
        ? result.length
        : bulkProducts.length;

      setNotice({
        type: "success",
        message: `${importedCount} products imported successfully.`,
      });

      setBulkModalOpen(false);
      resetBulkImport();

      setLoading(true);
      setRefreshKey((previous) => previous + 1);
    } catch (error) {
      setBulkErrors([getApiErrorMessage(error)]);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="qm-products-page">
      <section className="qm-products-heading">
        <div>
          <span className="qm-products-eyebrow">PRODUCT CATALOGUE</span>
          <h3>Products &amp; Inventory</h3>
          <p>Add products, manage prices and monitor available stock.</p>
        </div>

        <div className="qm-products-heading-actions">
          <button
            type="button"
            className="qm-products-button secondary"
            onClick={reloadProducts}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "qm-products-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            className="qm-products-button secondary"
            onClick={() => {
              resetBulkImport();
              setBulkModalOpen(true);
            }}
          >
            <Upload size={16} />
            Import CSV
          </button>

          <button
            type="button"
            className="qm-products-button primary"
            onClick={openCreateForm}
          >
            <PackagePlus size={17} />
            Add product
          </button>
        </div>
      </section>

      {notice && (
        <div
          className={`qm-products-notice ${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          {notice.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{notice.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="qm-products-summary">
        <article>
          <span className="qm-products-summary-icon green">
            <Package size={20} />
          </span>
          <div>
            <span>Total products</span>
            <strong>{loading ? "…" : products.length}</strong>
          </div>
        </article>

        <article>
          <span className="qm-products-summary-icon blue">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <span>Active products</span>
            <strong>{loading ? "…" : activeCount}</strong>
          </div>
        </article>

        <article>
          <span className="qm-products-summary-icon orange">
            <Power size={20} />
          </span>
          <div>
            <span>Inactive products</span>
            <strong>{loading ? "…" : inactiveCount}</strong>
          </div>
        </article>

        <article>
          <span className="qm-products-summary-icon red">
            <AlertCircle size={20} />
          </span>
          <div>
            <span>Low stock (≤ {LOW_STOCK_THRESHOLD})</span>
            <strong>{loading ? "…" : lowStockCount}</strong>
          </div>
        </article>
      </section>

      {loadError && (
        <div className="qm-products-error" role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Unable to load products</strong>
            <p>{loadError}</p>
          </div>
          <button
            type="button"
            className="qm-products-button secondary"
            onClick={reloadProducts}
          >
            Try again
          </button>
        </div>
      )}

      <section className="qm-products-panel">
        <div className="qm-products-toolbar">
          <label className="qm-products-search">
            <Search size={18} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Search by product, brand or ID..."
              aria-label="Search products"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                aria-label="Clear product search"
              >
                <X size={16} />
              </button>
            )}
          </label>

          <div className="qm-products-filters">
            <label>
              <span>Category</span>
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All categories</option>
                {categories.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Product status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All products</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>

            <button
              type="button"
              className="qm-products-clear-button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className="qm-products-table-wrap">
          <table className="qm-products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Pricing</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Featured</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="qm-products-table-message">
                    <RefreshCw size={19} className="qm-products-spin" />
                    <span>Loading products...</span>
                  </td>
                </tr>
              ) : loadError && products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="qm-products-table-message">
                    Product data is unavailable.
                  </td>
                </tr>
              ) : visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="qm-products-table-message">
                    <Package size={25} />
                    <strong>No matching products</strong>
                    <span>Try another search or add a product.</span>
                  </td>
                </tr>
              ) : (
                visibleProducts.map((product) => {
                  const stock = Number(product.stock) || 0;

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="qm-products-product-cell">
                          <span className="qm-products-image">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <ImageIcon size={20} />
                            )}
                          </span>

                          <div>
                            <strong>{product.name}</strong>
                            <span>
                              {product.brand || "No brand"} · ID #{product.id}
                            </span>
                            <small>
                              {product.unit || "Unit not specified"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>{product.category || "—"}</td>

                      <td>
                        <div className="qm-products-price-cell">
                          <strong>
                            {formatCurrency(product.sellingPrice)}
                          </strong>
                          <span>MRP {formatCurrency(product.mrp)}</span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`qm-products-stock ${
                            stock === 0
                              ? "out"
                              : stock <= LOW_STOCK_THRESHOLD
                                ? "low"
                                : "available"
                          }`}
                        >
                          {stock === 0 ? "Out of stock" : `${stock} units`}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`qm-products-status ${
                            product.active === false ? "inactive" : "active"
                          }`}
                        >
                          {product.active === false ? "Inactive" : "Active"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`qm-products-featured ${
                            product.featured ? "yes" : "no"
                          }`}
                        >
                          {product.featured ? "Featured" : "No"}
                        </span>
                      </td>

                      <td>
                        <div className="qm-products-actions">
                          <button
                            type="button"
                            className="qm-products-action edit"
                            onClick={() => openEditForm(product)}
                            aria-label={`Edit ${product.name}`}
                            title="Edit product"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            className={`qm-products-action ${
                              product.active === false
                                ? "activate"
                                : "deactivate"
                            }`}
                            disabled={updatingProductId === product.id}
                            onClick={() => handleToggleStatus(product)}
                            aria-label={`${product.active === false ? "Activate" : "Deactivate"} ${product.name}`}
                            title={
                              product.active === false
                                ? "Activate product"
                                : "Deactivate product"
                            }
                          >
                            <Power size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && !loadError && filteredProducts.length > 0 && (
          <div className="qm-products-pagination">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} of{" "}
              {filteredProducts.length} products
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

      {/* Add / edit product modal */}
      {modalOpen && (
        <div className="qm-products-modal-overlay">
          <section
            className="qm-products-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qm-products-modal-title"
          >
            <header className="qm-products-modal-header">
              <div>
                <span className="qm-products-eyebrow">PRODUCT CATALOGUE</span>
                <h3 id="qm-products-modal-title">
                  {editingProduct ? "Edit product" : "Add new product"}
                </h3>
                <p>Enter product details, pricing and available inventory.</p>
              </div>

              <button
                type="button"
                className="qm-products-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close product form"
              >
                <X size={21} />
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="qm-products-form-body">
                {formError && (
                  <div className="qm-products-form-error" role="alert">
                    <AlertCircle size={17} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="qm-products-form-section">
                  <h4>Basic information</h4>

                  <div className="qm-products-form-grid">
                    <label className="full">
                      Product name *
                      <input
                        value={form.name}
                        onChange={(event) =>
                          updateField("name", event.target.value)
                        }
                        maxLength={150}
                        required
                        placeholder="e.g. Organic Basmati Rice"
                      />
                    </label>

                    <label>
                      Brand
                      <input
                        value={form.brand}
                        onChange={(event) =>
                          updateField("brand", event.target.value)
                        }
                        maxLength={100}
                        placeholder="e.g. QuickMart Select"
                      />
                    </label>

                    <label>
                      Category *
                      <input
                        list="qm-product-category-options"
                        value={form.category}
                        onChange={(event) =>
                          updateField("category", event.target.value)
                        }
                        maxLength={100}
                        required
                        placeholder="Select or enter category"
                      />
                      <datalist id="qm-product-category-options">
                        {categories.map((category) => (
                          <option key={category} value={category} />
                        ))}
                      </datalist>
                    </label>

                    <label className="full">
                      Description
                      <textarea
                        value={form.description}
                        onChange={(event) =>
                          updateField("description", event.target.value)
                        }
                        maxLength={1000}
                        rows={3}
                        placeholder="Describe the product..."
                      />
                    </label>

                    <label className="full">
                      Product image URL
                      <input
                        type="url"
                        value={form.imageUrl}
                        onChange={(event) =>
                          updateField("imageUrl", event.target.value)
                        }
                        maxLength={500}
                        placeholder="https://example.com/product-image.jpg"
                      />
                    </label>

                    {form.imageUrl.trim() && (
                      <div className="qm-products-preview full">
                        <span>Image preview</span>
                        <img
                          src={form.imageUrl}
                          alt="Product preview"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                          onLoad={(event) => {
                            event.currentTarget.style.display = "block";
                          }}
                        />
                      </div>
                    )}

                    <label>
                      Unit / pack size
                      <input
                        value={form.unit}
                        onChange={(event) =>
                          updateField("unit", event.target.value)
                        }
                        maxLength={50}
                        placeholder="e.g. 1 kg, 500 ml"
                      />
                    </label>
                  </div>
                </div>

                <div className="qm-products-form-section">
                  <h4>Pricing and inventory</h4>

                  <div className="qm-products-form-grid">
                    <label>
                      MRP (₹) *
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.mrp}
                        onChange={(event) =>
                          updateField("mrp", event.target.value)
                        }
                        required
                      />
                    </label>

                    <label>
                      Selling price (₹) *
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.sellingPrice}
                        onChange={(event) =>
                          updateField("sellingPrice", event.target.value)
                        }
                        required
                      />
                    </label>

                    <label>
                      Stock quantity *
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.stock}
                        onChange={(event) =>
                          updateField("stock", event.target.value)
                        }
                        required
                      />
                    </label>
                  </div>

                  <p className="qm-products-form-hint">
                    Selling price must not be greater than MRP. Stock is the
                    product's total available quantity.
                  </p>
                </div>

                <div className="qm-products-form-section">
                  <h4>Storefront settings</h4>

                  <div className="qm-products-form-grid">
                    <label>
                      Featured order
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.featuredOrder}
                        onChange={(event) =>
                          updateField("featuredOrder", event.target.value)
                        }
                      />
                    </label>

                    <div className="qm-products-checkboxes">
                      <label>
                        <input
                          type="checkbox"
                          checked={form.active}
                          onChange={(event) =>
                            updateField("active", event.target.checked)
                          }
                        />
                        <span>Active product</span>
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          checked={form.featured}
                          onChange={(event) =>
                            updateField("featured", event.target.checked)
                          }
                        />
                        <span>Featured on homepage</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <footer className="qm-products-modal-footer">
                <button
                  type="button"
                  className="qm-products-button secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="qm-products-button primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="qm-products-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      {editingProduct ? "Save changes" : "Create product"}
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {bulkModalOpen && (
        <div className="qm-products-modal-overlay">
          <section
            className="qm-products-modal qm-products-bulk-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qm-products-bulk-title"
          >
            <header className="qm-products-modal-header">
              <div>
                <span className="qm-products-eyebrow">BULK PRODUCT IMPORT</span>

                <h3 id="qm-products-bulk-title">Import products from CSV</h3>

                <p>
                  Prepare multiple products in a spreadsheet, then upload them
                  together.
                </p>
              </div>

              <button
                type="button"
                className="qm-products-modal-close"
                onClick={() => {
                  if (bulkSaving) return;
                  setBulkModalOpen(false);
                  resetBulkImport();
                }}
                disabled={bulkSaving}
                aria-label="Close bulk import"
              >
                <X size={21} />
              </button>
            </header>

            <div className="qm-products-form-body">
              <section className="qm-products-bulk-instructions">
                <h4>1. Download the CSV template</h4>

                <p>
                  Use the supplied column headings. The product ID is generated
                  by the database, so it should not be included in the upload.
                </p>

                <button
                  type="button"
                  className="qm-products-button secondary"
                  onClick={downloadBulkTemplate}
                >
                  <PackagePlus size={16} />
                  Download CSV template
                </button>
              </section>

              <section className="qm-products-bulk-instructions">
                <h4>2. Select your completed CSV file</h4>

                <p>
                  Required columns: name, category, MRP, selling price and
                  stock. Other columns can be left blank where appropriate.
                </p>

                <label className="qm-products-file-picker">
                  <Upload size={23} />

                  <strong>{bulkFileName || "Choose a CSV file"}</strong>

                  <span>
                    CSV format only · Up to {MAX_BULK_PRODUCTS} products
                  </span>

                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleBulkFileChange}
                    disabled={bulkSaving}
                  />
                </label>
              </section>

              {bulkErrors.length > 0 && (
                <div className="qm-products-bulk-errors" role="alert">
                  <strong>
                    Please correct the following before importing:
                  </strong>

                  <ul>
                    {bulkErrors.slice(0, 8).map((message, index) => (
                      <li key={`${index}-${message}`}>{message}</li>
                    ))}
                  </ul>

                  {bulkErrors.length > 8 && (
                    <p>
                      And {bulkErrors.length - 8} additional validation errors.
                    </p>
                  )}
                </div>
              )}

              {bulkProducts.length > 0 && (
                <section className="qm-products-bulk-preview">
                  <div>
                    <h4>3. Review import preview</h4>

                    <p>
                      {bulkProducts.length} product rows parsed.
                      {bulkErrors.length === 0
                        ? " The file passed frontend validation."
                        : " Fix the errors before uploading."}
                    </p>
                  </div>

                  <div className="qm-products-bulk-preview-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Category</th>
                          <th>Selling price</th>
                          <th>Stock</th>
                        </tr>
                      </thead>

                      <tbody>
                        {bulkProducts.slice(0, 5).map((product, index) => (
                          <tr key={`${product.name}-${index}`}>
                            <td>{product.name || "Missing name"}</td>
                            <td>{product.category || "Missing category"}</td>
                            <td>{formatCurrency(product.sellingPrice)}</td>
                            <td>{product.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {bulkProducts.length > 5 && (
                    <p className="qm-products-bulk-more">
                      Showing 5 of {bulkProducts.length} products.
                    </p>
                  )}
                </section>
              )}

              <div className="qm-products-bulk-policy">
                <CheckCircle2 size={17} />

                <p>
                  The server validates the entire batch before saving. If any
                  product is rejected, the import should fail without partially
                  adding the batch.
                </p>
              </div>
            </div>

            <footer className="qm-products-modal-footer">
              <button
                type="button"
                className="qm-products-button secondary"
                onClick={() => {
                  if (bulkSaving) return;
                  setBulkModalOpen(false);
                  resetBulkImport();
                }}
                disabled={bulkSaving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="qm-products-button primary"
                onClick={handleBulkSubmit}
                disabled={
                  bulkSaving ||
                  bulkProducts.length === 0 ||
                  bulkErrors.length > 0
                }
              >
                {bulkSaving ? (
                  <>
                    <RefreshCw size={16} className="qm-products-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Import {bulkProducts.length || ""} products
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminProducts;
