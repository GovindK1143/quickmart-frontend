const GUEST_CART_KEY = "quickmart_guest_cart";

export const getGuestCartItems = () => {
  const cart = localStorage.getItem(GUEST_CART_KEY);

  if (!cart) {
    return [];
  }

  try {
    const parsedCart = JSON.parse(cart);

    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch {
    return [];
  }
};

const saveGuestCartItems = (items) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

export const clearGuestCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
};

export const addGuestCartItem = (product) => {
  const items = getGuestCartItems();

  const existingItem = items.find((item) => item.productId === product.id);

  if (existingItem) {
    if (existingItem.quantity >= product.stock) {
      throw new Error(`Only ${product.stock} items are available.`);
    }

    existingItem.quantity += 1;
    existingItem.subtotal = existingItem.quantity * existingItem.sellingPrice;
  } else {
    items.push({
      itemId: null,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      category: product.category,
      imageUrl: product.imageUrl,
      unit: product.unit,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      quantity: 1,
      subtotal: product.sellingPrice,
    });
  }

  saveGuestCartItems(items);

  return items;
};

export const updateGuestCartItem = (productId, quantity) => {
  const items = getGuestCartItems();

  const updatedItems = items.map((item) => {
    if (item.productId !== productId) {
      return item;
    }

    return {
      ...item,
      quantity,
      subtotal: quantity * item.sellingPrice,
    };
  });

  saveGuestCartItems(updatedItems);

  return updatedItems;
};

export const removeGuestCartItem = (productId) => {
  const items = getGuestCartItems();

  const updatedItems = items.filter((item) => item.productId !== productId);

  saveGuestCartItems(updatedItems);

  return updatedItems;
};

export const buildGuestCart = (items = getGuestCartItems()) => ({
  cartId: null,
  userId: null,
  items,
  totalItems: items.reduce((total, item) => total + item.quantity, 0),
  totalAmount: items.reduce((total, item) => total + item.subtotal, 0),
});
