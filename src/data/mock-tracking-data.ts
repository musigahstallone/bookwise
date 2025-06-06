
// src/data/mock-tracking-data.ts
import type { Book } from '@/data/books'; // Assuming books is already in mock-books.ts or similar
import { books as allMockBooks } from '@/data/books'; // Get actual book data

// --- Mock User Cart Data ---
export interface MockCartItem {
  bookId: string;
  title: string;
  author: string;
  price: number;
  coverImageUrl: string;
  quantity: 1; // Always 1 for PDFs
}

export interface MockUserCartSeed {
  userEmail: string; // We'll use email to find the user's UID
  items: MockCartItem[];
}

const sampleBook1 = allMockBooks.find(b => b.id === '1'); // The Midnight Library
const sampleBook2 = allMockBooks.find(b => b.id === '2'); // Project Hail Mary
const sampleBook5 = allMockBooks.find(b => b.id === '5'); // Atomic Habits

export const mockUserCartSeedData: MockUserCartSeed[] = [
  {
    userEmail: 'musigahstallone@gmail.com', // Example user
    items: sampleBook1 ? [
      {
        bookId: sampleBook1.id,
        title: sampleBook1.title,
        author: sampleBook1.author,
        price: sampleBook1.price,
        coverImageUrl: sampleBook1.coverImageUrl,
        quantity: 1,
      },
    ] : [],
  },
  {
    userEmail: 'odhiambostallone73@gmail.com', // Admin user with a couple of items
    items: [
      ...(sampleBook2 ? [{
        bookId: sampleBook2.id,
        title: sampleBook2.title,
        author: sampleBook2.author,
        price: sampleBook2.price,
        coverImageUrl: sampleBook2.coverImageUrl,
        quantity: 1,
      }] : []),
      ...(sampleBook5 ? [{
        bookId: sampleBook5.id,
        title: sampleBook5.title,
        author: sampleBook5.author,
        price: sampleBook5.price,
        coverImageUrl: sampleBook5.coverImageUrl,
        quantity: 1,
      }] : []),
    ].filter(item => item !== undefined) as MockCartItem[],
  },
];


// --- Mock Book Download Data ---
export interface MockBookDownloadSeed {
  userEmail: string;
  bookId: string;
  downloadedAt: Date;
}

export const mockBookDownloadSeedData: MockBookDownloadSeed[] = [
  { userEmail: 'musigahstallone@gmail.com', bookId: '1', downloadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }, // 2 days ago
  { userEmail: 'odhiambostallone73@gmail.com', bookId: '2', downloadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }, // 1 day ago
  { userEmail: 'odhiambostallone73@gmail.com', bookId: '5', downloadedAt: new Date() },
];

// --- Mock Order Data ---
// Re-using MockCartItem for order items for simplicity
export interface MockOrderSeed {
  userEmail: string;
  items: MockCartItem[]; // Simplified, could be just bookIds or full book objects
  totalAmountUSD: number;
  orderDate: Date;
  regionCode: string; // e.g., 'US', 'FR'
  currencyCode: string; // e.g., 'USD', 'EUR'
  itemCount: number;
}

export const mockOrderSeedData: MockOrderSeed[] = [
  {
    userEmail: 'musigahstallone@gmail.com',
    items: sampleBook1 ? [
      { bookId: sampleBook1.id, title: sampleBook1.title, author: sampleBook1.author, price: sampleBook1.price, coverImageUrl: sampleBook1.coverImageUrl, quantity: 1 }
    ] : [],
    totalAmountUSD: sampleBook1 ? sampleBook1.price : 0,
    orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    regionCode: 'US',
    currencyCode: 'USD',
    itemCount: sampleBook1 ? 1 : 0,
  },
  {
    userEmail: 'odhiambostallone73@gmail.com',
    items: [
        ...(sampleBook2 ? [{ bookId: sampleBook2.id, title: sampleBook2.title, author: sampleBook2.author, price: sampleBook2.price, coverImageUrl: sampleBook2.coverImageUrl, quantity: 1 }] : []),
        ...(sampleBook5 ? [{ bookId: sampleBook5.id, title: sampleBook5.title, author: sampleBook5.author, price: sampleBook5.price, coverImageUrl: sampleBook5.coverImageUrl, quantity: 1 }] : []),
    ].filter(item => item !== undefined) as MockCartItem[],
    totalAmountUSD: (sampleBook2 ? sampleBook2.price : 0) + (sampleBook5 ? sampleBook5.price : 0),
    orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    regionCode: 'KE',
    currencyCode: 'KES',
    itemCount: (sampleBook2 ? 1 : 0) + (sampleBook5 ? 1 : 0),
  },
];
