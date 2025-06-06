
export interface User {
  id: string; // Firebase Auth UID will be used here
  email: string;
  name: string;
  role: 'admin' | 'user'; // Simplified roles
  createdAt?: Date; 
}

// This mockUsers array is NO LONGER USED for authentication or direct seeding via button.
// It can serve as a reference or for initial manual Firestore setup if desired.
// User creation now happens via the signup page, and roles are 'user' by default.
// To make a user an admin, you'd manually edit their 'role' field in their Firestore document
// (found under the 'users' collection, with the document ID being their Firebase Auth UID) to 'admin'.

export const mockUsers: User[] = [
  {
    id: 'mock-admin-uid-placeholder', // Replace with actual UID after signup if manually creating
    email: 'odhiambostallone73@gmail.com', // This email can be used to sign up
    name: 'Stallone Odhiambo (Admin)',
    role: 'admin', // Manually set this in Firestore for the admin user
    createdAt: new Date('2023-10-01T10:00:00Z')
  },
  {
    id: 'mock-user-uid-placeholder', // Replace with actual UID after signup
    email: 'musigahstallone@gmail.com', // This email can be used to sign up
    name: 'Musigah Stallone (User)',
    role: 'user',
    createdAt: new Date('2023-10-15T11:30:00Z')
  },
  {
    id: 'mock-jane-uid-placeholder',
    email: 'jane.doe@example.com',
    name: 'Jane Doe',
    role: 'user',
    createdAt: new Date() 
  },
];
