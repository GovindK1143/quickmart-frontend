import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import {
  getActiveCategories,
  getAllProducts,
  getFeaturedProducts,
} from "../../services/productService";
import ProductGrid from "../../components/product/ProductGrid";
import QuickMartHeader from "../../components/layout/QuickMartHeader";

const CATEGORY_TERMS = {
  "fruits & vegetables": ["fruit", "vegetable", "produce", "herb", "coriander"],
  "fruits and vegetables": [
    "fruit",
    "vegetable",
    "produce",
    "herb",
    "coriander",
  ],
  "dairy & bakery": [
    "dairy",
    "bakery",
    "milk",
    "bread",
    "egg",
    "cheese",
    "curd",
  ],
  beverages: [
    "beverage",
    "drink",
    "tea",
    "coffee",
    "juice",
    "water",
    "milk drink",
  ],
  "atta, rice & dal": [
    "atta",
    "flour",
    "rice",
    "dal",
    "pulse",
    "grain",
    "oil",
    "ghee",
    "salt",
    "sugar",
    "staple",
  ],
  "daily staples": [
    "atta",
    "flour",
    "rice",
    "dal",
    "pulse",
    "grain",
    "oil",
    "ghee",
    "salt",
    "sugar",
    "staple",
  ],
  "snacks & munchies": [
    "snack",
    "munch",
    "chips",
    "biscuit",
    "cookie",
    "chocolate",
    "noodle",
    "pasta",
  ],
  "snacks store": [
    "snack",
    "munch",
    "chips",
    "biscuit",
    "cookie",
    "chocolate",
    "noodle",
    "pasta",
  ],
  "beauty & hygiene": [
    "beauty",
    "hygiene",
    "personal care",
    "skin",
    "hair",
    "oral",
    "shaving",
    "soap",
    "shampoo",
    "perfume",
  ],
  household: [
    "household",
    "cleaning",
    "detergent",
    "disinfectant",
    "garbage",
    "freshener",
    "repellent",
  ],
  "cleaning & household": [
    "household",
    "cleaning",
    "detergent",
    "disinfectant",
    "garbage",
    "freshener",
    "repellent",
  ],
};

const PROMO_SHORTCUTS = [
  {
    icon: "🥬",
    title: "Farm Fresh",
    subtitle: "Fresh picks every day",
    category: "Fruits & Vegetables",
    tone: "mint",
  },
  {
    icon: "🌿",
    title: "Wellness Store",
    subtitle: "Goodness for your home",
    category: "Beauty & Hygiene",
    tone: "purple",
  },
  {
    icon: "🛒",
    title: "Buy More, Save More",
    subtitle: "Bigger basket, better value",
    category: "",
    tone: "olive",
  },
  {
    icon: "🏷️",
    title: "Deals of the Week",
    subtitle: "Fresh deals to explore",
    category: "",
    tone: "rose",
  },
  {
    icon: "🥣",
    title: "Daily Essentials",
    subtitle: "Stock up on the basics",
    category: "Atta, Rice & Dal",
    tone: "cream",
  },
  {
    icon: "🧺",
    title: "QuickMart Combos",
    subtitle: "Handpicked value packs",
    category: "Snacks & Munchies",
    tone: "sand",
  },
];

