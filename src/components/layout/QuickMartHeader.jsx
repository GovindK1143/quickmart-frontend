import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  User,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { useCart } from "../../context/useCart";

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

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate("/home", { replace: true });
  };

  const handleCategory = (category) => {
    setUserMenuOpen(false);

    if (onCategoryClick) {
      onCategoryClick(category);
      return;
    }

    navigate("/home");
  };

  return (
    <>
      <header className="quickmart-header">
        <div className="quickmart-header-inner">
          <Link to="/home" className="quickmart-logo">
            QuickMart
          </Link>

          <div className="quickmart-search">
            <Search size={22} />

            <input
              type="text"
              placeholder="Search for products..."
              value={searchText}
              onChange={(event) => {
                if (onSearchChange) {
                  onSearchChange(event.target.value);
                }
              }}
            />
          </div>

          <div className="delivery-box">
            <div className="delivery-icon">
              <MapPin size={21} />
            </div>

            <div>
              <strong>Delivery in 10 mins</strong>
              <span>Select Location</span>
            </div>

            <ChevronDown size={19} />
          </div>

          {user ? (
            <div className="customer-user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="customer-user-trigger"
                onClick={() => setUserMenuOpen((previous) => !previous)}
                aria-expanded={userMenuOpen}
              >
                <User size={25} />

                <div className="customer-user-text">
                  <span className="customer-user-label">Welcome</span>

                  <strong>Hi, {user.name?.split(" ")[0] || "Customer"}</strong>
                </div>

                <ChevronDown
                  size={21}
                  className={
                    userMenuOpen
                      ? "customer-user-chevron open"
                      : "customer-user-chevron"
                  }
                />
              </button>

              {userMenuOpen && (
                <div className="customer-user-dropdown">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/home");
                    }}
                  >
                    Home
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/orders");
                    }}
                  >
                    My Orders
                  </button>

                  <button
                    type="button"
                    className="customer-logout-button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="login-header-button">
              Login / Sign Up
            </Link>
          )}

          <Link
            to="/cart"
            className="header-cart-button"
            aria-label="Shopping cart"
          >
            <ShoppingCart size={29} />

            {cart.totalItems > 0 && (
              <span className="header-cart-count">{cart.totalItems}</span>
            )}
          </Link>
        </div>
      </header>

      <nav className="category-navigation">
        <div className="category-navigation-inner">
          <button
            type="button"
            className="shop-category-button"
            onClick={() => handleCategory("")}
          >
            Shop by Category
            <ChevronDown size={18} />
          </button>

          <div className="category-links">
            {categories.map((category) => (
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

            <button
              type="button"
              className="category-more"
              onClick={() => handleCategory("")}
            >
              More
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}

export default QuickMartHeader;
