
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, Link, useNavigate, useParams, Navigate, useLocation } from 'react-router-dom';
import { Product, CartItem, Order, CustomerInfo, AdminCredentials } from './types';
import ProductCard from './components/ProductCard';

// Constants
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const PK_CURRENCY = '₨';

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
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
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
  addProduct: (product: Omit<Product, 'id'>) => void;
  editProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  getProductById: (productId: string) => Product | undefined;
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemCount: number;
  // Orders
  orders: Order[];
  placeOrder: (customerInfo: CustomerInfo, cartItems: CartItem[]) => string | null;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
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

  // Product logic
  const addProduct = (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...productData, id: Date.now().toString() };
    setProducts(prev => [...prev, newProduct]);
  };
  const editProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };
  const deleteProduct = (productId: string) => {
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
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Order logic
  const placeOrder = (customerInfo: CustomerInfo, cartItems: CartItem[]): string | null => {
    if (cartItems.length === 0) return null;
    const newOrder: Order = {
      id: Date.now().toString(),
      customerInfo,
      items: cartItems,
      totalAmount: cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
      paymentMethod: 'Cash on Delivery',
      timestamp: Date.now(),
      status: 'Pending',
    };
    setOrders(prevOrders => [...prevOrders, newOrder]);
    clearCart();
    return newOrder.id;
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? {...o, status} : o));
  };

  // Ensure initial products are set if localStorage is empty
  useEffect(() => {
    const storedProducts = window.localStorage.getItem('products');
    if (!storedProducts || JSON.parse(storedProducts).length === 0) {
      setProducts(initialProducts);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <AppContext.Provider value={{
      isAdmin, login, logout,
      products, addProduct, editProduct, deleteProduct, getProductById,
      cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, cartItemCount,
      orders, placeOrder, updateOrderStatus
    }}>
      {children}
    </AppContext.Provider>
  );
};

// UI Components (defined within App.tsx for simplicity)

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
          ShopSwiftly
        </Link>
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-gray-700 hover:text-primary-600">Home</Link>
          <Link to="/cart" className="relative text-gray-700 hover:text-primary-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{cartItemCount}</span>
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
    <p>&copy; {new Date().getFullYear()} ShopSwiftly. All rights reserved.</p>
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
        <h1 className="text-4xl font-bold text-gray-800">Welcome to Our Store</h1>
        <p className="text-gray-600 mt-2">Find the best products at unbeatable prices.</p>
      </div>
      <div className="mb-6">
        <input
          type="text"
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
         <p className="text-center text-gray-500 text-xl py-10">No products found matching your search.</p>
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
            <label htmlFor="quantity" className="mr-3 text-gray-700">Quantity:</label>
            <input
              type="number"
              id="quantity"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 p-2 border border-gray-300 rounded-md text-center"
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
  const { cart, removeFromCart, updateCartQuantity, cartTotal } = useAppContext();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Your Cart is Empty</h2>
        <Link to="/" className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-md">
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
            <div className="flex items-center mb-4 sm:mb-0">
              <img src={item.image || `https://picsum.photos/seed/${item.id}/100/100`} alt={item.name} className="w-20 h-20 object-cover rounded-md mr-4"/>
              <div>
                <h3 className="font-semibold text-gray-700">{item.name}</h3>
                <p className="text-sm text-gray-500">{PK_CURRENCY} {item.price.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateCartQuantity(item.id, parseInt(e.target.value))}
                className="w-16 p-1 border border-gray-300 rounded-md text-center"
              />
              <p className="font-semibold w-24 text-right">{PK_CURRENCY} {(item.price * item.quantity).toLocaleString()}</p>
              <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        ))}
        <div className="mt-6 text-right">
          <p className="text-xl font-semibold text-gray-800">Total: {PK_CURRENCY} {cartTotal.toLocaleString()}</p>
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
  const { cart, cartTotal, placeOrder } = useAppContext();
  const navigate = useNavigate();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: '', phone: '', address: '' });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (cart.length === 0) {
      navigate('/cart');
    }
  }, [cart, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCustomerInfo({ ...customerInfo, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      setError('All fields are required.');
      return;
    }
    setError('');
    const orderId = placeOrder(customerInfo, cart);
    if(orderId) {
      navigate(`/order-success/${orderId}`);
    } else {
      setError('Failed to place order. Cart might be empty.');
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <h2 className="text-3xl font-semibold mb-6 text-gray-800">Checkout</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="md:col-span-2 bg-white shadow-md rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Shipping Information</h3>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" name="name" id="name" value={customerInfo.name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md" required />
          </div>
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="tel" name="phone" id="phone" value={customerInfo.phone} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md" required />
          </div>
          <div className="mb-4">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea name="address" id="address" value={customerInfo.address} onChange={handleChange} rows={3} className="w-full p-2 border border-gray-300 rounded-md" required />
          </div>
          <h3 className="text-xl font-semibold mt-6 mb-4 text-gray-700">Payment Method</h3>
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <p className="font-semibold text-gray-700">Cash on Delivery</p>
            <p className="text-sm text-gray-500">Pay with cash upon delivery.</p>
          </div>
          <button type="submit" className="mt-6 w-full bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-md font-semibold transition-colors">
            Place Order
          </button>
        </form>
        <div className="md:col-span-1 bg-white shadow-md rounded-lg p-6 h-fit">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Order Summary</h3>
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-b-0 text-sm">
              <span className="text-gray-600">{item.name} (x{item.quantity})</span>
              <span className="text-gray-800">{PK_CURRENCY} {(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="mt-4 pt-4 border-t">
            <p className="flex justify-between text-lg font-semibold text-gray-800">
              <span>Total:</span>
              <span>{PK_CURRENCY} {cartTotal.toLocaleString()}</span>
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
      <p className="text-gray-600 mb-2">Thank you for your purchase.</p>
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

  useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (login(email, password)) {
      navigate('/admin');
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
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input id="email-address" name="email" type="email" autoComplete="email" required 
                     className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm" 
                     placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required 
                     className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm" 
                     placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
  const { orders, products, addProduct, editProduct, deleteProduct, updateOrderStatus } = useAppContext();
  
  const AdminProductForm: React.FC<{ product?: Product, onSave: (p: Product | Omit<Product, 'id'>) => void, onCancel: () => void }> = ({ product, onSave, onCancel }) => {
    const [name, setName] = useState(product?.name || '');
    const [price, setPrice] = useState(product?.price || 0);
    const [image, setImage] = useState(product?.image || '');
    const [description, setDescription] = useState(product?.description || '');
    const [formError, setFormError] = useState('');

    const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      setFormError('');
      if (!name || price <= 0 || !description) {
        setFormError('Name, Price (must be > 0), and Description are required.');
        return;
      }
      const productData = { name, price: Number(price), image, description };
      onSave(product ? { ...productData, id: product.id } : productData);
    };

    return (
      <form onSubmit={handleSave} className="space-y-4 p-6 bg-white rounded-lg shadow">
        <h3 className="text-xl font-semibold">{product ? 'Edit Product' : 'Add New Product'}</h3>
        {formError && <p className="text-red-500 text-sm">{formError}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" required/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Price ({PK_CURRENCY})</label>
          <input type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" required min="0.01" step="0.01"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Image URL (Optional)</label>
          <input type="text" value={image} onChange={e => setImage(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="https://example.com/image.jpg"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" required/>
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
            <h2 className="text-2xl font-semibold mb-4">Admin Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-gray-700">Total Products</h3>
                <p className="text-3xl font-bold text-primary-600 mt-2">{products.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-gray-700">Total Orders</h3>
                <p className="text-3xl font-bold text-primary-600 mt-2">{orders.length}</p>
              </div>
            </div>
          </div>
        );
      case 'orders':
        return (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Manage Orders</h2>
            {orders.length === 0 ? <p>No orders yet.</p> : (
              <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.sort((a,b) => b.timestamp - a.timestamp).map(order => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.customerInfo.name}<br/>
                          <span className="text-xs text-gray-500">{order.customerInfo.phone}</span><br/>
                          <span className="text-xs text-gray-500">{order.customerInfo.address}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{PK_CURRENCY} {order.totalAmount.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.timestamp).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select 
                            value={order.status} 
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                            className="p-1 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
              <button onClick={() => { setEditingProductId(null); setCurrentSection('addProduct');}} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md text-sm">Add New Product</button>
            </div>
            {products.length === 0 ? <p>No products yet.</p> : (
               <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map(product => (
                      <tr key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap"><img src={product.image || `https://picsum.photos/seed/${product.id}/50/50`} alt={product.name} className="w-12 h-12 object-cover rounded"/></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{PK_CURRENCY} {product.price.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button onClick={() => {setEditingProductId(product.id); setCurrentSection('editProduct');}} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                          <button onClick={() => { if(window.confirm('Are you sure?')) deleteProduct(product.id);}} className="text-red-600 hover:text-red-900">Delete</button>
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
                  onSave={(p) => { addProduct(p as Omit<Product, 'id'>); setCurrentSection('products');}} 
                  onCancel={() => setCurrentSection('products')} 
                />;
      case 'editProduct':
        const productToEdit = products.find(p => p.id === editingProductId);
        return productToEdit ? 
                <AdminProductForm 
                  product={productToEdit} 
                  onSave={(p) => { editProduct(p as Product); setCurrentSection('products');}} 
                  onCancel={() => setCurrentSection('products')}
                /> : <p>Product not found for editing.</p>;
      default:
        return <p>Welcome to the Admin Panel.</p>;
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="lg:flex lg:space-x-8">
        <aside className="lg:w-1/4 mb-8 lg:mb-0">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-3">Navigation</h3>
            <ul className="space-y-2">
              <li><button onClick={() => setCurrentSection('dashboard')} className={`w-full text-left px-3 py-2 rounded ${currentSection === 'dashboard' ? 'bg-primary-500 text-white' : 'hover:bg-gray-100'}`}>Dashboard</button></li>
              <li><button onClick={() => setCurrentSection('orders')} className={`w-full text-left px-3 py-2 rounded ${currentSection === 'orders' ? 'bg-primary-500 text-white' : 'hover:bg-gray-100'}`}>Orders</button></li>
              <li><button onClick={() => setCurrentSection('products')} className={`w-full text-left px-3 py-2 rounded ${currentSection.includes('Product') ? 'bg-primary-500 text-white' : 'hover:bg-gray-100'}`}>Products</button></li>
            </ul>
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
      <div className="flex flex-col min-h-screen">
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
              path="/admin/*" // Use /* for nested admin views if using React Router's own nesting
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </AppProvider>
  );
};

export default App;