const CATEGORY_SHOWCASES = [
  {
    title: "Fruits and Vegetables",
    category: "Fruits & Vegetables",
    layout: "four",
    tiles: [
      {
        title: "Fresh Vegetables",
        offer: "MIN 27% OFF",
        keywords: ["vegetable", "carrot", "potato", "onion"],
        image:
          "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=640&q=80",
        emoji: "🥕",
      },
      {
        title: "Fresh Fruits",
        offer: "MIN 27% OFF",
        keywords: ["fruit", "apple", "banana", "mango"],
        image:
          "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=640&q=80",
        emoji: "🍎",
      },
      {
        title: "Cuts & Exotics",
        offer: "MIN 27% OFF",
        keywords: ["exotic", "dragon fruit", "pomegranate", "cut fruit"],
        image:
          "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=640&q=80",
        emoji: "🍉",
      },
      {
        title: "Herbs & Seasonings",
        offer: "MIN 27% OFF",
        keywords: ["herb", "coriander", "seasoning", "mint"],
        image:
          "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=640&q=80",
        emoji: "🌿",
      },
    ],
  },
  {
    title: "Your Daily Staples",
    category: "Daily Staples",
    layout: "six",
    tiles: [
      {
        title: "Atta & Flour",
        offer: "EVERYDAY VALUE",
        keywords: ["atta", "flour", "wheat"],
        image:
          "https://images.unsplash.com/photo-1627485937980-221c88ac04f9?auto=format&fit=crop&w=640&q=80",
        emoji: "🌾",
      },
      {
        title: "Rice & Rice Products",
        offer: "EVERYDAY VALUE",
        keywords: ["rice"],
        image:
          "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=640&q=80",
        emoji: "🍚",
      },
      {
        title: "Dals & Pulses",
        offer: "EVERYDAY VALUE",
        keywords: ["dal", "pulse", "lentil"],
        image:
          "https://images.unsplash.com/photo-1515543904379-3d757ldf5b11?auto=format&fit=crop&w=640&q=80",
        emoji: "🫘",
      },
      {
        title: "Cooking Oils & Ghee",
        offer: "VALUE PICKS",
        keywords: ["oil", "ghee"],
        image:
          "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=640&q=80",
        emoji: "🫙",
      },
      {
        title: "Dry Fruits",
        offer: "VALUE PICKS",
        keywords: ["dry fruit", "almond", "cashew", "nuts"],
        image:
          "https://images.unsplash.com/photo-1505576633757-0ac1084af824?auto=format&fit=crop&w=640&q=80",
        emoji: "🥜",
      },
      {
        title: "Salt, Sugar & Jaggery",
        offer: "DAILY ESSENTIALS",
        keywords: ["salt", "sugar", "jaggery"],
        image:
          "https://images.unsplash.com/photo-1518110925495-5fe2fda0442b?auto=format&fit=crop&w=640&q=80",
        emoji: "🧂",
      },
    ],
  },
  {
    title: "Beverages",
    category: "Beverages",
    layout: "six",
    tiles: [
      {
        title: "Health Drinks",
        offer: "UP TO 20% OFF",
        keywords: ["health drink", "malt", "nutrition"],
        image:
          "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=640&q=80",
        emoji: "🥛",
      },
      {
        title: "Tea & Coffee",
        offer: "UP TO 40% OFF",
        keywords: ["tea", "coffee"],
        image:
          "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=640&q=80",
        emoji: "☕",
      },
      {
        title: "Flavoured Milk",
        offer: "UP TO 30% OFF",
        keywords: ["flavoured milk", "soy milk"],
        image:
          "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=640&q=80",
        emoji: "🥤",
      },
      {
        title: "Juices",
        offer: "UP TO 30% OFF",
        keywords: ["juice"],
        image:
          "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=640&q=80",
        emoji: "🧃",
      },
      {
        title: "Energy Drinks",
        offer: "UP TO 15% OFF",
        keywords: ["energy drink"],
        image:
          "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?auto=format&fit=crop&w=640&q=80",
        emoji: "⚡",
      },
      {
        title: "Soft Drinks",
        offer: "UP TO 15% OFF",
        keywords: ["soft drink", "soda", "cola"],
        image:
          "https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=640&q=80",
        emoji: "🥤",
      },
    ],
  },
  {
    title: "Snacks Store",
    category: "Snacks Store",
    layout: "four",
    tiles: [
      {
        title: "Chai Time Snacks",
        offer: "UP TO 50% OFF",
        keywords: ["snack", "biscuit", "namkeen"],
        image:
          "https://images.unsplash.com/photo-1621939514649-280e2aa3f096?auto=format&fit=crop&w=640&q=80",
        emoji: "🍪",
      },
      {
        title: "Morning Starters",
        offer: "UP TO 50% OFF",
        keywords: ["breakfast", "cereal", "oats"],
        image:
          "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=640&q=80",
        emoji: "🥣",
      },
      {
        title: "Pasta, Sauces & More",
        offer: "UP TO 40% OFF",
        keywords: ["pasta", "sauce", "noodle"],
        image:
          "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=640&q=80",
        emoji: "🍝",
      },
      {
        title: "Sweet Cravings",
        offer: "UP TO 40% OFF",
        keywords: ["chocolate", "sweet", "candy"],
        image:
          "https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=640&q=80",
        emoji: "🍫",
      },
    ],
  },
  {
    title: "Cleaning & Household",
    category: "Household",
    layout: "four",
    tiles: [
      {
        title: "Cleaners & Disinfectants",
        offer: "UP TO 40% OFF",
        keywords: ["cleaner", "disinfectant"],
        image:
          "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=640&q=80",
        emoji: "🧴",
      },
      {
        title: "Detergents & Fabric Care",
        offer: "UP TO 50% OFF",
        keywords: ["detergent", "fabric", "laundry"],
        image:
          "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=640&q=80",
        emoji: "🧺",
      },
      {
        title: "Disposables & Garbage Bags",
        offer: "UP TO 25% OFF",
        keywords: ["disposable", "garbage", "tissue"],
        image:
          "https://images.unsplash.com/photo-1605600659873-d808a13e4d9a?auto=format&fit=crop&w=640&q=80",
        emoji: "🗑️",
      },
      {
        title: "Fresheners & Repellents",
        offer: "UP TO 40% OFF",
        keywords: ["freshener", "repellent", "mosquito"],
        image:
          "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=640&q=80",
        emoji: "🌸",
      },
    ],
  },
  {
    title: "Beauty and Hygiene",
    category: "Beauty & Hygiene",
    layout: "six",
    tiles: [
      {
        title: "Makeup Essentials",
        offer: "UP TO 60% OFF",
        keywords: ["makeup", "cosmetic"],
        image:
          "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=640&q=80",
        emoji: "💄",
      },
      {
        title: "Moisturisers & Serums",
        offer: "UP TO 50% OFF",
        keywords: ["moisturiser", "moisturizer", "serum", "skin"],
        image:
          "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=640&q=80",
        emoji: "🧴",
      },
      {
        title: "Perfumes",
        offer: "UP TO 50% OFF",
        keywords: ["perfume", "fragrance"],
        image:
          "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=640&q=80",
        emoji: "🌺",
      },
      {
        title: "Shaving Care",
        offer: "UP TO 50% OFF",
        keywords: ["shaving", "razor"],
        image:
          "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=640&q=80",
        emoji: "🪒",
      },
      {
        title: "Hair Care",
        offer: "MIN 30% OFF",
        keywords: ["hair", "shampoo", "conditioner"],
        image:
          "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=640&q=80",
        emoji: "🧴",
      },
      {
        title: "Oral Care",
        offer: "UP TO 40% OFF",
        keywords: ["oral", "toothpaste", "toothbrush"],
        image:
          "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=640&q=80",
        emoji: "🪥",
      },
    ],
  },
];

