
import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden transform transition-all hover:scale-105 duration-300 ease-in-out">
      <Link to={`/product/${product.id}`}>
        <img 
          src={product.image || `https://picsum.photos/seed/${product.id}/400/300`} 
          alt={product.name} 
          className="w-full h-56 object-cover"
          onError={(e) => (e.currentTarget.src = 'https://picsum.photos/400/300?grayscale')}
        />
      </Link>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-1 truncate" title={product.name}>{product.name}</h3>
        <p className="text-primary-600 font-bold text-xl mb-3">₨ {product.price.toLocaleString()}</p>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <Link
            to={`/product/${product.id}`}
            className="w-full sm:w-auto text-center bg-gray-200 text-gray-700 hover:bg-gray-300 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            View
          </Link>
          <button
            onClick={() => onAddToCart(product)}
            className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
