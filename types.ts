
export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
}

export interface Order {
  id: string;
  customerInfo: CustomerInfo;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: 'Cash on Delivery';
  timestamp: number;
  status: 'Pending' | 'Shipped' | 'Delivered';
}

export interface AdminCredentials {
  email: string;
}
