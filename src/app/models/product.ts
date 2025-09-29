export interface Product {
  id: number;
  name: string;
  price: number;
  images: string[];
  category: string;
  subCategory: string;
  quantity: number;
  warranty: number;
  createdAt: string; 
  averageRating: number;
  ratingCount: number;
}
