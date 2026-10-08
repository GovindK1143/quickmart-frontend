import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllProducts } from "../../services/productService";
import ProductGrid from "../../components/product/ProductGrid";
import QuickMartHeader from "../../components/layout/QuickMartHeader";

function Home() {
  const [products, setProducts] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const productData = await getAllProducts();

        const activeProducts = productData.filter((product) => product.active);

        setProducts(activeProducts);
      } catch (requestError) {
        console.error("Failed to load products:", requestError);

        setError("Unable to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const backendCategories = products
      .map((product) => product.category)
      .filter(Boolean);

    return [
      ...new Set([
        "Fruits & Vegetables",
        "Dairy & Bakery",
        "Beverages",
        "Atta, Rice & Dal",
        "Snacks & Munchies",
        "Beauty & Hygiene",
        "Household",
        ...backendCategories,
      ]),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name?.toLowerCase().includes(normalizedSearch) ||
        product.brand?.toLowerCase().includes(normalizedSearch) ||
        product.category?.toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        !selectedCategory ||
        product.category?.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [products, searchText, selectedCategory]);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  return (
    <div className="quickmart-home">
      <QuickMartHeader
        searchText={searchText}
        onSearchChange={setSearchText}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryClick={handleCategoryClick}
      />

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="quickmart-main">
        {/* HERO */}

        <section className="quickmart-hero">
          <div className="hero-content">
            <p className="hero-small-title">QUICKMART</p>

            <h1>
              Fresh groceries
              <br />
              at your doorstep
            </h1>

            <p className="hero-description">
              Quality products, great prices and fast delivery.
            </p>

            <Link to="#products" className="hero-shop-button">
              Shop Now
            </Link>
          </div>

          <div className="hero-visual">
            <div className="hero-vegetable vegetable-one">🥒</div>

            <div className="hero-vegetable vegetable-two">🍅</div>

            <div className="hero-vegetable vegetable-three">🥕</div>

            <div className="hero-vegetable vegetable-four">🥦</div>

            <div className="hero-basket">🥬 🥕 🍅</div>
          </div>
        </section>

        {/* PRODUCTS */}

        <section id="products" className="products-section">
          <div className="products-heading">
            <div>
              <p className="section-eyebrow">FRESH & QUALITY</p>

              <h2>My Smart Basket</h2>
            </div>

            <div className="products-heading-actions">
              <button
                type="button"
                className="view-all-button"
                onClick={() => {
                  setSelectedCategory("");
                  setSearchText("");
                }}
              >
                View All
              </button>

              <button
                type="button"
                className="carousel-button"
                aria-label="Previous products"
              >
                ‹
              </button>

              <button
                type="button"
                className="carousel-button"
                aria-label="Next products"
              >
                ›
              </button>
            </div>
          </div>

          {selectedCategory && (
            <div className="active-filter">
              Showing:
              <strong>{selectedCategory}</strong>
              <button type="button" onClick={() => setSelectedCategory("")}>
                Clear
              </button>
            </div>
          )}

          {loading && (
            <div className="catalogue-message">
              <p>Loading fresh products...</p>
            </div>
          )}

          {error && (
            <div className="catalogue-message error">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {filteredProducts.length > 0 ? (
                <ProductGrid products={filteredProducts} />
              ) : (
                <div className="catalogue-message">
                  <h3>No products found</h3>
                  <p>Try another search or category.</p>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="quickmart-footer">
        <div>
          <strong>QuickMart</strong>
          <span>Fresh groceries delivered to your doorstep.</span>
        </div>

        <span>© 2026 QuickMart. All rights reserved.</span>
      </footer>
    </div>
  );
}

export default Home;