const TOP_OFFERS = [
  {
    eyebrow: "FRESH PICKS",
    title: "DEALS OF\nTHE WEEK",
    caption: "Discover this week’s offers",
    tone: "red",
  },
  {
    eyebrow: "SMART SAVINGS",
    title: "BUY MORE,\nSAVE MORE",
    caption: "More value in every basket",
    tone: "green",
  },
  {
    eyebrow: "QUICKMART COMBOS",
    title: "COMBOS\nYOU’LL LOVE",
    caption: "Explore value combinations",
    tone: "orange",
  },
  {
    eyebrow: "EVERYDAY VALUE",
    title: "THE DAILY\nESSENTIALS",
    caption: "Great prices for daily needs",
    tone: "dark",
  },
];

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=90";

function normalizeProducts(response) {
  if (Array.isArray(response)) return response;

  const possibleLists = [
    response?.products,
    response?.content,
    response?.items,
    response?.data,
  ];
  return possibleLists.find(Array.isArray) ?? null;
}

function productMatchesCategory(product, selectedCategory) {
  if (!selectedCategory) return true;

  const category = String(product.category ?? "")
    .toLowerCase()
    .trim();
  const name = String(product.name ?? "").toLowerCase();
  const selected = selectedCategory.toLowerCase().trim();

  if (category === selected) return true;

  const terms = CATEGORY_TERMS[selected];
  if (terms) {
    const searchableText = `${category} ${name}`;
    return terms.some((term) => searchableText.includes(term));
  }

  return category.includes(selected) || name.includes(selected);
}

