
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, Link, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { Product, CartItem, Order, CustomerInfo, AdminCredentials } from './types';
import ProductCard from './components/ProductCard';

// Constants
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const PK_CURRENCY = '₨';
const SHIPPING_COST = 250;

const initialProducts: Product[] = [
  { id: '1', name: 'Classic Leather Wallet', price: 2500, image: 'https://picsum.photos/seed/product1/400/300', description: 'A high-quality classic leather wallet with multiple compartments.' },
  { id: '2', name: 'Modern Smartwatch DX', price: 15000, image: 'https://picsum.photos/seed/product2/400/300', description: 'Stay connected with this sleek and feature-rich smartwatch.' },
  { id: '3', name: 'Wireless Bluetooth Headphones', price: 7000, image: 'https://picsum.photos/seed/product3/400/300', description: 'Immersive sound quality with long-lasting battery life.' },
  { id: '4', name: 'Ergonomic Office Chair', price: 22000, image: 'https://picsum.photos/seed/product4/400/300', description: 'Comfortable and supportive chair for long working hours.' },
  { id: '5', name: 'Portable Coffee Maker', price: 4500, image: 'https://picsum.photos/seed/product5/400/300', description: 'Enjoy fresh coffee anywhere with this portable maker.' },
  { id: '6', name: 'Yoga Mat Premium', price: 3000, image: 'https://picsum.photos/seed/product6/400/300', description: 'Non-slip and eco-friendly yoga mat for your practice.' },
];

// Helper for localStorage
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };
  return [storedValue, setValue];
};


// Contexts
interface AppContextType {
  // Auth
  isAdmin: boolean;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  editProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  getProductById: (productId: string) => Product | undefined;
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartItemCount: number;
  // Orders
  orders: Order[];
  placeOrder: (customerInfo: CustomerInfo, cartItems: CartItem[]) => Promise<string | null>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  totalSalesAmount: number; // New: Total sales
  // Shipping
  shippingCost: number;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useLocalStorage<boolean>('isAdmin', false);
  const [products, setProducts] = useLocalStorage<Product[]>('products', initialProducts);
  const [cart, setCart] = useLocalStorage<CartItem[]>('cart', []);
  const [orders, setOrders] = useLocalStorage<Order[]>('orders', []);

  // Auth logic
  const login = (email: string, pass: string): boolean => {
    if (email === ADMIN_EMAIL && pass === ADMIN_PASSWORD) {
      setIsAdmin(true);
      return true;
    }
    return false;
  };
  const logout = () => setIsAdmin(false);

