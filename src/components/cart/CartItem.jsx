function CartItem({ item, onUpdate, onRemove, disabled }) {
  const decreaseQuantity = () => {
    if (item.quantity > 1) {
      onUpdate(item.productId, item.quantity - 1);
    }
  };

  const increaseQuantity = () => {
    onUpdate(item.productId, item.quantity + 1);
  };

  return (
    <article className="cart-item">
      <div className="cart-item-image">
        <img src={item.imageUrl} alt={item.productName} />
      </div>

      <div className="cart-item-details">
        <p className="cart-item-brand">{item.brand}</p>

        <h3>{item.productName}</h3>

        <p className="cart-item-unit">{item.unit}</p>

        <div className="cart-item-price">₹{item.sellingPrice}</div>
      </div>

      <div className="cart-item-actions">
        <div className="quantity-label">Quantity</div>

        <div className="quantity-control">
          <button
            type="button"
            onClick={decreaseQuantity}
            disabled={disabled || item.quantity <= 1}
          >
            −
          </button>

          <span>{item.quantity}</span>

          <button type="button" onClick={increaseQuantity} disabled={disabled}>
            +
          </button>
        </div>

        <strong className="cart-item-subtotal">₹{item.subtotal}</strong>

        <button
          type="button"
          className="remove-cart-item"
          onClick={() => onRemove(item.productId)}
          disabled={disabled}
        >
          Remove
        </button>
      </div>
    </article>
  );
}

export default CartItem;