function CategoryTile({ tile, products, onSelect }) {
  const matchingProduct = useMemo(() => {
    const words = tile.keywords.map((word) => word.toLowerCase());
    return products.find((product) => {
      if (!product.imageUrl) return false;
      const searchable =
        `${product.name ?? ""} ${product.category ?? ""}`.toLowerCase();
      return words.some((word) => searchable.includes(word));
    });
  }, [products, tile.keywords]);

  const [failedImages, setFailedImages] = useState([]);

  const imageCandidates = [matchingProduct?.imageUrl, tile.image].filter(
    (source, index, sources) => source && sources.indexOf(source) === index,
  );

  const imageSource =
    imageCandidates.find((source) => !failedImages.includes(source)) || "";

  const handleImageError = () => {
    if (!imageSource) return;

    setFailedImages((previous) =>
      previous.includes(imageSource) ? previous : [...previous, imageSource],
    );
  };

  return (
    <button
      type="button"
      className="qm-showcase-card"
      onClick={() => onSelect(tile.filterCategory)}
    >
      <span className="qm-showcase-copy">
        <span className="qm-showcase-title">{tile.title}</span>
        <strong className="qm-showcase-offer">{tile.offer}</strong>
      </span>

      <span className="qm-showcase-image-wrap" aria-hidden="true">
        {imageSource ? (
          <img
            src={imageSource}
            alt=""
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <span className="qm-showcase-emoji">{tile.emoji}</span>
        )}
      </span>
    </button>
  );
}