  // Product logic (made async for consistency, though not strictly necessary for localStorage)
  const addProduct = async (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...productData, id: Date.now().toString() };
    setProducts(prev => [...prev, newProduct]);
  };
  const editProduct = async (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };
  const deleteProduct = async (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };
  const getProductById = (productId: string) => products.find(p => p.id === productId);

  // Cart logic
  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prevCart, { ...product, quantity }];
    });
  };
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };
  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(prevCart =>
        prevCart.map(item => (item.id === productId ? { ...item, quantity } : item))
      );
    }
  };
  const clearCart = () => setCart([]);
  const cartSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Order logic (async to simulate database interaction)
  const placeOrder = async (customerInfo: CustomerInfo, cartItems: CartItem[]): Promise<string | null> => {
    if (cartItems.length === 0) return null;
    const itemsSubtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    const totalAmountWithShipping = itemsSubtotal + SHIPPING_COST;
    const newOrder: Order = {
      id: Date.now().toString(),
      customerInfo,
      items: cartItems,
      totalAmount: totalAmountWithShipping,
      paymentMethod: 'Cash on Delivery',
      timestamp: Date.now(),
      status: 'Pending',
    };
    setOrders(prevOrders => [...prevOrders, newOrder]);
    clearCart(); // This should remain synchronous or handled carefully with async flow
    return newOrder.id;
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? {...o, status} : o));
  };

  // Calculate total sales amount
  const totalSalesAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  useEffect(() => {
    const storedProducts = window.localStorage.getItem('products');
    if (!storedProducts || JSON.parse(storedProducts).length === 0) {
       // Ensure initialProducts are distinct from the state setter function for `products`
      setProducts([...initialProducts]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed setProducts from dependencies to avoid re-triggering on products change


  return (
    <AppContext.Provider value={{
      isAdmin, login, logout,
      products, addProduct, editProduct, deleteProduct, getProductById,
      cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartSubtotal, cartItemCount,
      orders, placeOrder, updateOrderStatus, totalSalesAmount,
      shippingCost: SHIPPING_COST
    }}>
      {children}
    </AppContext.Provider>
  );
};

// UI Components

const Navbar: React.FC = () => {
  const { cartItemCount, isAdmin, logout } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-primary-600 hover:text-primary-700">
          UrbanMir
        </Link>
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-gray-700 hover:text-primary-600">Home</Link>
          <Link to="/cart" className="relative text-gray-700 hover:text-primary-600" aria-label="View shopping cart">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center" aria-hidden="true">{cartItemCount}</span>
            )}
          </Link>
          {isAdmin ? (
            <>
              <Link to="/admin" className="text-gray-700 hover:text-primary-600">Admin</Link>
              <button onClick={handleLogout} className="text-gray-700 hover:text-primary-600">Logout</button>
            </>
          ) : (
            <Link to="/login" className="text-gray-700 hover:text-primary-600">Admin Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const Footer: React.FC = () => (
  <footer className="bg-gray-800 text-white text-center p-6 mt-auto">
    <p>&copy; {new Date().getFullYear()} UrbanMir. All rights reserved.</p>
  </footer>
);

// Page Components

const HomePage: React.FC = () => {
  const { products, addToCart } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800">Welcome to UrbanMir</h1>
        <p className="text-gray-600 mt-2">Discover unique finds and curated collections.</p>
      </div>
      <div className="mb-6">
        <label htmlFor="search-products" className="sr-only">Search products</label>
        <input
          type="search"
          id="search-products"
          placeholder="Search products..."
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
          ))}
        </div>
      ) : (
         <p className="text-center text-gray-500 text-xl py-10">No products found matching your search "{searchTerm}".</p>
      )}
    </div>
  );
};

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { getProductById, addToCart } = useAppContext();
  const [quantity, setQuantity] = useState(1);
  const product = productId ? getProductById(productId) : undefined;

  if (!product) return <div className="container mx-auto px-6 py-8 text-center text-red-500">Product not found.</div>;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden md:flex">
        <img 
          src={product.image || `https://picsum.photos/seed/${product.id}/600/400`} 
          alt={product.name} 
          className="w-full md:w-1/2 h-auto object-cover max-h-[500px]"
          onError={(e) => (e.currentTarget.src = 'https://picsum.photos/600/400?grayscale')}
        />
        <div className="p-6 md:p-8 md:w-1/2">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">{product.name}</h1>
          <p className="text-primary-600 font-bold text-2xl mb-4">{PK_CURRENCY} {product.price.toLocaleString()}</p>
          <p className="text-gray-600 mb-6 leading-relaxed">{product.description}</p>
          <div className="flex items-center mb-6">
            <label htmlFor="quantity" className="mr-3 text-gray-700 font-medium">Quantity:</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 p-2 border border-gray-300 rounded-md text-center focus:ring-primary-500 focus:border-primary-500"
              aria-label="Product quantity"
            />
          </div>
          <button
            onClick={() => addToCart(product, quantity)}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-md font-semibold text-lg transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

