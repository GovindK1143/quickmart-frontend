import { useMemo, useState } from "react";
import { Heart, Zap, Minus, Plus } from "lucide-react";
import { useCart } from "../../context/useCart";

function ProductCard({ product }) {
  const [imageError, setImageError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const { cart, addProduct, updateItem, removeItem } = useCart();

  const cartItem = useMemo(
    () =>
      cart.items.find((item) => Number(item.productId) === Number(product.id)),
    [cart.items, product.id],
  );

  const quantity = cartItem?.quantity || 0;

  const discountPercentage =
    product.mrp > product.sellingPrice
      ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
      : 0;

  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = async () => {
    setError("");

    try {
      setAdding(true);

      await addProduct(product);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to add product.",
      );
    } finally {
      setAdding(false);
    }
  };

  const handleIncrease = async () => {
    setError("");

    try {
      setUpdating(true);

      await addProduct(product);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to update quantity.",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleDecrease = async () => {
    if (!cartItem || quantity <= 0) return;

    setError("");

    try {
      setUpdating(true);

      if (quantity === 1) {
        await removeItem(product.id);
        return;
      }

      await updateItem(product.id, quantity - 1);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to update quantity.",
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <article className="smart-product-card">
      <div className="smart-product-image-wrapper">
        {discountPercentage > 0 && (
          <span className="smart-discount">{discountPercentage}% OFF</span>
        )}

        {!imageError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="smart-product-image"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="smart-product-fallback">
            <span>🥬</span>
            <small>Fresh</small>
          </div>
        )}

        <div className="delivery-badge">
          <Zap size={14} fill="currentColor" />
          10 MINS
        </div>
      </div>

      <div className="smart-product-content">
        <p className="smart-product-brand">{product.brand || "fresh!"}</p>

        <h3 className="smart-product-name">{product.name}</h3>

        <div className="product-unit-selector">
          <span>{product.unit}</span>
          <span>⌄</span>
        </div>

        <div className="smart-price-row">
          <strong>₹{product.sellingPrice}</strong>

          {product.mrp > product.sellingPrice && <span>₹{product.mrp}</span>}
        </div>

        {error && <p className="smart-product-error">{error}</p>}

        <div className="smart-product-actions">
          <button
            type="button"
            className={liked ? "wishlist-button liked" : "wishlist-button"}
            onClick={() => setLiked(!liked)}
            aria-label="Add to wishlist"
          >
            <Heart size={23} fill={liked ? "currentColor" : "none"} />
          </button>

          {quantity === 0 ? (
            <button
              type="button"
              className="smart-add-button"
              disabled={isOutOfStock || adding}
              onClick={handleAddToCart}
            >
              {adding ? "Adding..." : isOutOfStock ? "Out of Stock" : "Add"}
            </button>
          ) : (
            <div className="smart-quantity-control">
              <button
                type="button"
                className="smart-quantity-button"
                onClick={handleDecrease}
                disabled={updating}
                aria-label="Decrease quantity"
              >
                <Minus size={22} />
              </button>

              <span className="smart-quantity-value">{quantity}</span>

              <button
                type="button"
                className="smart-quantity-button"
                onClick={handleIncrease}
                disabled={updating || quantity >= product.stock}
                aria-label="Increase quantity"
              >
                <Plus size={22} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
