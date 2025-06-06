
export interface User {
  id: string; // Typically a Firestore document ID or Firebase Auth UID
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt?: Date; // Optional: for tracking new users
}

// Ensure all mock users have names
export const mockUsers: User[] = [
  {
    id: 'user-admin-001',
    email: 'odhiambostallone73@gmail.com',
    name: 'Stallone Odhiambo', // Added name
    role: 'admin',
    createdAt: new Date('2023-10-01T10:00:00Z')
  },
  {
    id: 'user-regular-002',
    email: 'musigahstallone@gmail.com',
    name: 'Musigah Stallone', // Added name
    role: 'user',
    createdAt: new Date('2023-10-15T11:30:00Z')
  },
  {
    id: 'user-regular-003',
    email: 'jane.doe@example.com',
    name: 'Jane Doe', // Existing name
    role: 'user',
    createdAt: new Date() 
  },
  {
    id: 'user-regular-004',
    email: 'john.smith@example.com',
    name: 'John Smith', // Existing name
    role: 'user',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) 
  },
];