const CartPage: React.FC = () => {
  const { cart, removeFromCart, updateCartQuantity, cartSubtotal } = useAppContext();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8 text-center">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Your Cart is Empty</h2>
        <p className="text-gray-600 mb-6">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/" className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-md font-semibold transition-colors">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h2 className="text-3xl font-semibold mb-6 text-gray-800">Your Shopping Cart</h2>
      <div className="bg-white shadow-md rounded-lg p-6">
        {cart.map(item => (
          <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between py-4 border-b last:border-b-0">
            <div className="flex items-center mb-4 sm:mb-0 flex-grow">
              <img 
                src={item.image || `https://picsum.photos/seed/${item.id}/100/100`} 
                alt={item.name} 
                className="w-20 h-20 object-cover rounded-md mr-4"
                onError={(e) => (e.currentTarget.src = 'https://picsum.photos/100/100?grayscale')}
              />
              <div>
                <h3 className="font-semibold text-gray-700">{item.name}</h3>
                <p className="text-sm text-gray-500">{PK_CURRENCY} {item.price.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 mt-2 sm:mt-0">
              <label htmlFor={`quantity-${item.id}`} className="sr-only">Quantity for {item.name}</label>
              <input
                type="number"
                id={`quantity-${item.id}`}
                name={`quantity-${item.id}`}
                min="1"
                value={item.quantity}
                onChange={(e) => updateCartQuantity(item.id, parseInt(e.target.value))}
                className="w-16 p-1 border border-gray-300 rounded-md text-center focus:ring-primary-500 focus:border-primary-500"
                aria-label={`Quantity for ${item.name}`}
              />
              <p className="font-semibold w-24 text-right text-gray-700">{PK_CURRENCY} {(item.price * item.quantity).toLocaleString()}</p>
              <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 p-1" aria-label={`Remove ${item.name} from cart`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        ))}
        <div className="mt-6 text-right">
          <p className="text-xl font-semibold text-gray-800">Subtotal: {PK_CURRENCY} {cartSubtotal.toLocaleString()}</p>
          <button 
            onClick={() => navigate('/checkout')}
            className="mt-4 bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-md font-semibold transition-colors"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

const CheckoutPage: React.FC = () => {
  const { cart, cartSubtotal, placeOrder, shippingCost } = useAppContext();
  const navigate = useNavigate();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: '', phone: '', address: '' });
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAmountWithShipping = cartSubtotal + shippingCost;

  useEffect(() => {
    if (cart.length === 0 && !isSubmitting) { // Don't redirect if submitting
      navigate('/cart');
    }
  }, [cart, navigate, isSubmitting]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); 
    setIsSubmitting(true);

    if (!customerInfo.name.trim() || !customerInfo.phone.trim() || !customerInfo.address.trim()) {
      setError('All fields (Name, Phone, Address) are required.');
      setIsSubmitting(false);
      return;
    }
    if (!/^\d{10,15}$/.test(customerInfo.phone.replace(/\s+/g, ''))) {
        setError('Please enter a valid phone number (10-15 digits).');
        setIsSubmitting(false);
        return;
    }

    try {
      const orderId = await placeOrder(customerInfo, cart); // Now async
      if(orderId) {
        navigate(`/order-success/${orderId}`);
      } else {
        setError('Failed to place order. Your cart might be empty or an unknown error occurred.');
      }
    } catch (err) {
      console.error("Order placement error:", err);
      setError('An unexpected error occurred while placing your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <h2 className="text-3xl font-semibold mb-6 text-gray-800">Checkout</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="md:col-span-2 bg-white shadow-md rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Shipping Information</h3>
          {error && <p role="alert" className="text-red-600 mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-sm">{error}</p>}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" name="name" id="name" value={customerInfo.name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" required aria-required="true" />
          </div>
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="tel" name="phone" id="phone" value={customerInfo.phone} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" required aria-required="true" placeholder="e.g., 03001234567" />
          </div>
          <div className="mb-4">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea name="address" id="address" value={customerInfo.address} onChange={handleChange} rows={3} className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" required aria-required="true" />
          </div>
          <h3 className="text-xl font-semibold mt-6 mb-4 text-gray-700">Payment Method</h3>
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <p className="font-semibold text-gray-700">Cash on Delivery</p>
            <p className="text-sm text-gray-500">Pay with cash upon delivery.</p>
          </div>
          <button type="submit" disabled={isSubmitting} className="mt-6 w-full bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-md font-semibold transition-colors disabled:bg-gray-400">
            {isSubmitting ? 'Placing Order...' : `Place Order (${PK_CURRENCY} ${totalAmountWithShipping.toLocaleString()})`}
          </button>
        </form>
        <div className="md:col-span-1 bg-white shadow-md rounded-lg p-6 h-fit">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Order Summary</h3>
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-b-0 text-sm">
              <span className="text-gray-600">{item.name} (x{item.quantity})</span>
              <span className="text-gray-800 font-medium">{PK_CURRENCY} {(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="mt-4 pt-4 border-t">
            <p className="flex justify-between text-sm text-gray-600">
              <span>Subtotal:</span>
              <span>{PK_CURRENCY} {cartSubtotal.toLocaleString()}</span>
            </p>
            <p className="flex justify-between text-sm text-gray-600 mt-1">
              <span>Shipping:</span>
              <span>{PK_CURRENCY} {shippingCost.toLocaleString()}</span>
            </p>
            <p className="flex justify-between text-lg font-semibold text-gray-800 mt-2">
              <span>Total:</span>
              <span>{PK_CURRENCY} {totalAmountWithShipping.toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  return (
    <div className="container mx-auto px-6 py-16 text-center">
      <svg className="w-24 h-24 text-green-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Order Placed Successfully!</h2>
      <p className="text-gray-600 mb-2">Thank you for your purchase at UrbanMir.</p>
      {orderId && <p className="text-gray-600 mb-6">Your Order ID is: <span className="font-semibold text-primary-600">{orderId}</span></p>}
      <Link to="/" className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-md font-semibold transition-colors">
        Continue Shopping
      </Link>
    </div>
  );
};

const LoginPage: React.FC = () => {
  const { login, isAdmin } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const location = useLocation();
  const from = location.state?.from?.pathname || "/admin";


  useEffect(() => {
    if (isAdmin) {
      navigate(from, { replace: true });
    }
  }, [isAdmin, navigate, from]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (login(email, password)) {
       navigate(from, { replace: true });
    } else {
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-150px)] flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Admin Login</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <p role="alert" className="text-red-500 text-sm text-center bg-red-100 p-2 rounded">{error}</p>}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input id="email-address" name="email" type="email" autoComplete="email" required 
                     className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm" 
                     placeholder="Email address (admin@example.com)" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required 
                     className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm" 
                     placeholder="Password (password123)" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <div>
            <button type="submit" 
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Admin Section Components
type AdminSection = 'dashboard' | 'orders' | 'products' | 'addProduct' | 'editProduct';

const AdminPage: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const { orders, products, addProduct, editProduct, deleteProduct, updateOrderStatus, totalSalesAmount } = useAppContext(); 
  
  const AdminProductForm: React.FC<{ product?: Product, onSave: (p: Product | Omit<Product, 'id'>) => void, onCancel: () => void }> = ({ product, onSave, onCancel }) => {
    const [name, setName] = useState(product?.name || '');
    const [price, setPrice] = useState(product?.price === undefined ? '' : String(product.price));
    const [image, setImage] = useState(product?.image || ''); // Will store base64 data URL or existing URL
    const [description, setDescription] = useState(product?.description || '');
    const [formError, setFormError] = useState('');

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // If no file is selected (e.g., user cancels), retain existing image if editing, or clear if adding new
        if (!product?.image) { 
          setImage(''); 
        }
      }
    };

    const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError('');
      const numericPrice = parseFloat(price);
      if (!name.trim() || isNaN(numericPrice) || numericPrice <= 0 || !description.trim()) {
        setFormError('Name, valid Price (must be > 0), and Description are required.');
        return;
      }
      // Ensure image is an empty string if not set, rather than null/undefined
      const productData = { name, price: numericPrice, image: image || '', description };
      try {
        await onSave(product ? { ...productData, id: product.id } : productData);
      } catch (err) {
         console.error("Error saving product:", err);
         setFormError("Failed to save product. Please try again.");
      }
    };

    return (
      <form onSubmit={handleSave} className="space-y-4 p-6 bg-white rounded-lg shadow">
        <h3 className="text-xl font-semibold">{product ? 'Edit Product' : 'Add New Product'}</h3>
        {formError && <p role="alert" className="text-red-500 text-sm p-2 bg-red-100 rounded-md">{formError}</p>}
        <div>
          <label htmlFor="admin-prod-name" className="block text-sm font-medium text-gray-700">Name</label>
          <input type="text" id="admin-prod-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" required/>
        </div>
        <div>
          <label htmlFor="admin-prod-price" className="block text-sm font-medium text-gray-700">Price ({PK_CURRENCY})</label>
          <input type="number" id="admin-prod-price" value={price} onChange={e => setPrice(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" required min="0.01" step="0.01"/>
        </div>
        <div>
          <label htmlFor="admin-prod-image" className="block text-sm font-medium text-gray-700">Product Image (Optional)</label>
          <input 
            type="file" 
            id="admin-prod-image" 
            accept="image/*" 
            onChange={handleImageChange} 
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
          {image && (
            <div className="mt-2">
              <p className="block text-sm font-medium text-gray-700">Image Preview:</p>
              <img 
                src={image} 
                alt="Preview" 
                className="mt-1 max-h-48 w-auto rounded border border-gray-300 object-contain" 
                onError={(e) => {
                    // Attempt to show placeholder if preview fails (e.g. corrupted base64, though unlikely from FileReader)
                    e.currentTarget.src = 'https://picsum.photos/200/150?grayscale&blur=2';
                    e.currentTarget.alt = 'Preview unavailable';
                }}
              />
            </div>
          )}
        </div>
        <div>
          <label htmlFor="admin-prod-desc" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea id="admin-prod-desc" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" required/>
        </div>
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700">{product ? 'Save Changes' : 'Add Product'}</button>
        </div>
      </form>
    );
  };


  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Admin Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-700">Total Products</h3>
                <p className="text-4xl font-bold text-primary-600 mt-2">{products.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
                <p className="text-4xl font-bold text-primary-600 mt-2">{orders.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-semibold text-gray-700">Total Sales</h3>
                <p className="text-4xl font-bold text-primary-600 mt-2">{PK_CURRENCY} {totalSalesAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        );
      case 'orders':
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Manage Orders</h2>
            {orders.length === 0 ? <p className="text-gray-600">No orders yet.</p> : (
              <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.sort((a,b) => b.timestamp - a.timestamp).map(order => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.customerInfo.name}<br/>
                          <span className="text-xs text-gray-500">{order.customerInfo.phone}</span><br/>
                          <span className="text-xs text-gray-500 truncate block max-w-xs" title={order.customerInfo.address}>{order.customerInfo.address}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{PK_CURRENCY} {order.totalAmount.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.timestamp).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <label htmlFor={`status-${order.id}`} className="sr-only">Order Status for {order.id}</label>
                          <select 
                            id={`status-${order.id}`}
                            value={order.status} 
                            onChange={async (e) => {
                              try {
                                await updateOrderStatus(order.id, e.target.value as Order['status'])
                              } catch (err) {
                                console.error("Failed to update order status", err);
                                // Optionally show an error to the admin
                              }
                            }}
                            className="p-1.5 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={order.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}>
                           {order.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'products':
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Manage Products</h2>
              <button onClick={() => { setEditingProductId(null); setCurrentSection('addProduct');}} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium">Add New Product</button>
            </div>
            {products.length === 0 ? <p className="text-gray-600">No products yet. Add some to get started!</p> : (
               <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map(product => (
                      <tr key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <img 
                            src={product.image || `https://picsum.photos/seed/${product.id}/50/50`} 
                            alt={product.name} 
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => (e.currentTarget.src = 'https://picsum.photos/50/50?grayscale')}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{PK_CURRENCY} {product.price.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button onClick={() => {setEditingProductId(product.id); setCurrentSection('editProduct');}} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                          <button onClick={async () => { if(window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
                              try {
                                await deleteProduct(product.id);
                              } catch (err) {
                                  console.error("Failed to delete product", err)
                                  // Show error to admin
                              }
                          }}} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'addProduct':
        return <AdminProductForm 
                  onSave={async (p) => { await addProduct(p as Omit<Product, 'id'>); setCurrentSection('products');}} 
                  onCancel={() => setCurrentSection('products')} 
                />;
      case 'editProduct':
        const productToEdit = products.find(p => p.id === editingProductId);
        return productToEdit ? 
                <AdminProductForm 
                  product={productToEdit} 
                  onSave={async (p) => { await editProduct(p as Product); setCurrentSection('products');}} 
                  onCancel={() => setCurrentSection('products')}
                /> : <p className="text-red-500">Error: Product not found for editing. Please go back to Products list.</p>;
      default:
        return <p>Welcome to the Admin Panel.</p>;
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="lg:flex lg:space-x-8">
        <aside className="lg:w-1/4 mb-8 lg:mb-0">
          <div className="bg-white p-4 rounded-lg shadow sticky top-24"> {/* Sticky sidebar */}
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Admin Navigation</h3>
            <nav aria-label="Admin sections">
              <ul className="space-y-1">
                <li><button onClick={() => setCurrentSection('dashboard')} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentSection === 'dashboard' ? 'bg-primary-500 text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'}`}>Dashboard</button></li>
                <li><button onClick={() => setCurrentSection('orders')} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentSection === 'orders' ? 'bg-primary-500 text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'}`}>Orders</button></li>
                <li><button onClick={() => setCurrentSection('products')} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentSection.includes('Product') || currentSection === 'products' ? 'bg-primary-500 text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'}`}>Products</button></li>
              </ul>
            </nav>
          </div>
        </aside>
        <main className="lg:w-3/4">
          {renderSection()}
        </main>
      </div>
    </div>
  );
};


const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAdmin } = useAppContext();
  const location = useLocation();

  if (!isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};


// Main App Component
const App: React.FC = () => {
  return (
    <AppProvider>
      <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/product/:productId" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/admin/*" // Changed to handle nested state if needed, or just /admin
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} /> {/* Catch-all for 404 */}
          </Routes>
        </main>
        <Footer />
      </div>
    </AppProvider>
  );
};

export default App;