function CategoryShowcase({ section, products, onSelect }) {
  const trackRef = useRef(null);

  const scroll = (direction) => {
    trackRef.current?.scrollBy({
      left: direction * Math.max(trackRef.current.clientWidth * 0.75, 260),
      behavior: "smooth",
    });
  };

  return (
    <section className="qm-showcase-section">
      <div className="qm-showcase-heading">
        <h2>{section.title}</h2>
        <div className="qm-showcase-heading-actions">
          <button
            type="button"
            className="qm-view-all"
            onClick={() => onSelect(section.category)}
          >
            View All
          </button>
          <button
            type="button"
            className="qm-round-arrow"
            aria-label={`Previous ${section.title}`}
            onClick={() => scroll(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="qm-round-arrow next"
            aria-label={`Next ${section.title}`}
            onClick={() => scroll(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="qm-showcase-scroller" ref={trackRef}>
        <div
          className={`qm-showcase-track ${section.layout === "six" ? "six" : "four"}`}
        >
          {section.tiles.map((tile) => (
            <CategoryTile
              key={tile.title}
              tile={{ ...tile, filterCategory: section.category }}
              products={products}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Home() {
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [backendCategories, setBackendCategories] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const basketRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    getAllProducts()
      .then((response) => {
        const productList = normalizeProducts(response);

        if (!productList) {
          console.error("Unexpected /products/all response shape:", response);
          throw new Error(
            "The product service response was not a product list.",
          );
        }

        if (cancelled) return;

        setProducts(
          productList.filter((product) => product && product.active !== false),
        );
        setError("");
      })
      .catch((requestError) => {
        if (cancelled) return;

        console.error("Failed to load products:", {
          message: requestError.message,
          status: requestError.response?.status,
          response: requestError.response?.data,
          error: requestError,
        });
        setError(
          "Unable to load products. Please check the product service and try again.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    getActiveCategories()
      .then((response) => {
        if (!Array.isArray(response)) {
          throw new Error("The categories endpoint did not return a list.");
        }

        if (cancelled) return;

        const validCategories = response
          .filter((category) => typeof category === "string" && category.trim())
          .map((category) => category.trim());

        setBackendCategories([...new Set(validCategories)]);
      })
      .catch((requestError) => {
        if (!cancelled) {
          console.error("Failed to load product categories:", requestError);
        }
      });

    getFeaturedProducts()
      .then((response) => {
        const productList = normalizeProducts(response);

        if (!productList) {
          throw new Error(
            "The featured endpoint did not return a product list.",
          );
        }

        if (cancelled) return;

        setFeaturedProducts(
          productList.filter(
            (product) =>
              product && product.active !== false && product.featured === true,
          ),
        );
      })
      .catch((requestError) => {
        if (!cancelled) {
          console.error("Failed to load featured products:", requestError);
        }
      })
      .finally(() => {
        if (!cancelled) setFeaturedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  const categories = useMemo(() => {
    const productCategories = products
      .map((product) => product.category)
      .filter((category) => typeof category === "string" && category.trim())
      .map((category) => category.trim());

    return [
      ...new Set(
        backendCategories.length > 0 ? backendCategories : productCategories,
      ),
    ];
  }, [backendCategories, products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name?.toLowerCase().includes(normalizedSearch) ||
        product.brand?.toLowerCase().includes(normalizedSearch) ||
        product.category?.toLowerCase().includes(normalizedSearch);

      return matchesSearch && productMatchesCategory(product, selectedCategory);
    });
  }, [products, searchText, selectedCategory]);

  const hasActiveFilters = Boolean(selectedCategory || searchText.trim());

  const defaultFeaturedProducts = useMemo(() => {
    // If the featured endpoint fails, fall back only to products explicitly marked featured.
    const source =
      featuredProducts.length > 0
        ? featuredProducts
        : products.filter((product) => product.featured === true);

    return source.filter((product) => product && product.active !== false);
  }, [featuredProducts, products]);

  const visibleProducts = hasActiveFilters
    ? filteredProducts
    : showAllProducts
      ? products
      : defaultFeaturedProducts;

  const handleCategoryClick = (category) => {
    setShowAllProducts(false);
    setSelectedCategory(category);
    if (category) {
      document
        .getElementById("smart-basket")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSearchText("");
    setShowAllProducts(false);
  };

  const scrollBasket = (direction) => {
    basketRef.current?.scrollBy({
      left: direction * Math.max(basketRef.current.clientWidth * 0.8, 280),
      behavior: "smooth",
    });
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

      <main className="quickmart-main qm-home-main">
        <section
          className="qm-promo-shortcuts"
          aria-label="QuickMart promotions"
        >
          {PROMO_SHORTCUTS.map((promo) => (
            <button
              type="button"
              key={promo.title}
              className={`qm-promo-shortcut ${promo.tone}`}
              onClick={() =>
                promo.category
                  ? handleCategoryClick(promo.category)
                  : document
                      .getElementById("top-offers")
                      ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <span className="qm-promo-icon" aria-hidden="true">
                {promo.icon}
              </span>
              <span className="qm-promo-text">
                <strong>{promo.title}</strong>
                <small>{promo.subtitle}</small>
              </span>
              <ArrowRight size={17} className="qm-promo-arrow" />
            </button>
          ))}
        </section>

        <section
          className="qm-home-hero"
          aria-label="Fresh groceries promotion"
        >
          <div className="qm-home-hero-content">
            <p className="qm-home-hero-eyebrow">QUICKMART</p>
            <h1>
              Fresh groceries
              <br />
              at your doorstep
            </h1>
            <p className="qm-home-hero-description">
              Quality products, great prices and fast delivery.
            </p>
            <a
              href="#smart-basket"
              className="qm-home-shop-button"
              onClick={() => {
                setSelectedCategory("");
                setSearchText("");
                setShowAllProducts(false);
              }}
            >
              Shop Now <ChevronRight size={18} />
            </a>
          </div>
          <div className="qm-home-hero-art" aria-hidden="true">
            {!heroImageFailed && (
              <img
                src={HERO_IMAGE}
                alt=""
                onError={() => setHeroImageFailed(true)}
              />
            )}
          </div>
          <span className="qm-home-hero-leaf leaf-one" aria-hidden="true">
            ✦
          </span>
          <span className="qm-home-hero-leaf leaf-two" aria-hidden="true">
            ✦
          </span>
        </section>

        <section
          id="smart-basket"
          className="products-section qm-smart-basket-section"
        >
          <div className="products-heading qm-smart-basket-heading">
            <div>
              <p className="section-eyebrow">FRESH & QUALITY</p>
              <h2>{showAllProducts ? "All Products" : "Products for You"}</h2>
              <p className="qm-section-caption">
                Your everyday favourites, delivered fresh.
              </p>
            </div>
            <div className="products-heading-actions qm-basket-actions">
              <button
                type="button"
                className="view-all-button"
                onClick={() => {
                  setSelectedCategory("");
                  setSearchText("");
                  setShowAllProducts((current) => !current);
                }}
              >
                {showAllProducts ? "Featured Picks" : "View All"}
              </button>
              <button
                type="button"
                className="carousel-button"
                aria-label="Previous products"
                onClick={() => scrollBasket(-1)}
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                className="carousel-button"
                aria-label="Next products"
                onClick={() => scrollBasket(1)}
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>

          {selectedCategory && (
            <div className="active-filter">
              Showing <strong>{selectedCategory}</strong>
              <button type="button" onClick={() => setSelectedCategory("")}>
                Clear
              </button>
            </div>
          )}

          <div className="qm-smart-basket-panel">
            {loading ||
            (!hasActiveFilters && !showAllProducts && featuredLoading) ? (
              <div className="catalogue-message qm-catalogue-message">
                <span className="qm-loading-dot" aria-hidden="true" />
                <p>Loading fresh products...</p>
              </div>
            ) : error ? (
              <div className="catalogue-message error qm-catalogue-message">
                <p>{error}</p>
                <button
                  type="button"
                  className="qm-retry-button"
                  onClick={() => {
                    setLoading(true);
                    setFeaturedLoading(true);
                    setError("");
                    setLoadAttempt((attempt) => attempt + 1);
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : visibleProducts.length > 0 ? (
              <div className="qm-smart-basket-scroller" ref={basketRef}>
                <ProductGrid products={visibleProducts} />
              </div>
            ) : (
              <div className="catalogue-message qm-catalogue-message">
                <h3>No products found</h3>
                <p>Try another search or category.</p>
                <button
                  type="button"
                  className="qm-retry-button"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </section>

        <section id="top-offers" className="qm-top-offers-section">
          <div className="qm-simple-section-heading">
            <div>
              <p className="section-eyebrow">GOOD THINGS, GREAT PRICES</p>
              <h2>Top Offers</h2>
            </div>
          </div>
          <div className="qm-top-offers-grid">
            {TOP_OFFERS.map((offer) => (
              <button
                type="button"
                key={offer.title}
                className={`qm-top-offer-card ${offer.tone}`}
                onClick={() => handleCategoryClick("")}
              >
                <span className="qm-offer-eyebrow">
                  <Tag size={14} /> {offer.eyebrow}
                </span>
                <strong>
                  {offer.title.split("\n").map((line, index) => (
                    <span key={`${line}-${index}`}>{line}</span>
                  ))}
                </strong>
                <span className="qm-offer-caption">
                  {offer.caption} <ArrowRight size={15} />
                </span>
              </button>
            ))}
          </div>
        </section>

        {CATEGORY_SHOWCASES.map((section) => (
          <CategoryShowcase
            key={section.title}
            section={section}
            products={products}
            onSelect={handleCategoryClick}
          />
        ))}
      </main>

      <footer className="quickmart-footer qm-home-footer">
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
