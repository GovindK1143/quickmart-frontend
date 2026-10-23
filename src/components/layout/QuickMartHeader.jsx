import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  UserRoundPen,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useCart } from "../../context/useCart";
import "../../styles/quickmart-home.css";

const DEFAULT_CATEGORIES = [
  "Fruits & Vegetables",
  "Dairy & Bakery",
  "Beverages",
  "Atta, Rice & Dal",
  "Snacks & Munchies",
  "Beauty & Hygiene",
  "Household",
  "Flour",
  "Cooking",
];

function QuickMartHeader({
  searchText = "",
  onSearchChange,
  categories = DEFAULT_CATEGORIES,
  selectedCategory = "",
  onCategoryClick,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const userMenuRef = useRef(null);
  const categoryMenuRef = useRef(null);
  const moreMenuRef = useRef(null);

  const availableCategories = [
    ...new Set(
      categories.filter(
        (category) => typeof category === "string" && category.trim() !== "",
      ),
    ),
  ];

  const visibleCategories = availableCategories.slice(0, 5);
  const moreCategories = availableCategories.slice(5);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }

      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target)
      ) {
        setCategoryMenuOpen(false);
      }

      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setCategoryMenuOpen(false);
        setMoreMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    setUserMenuOpen(false);
    // Navigate away from protected pages first.
    navigate("/home", { replace: true });

    // Clear the authentication state.
    logout();
  };

  const handleCategory = (category) => {
    setUserMenuOpen(false);
    setCategoryMenuOpen(false);
    setMoreMenuOpen(false);

    if (onCategoryClick) {
      onCategoryClick(category);
      return;
    }

    navigate("/home");
  };

  return (
    <div className="qm-sticky-header-shell">
      <header className="quickmart-header">
        <div className="quickmart-header-inner">
          <Link
            to="/home"
            className="quickmart-logo"
            onClick={(event) => {
              event.preventDefault();
              window.location.assign("/home");
            }}
          >
            QuickMart
          </Link>

          <label className="quickmart-search">
            <Search size={22} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search products"
              placeholder="Search for products, brands and more..."
              value={searchText}
              onChange={(event) => onSearchChange?.(event.target.value)}
            />
          </label>

          <div
            className="delivery-box"
            aria-label="Delivery in 10 minutes; location not selected"
          >
            <span className="delivery-icon">
              <MapPin size={21} />
            </span>
            <span className="qm-delivery-copy">
              <strong>Delivery in 10 mins</strong>
              <span>Select Location</span>
            </span>
            <ChevronDown size={19} />
          </div>

          {user ? (
            <div className="customer-user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="customer-user-trigger"
                onClick={() => setUserMenuOpen((previous) => !previous)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <span className="qm-user-avatar" aria-hidden="true">
                  {(user.name?.trim()?.[0] || "C").toUpperCase()}
                </span>
                <span className="customer-user-text">
                  <span className="customer-user-label">Welcome</span>
                  <strong>Hi, {user.name?.split(" ")[0] || "Customer"}</strong>
                </span>
                <ChevronDown
                  size={20}
                  className={
                    userMenuOpen
                      ? "customer-user-chevron open"
                      : "customer-user-chevron"
                  }
                />
              </button>

              {userMenuOpen && (
                <div className="customer-user-dropdown" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/home");
                    }}
                  >
                    Home
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={location.pathname === "/profile" ? "active" : ""}
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/profile");
                    }}
                  >
                    <UserRoundPen size={16} aria-hidden="true" />
                    My Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/orders");
                    }}
                  >
                    My Orders
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="customer-logout-button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              state={{ backgroundLocation: location }}
              className="login-header-button"
            >
              Login / Sign Up
            </Link>
          )}

          <Link
            to="/cart"
            className="header-cart-button"
            aria-label={`Shopping cart, ${cart.totalItems || 0} items`}
          >
            <ShoppingCart size={29} />
            {cart.totalItems > 0 && (
              <span className="header-cart-count">{cart.totalItems}</span>
            )}
          </Link>
        </div>
      </header>

      <nav className="category-navigation" aria-label="Shop categories">
        <div className="category-navigation-inner">
          {/* Shop by Category dropdown */}
          <div className="shop-category-menu-wrap" ref={categoryMenuRef}>
            <button
              type="button"
              className="shop-category-button"
              aria-expanded={categoryMenuOpen}
              aria-haspopup="menu"
              onClick={() => {
                setCategoryMenuOpen((previous) => !previous);
                setMoreMenuOpen(false);
              }}
            >
              Shop by Category
              <ChevronDown
                size={18}
                className={categoryMenuOpen ? "category-chevron-open" : ""}
              />
            </button>

            {categoryMenuOpen && (
              <div className="category-dropdown" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={`category-dropdown-item ${
                    !selectedCategory ? "active" : ""
                  }`}
                  onClick={() => handleCategory("")}
                >
                  All Products
                </button>

                {availableCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    role="menuitem"
                    className={`category-dropdown-item ${
                      selectedCategory === category ? "active" : ""
                    }`}
                    onClick={() => handleCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main navigation: first five categories */}
          <div className="category-links">
            {visibleCategories.map((category) => (
              <button
                key={category}
                type="button"
                className={
                  selectedCategory === category
                    ? "category-link active"
                    : "category-link"
                }
                onClick={() => handleCategory(category)}
              >
                {category}
              </button>
            ))}

            {/* More dropdown: remaining categories */}
            {moreCategories.length > 0 && (
              <div className="category-more-wrap" ref={moreMenuRef}>
                <button
                  type="button"
                  className="category-more"
                  aria-expanded={moreMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setMoreMenuOpen((previous) => !previous);
                    setCategoryMenuOpen(false);
                  }}
                >
                  More
                  <ChevronRight size={18} />
                </button>

                {moreMenuOpen && (
                  <div
                    className="category-dropdown category-dropdown-right"
                    role="menu"
                  >
                    {moreCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        role="menuitem"
                        className={`category-dropdown-item ${
                          selectedCategory === category ? "active" : ""
                        }`}
                        onClick={() => handleCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}

export default QuickMartHeader;
