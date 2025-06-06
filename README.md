
# BookWise - Your Smart Online Bookstore (Firebase Integrated)

BookWise is a modern, digital-first online bookstore built with Next.js, React, and Tailwind CSS. It leverages AI for book recommendations and aims to provide a seamless shopping experience for book lovers. This project integrates Firebase Firestore for book data management and Firebase Storage for PDF file hosting.

## ✨ Features

*   **Next.js App Router**: For optimized routing and Server Components.
*   **React & TypeScript**: For a robust and type-safe frontend.
*   **ShadCN UI & Tailwind CSS**: For a beautiful, responsive, and customizable user interface.
*   **Genkit**: For integrating AI-powered book recommendations.
*   **Firebase Firestore**: For persistent storage and management of book metadata.
*   **Firebase Storage**: For hosting book PDF files uploaded via the admin panel.
*   **Landing Page**: Engaging introduction to BookWise.
*   **Shop Page**: Browse and filter books from Firestore, with pagination.
*   **AI Book Advisor**: Get personalized book suggestions based on Firestore data.
*   **Shopping Cart**: Add books and proceed to a mock checkout with an order summary page.
*   **Author Pages**: View books by a specific author, fetched from Firestore.
*   **Static Pages**: About, Contact, Privacy Policy, Terms & Conditions.
*   **Admin Dashboard**:
    *   Manage books (CRUD operations) interacting directly with Firebase Firestore.
    *   Upload PDF files for books directly to Firebase Storage (URL stored in Firestore).
    *   Seed database: Populate Firestore with initial book data from `src/data/books.ts`.
    *   View basic site statistics (total books from Firestore).
    *   Pagination for book lists.
    *   Mobile-responsive design.
*   **Mobile-Friendly Design**: Responsive layout for all devices, including the admin panel.
*   **Server Actions**: Used for mutations (add, update, delete, seed) to ensure data integrity and server-side logic.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   A Firebase Project:
    *   Set up Firebase Firestore (Native mode).
    *   Set up Firebase Storage.
    *   Obtain your Firebase project configuration credentials.

### Installation

1.  **Clone the repository (if applicable):**
    ```bash
    # git clone <repository-url>
    # cd <repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root directory by copying `.env` or creating it manually. Add your Firebase project configuration:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID" # Crucial for Firestore/Storage
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_FIREBASE_MEASUREMENT_ID" # Optional

    # If using Genkit with Google AI, also include:
    # GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY_HERE"
    ```
    **Important**: `NEXT_PUBLIC_FIREBASE_PROJECT_ID` is essential for Firebase services to work.

4.  **Configure Firebase Security Rules (for development/prototyping):**
    In your Firebase Console:

    *   **Firestore > Rules**: For easy development, you can use permissive rules. **IMPORTANT: These rules are NOT secure for production.**
        ```
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              // Allow read and write access to all paths for development
              // THIS IS NOT SECURE FOR PRODUCTION
              allow read, write: if true;
            }
          }
        }
        ```

    *   **Storage > Rules**: Similarly, for PDF uploads.
        ```
        rules_version = '2';
        service firebase.storage {
          match /b/{bucket}/o {
            match /{allPaths=**} {
              // Allow read and write access to all paths for development
              // THIS IS NOT SECURE FOR PRODUCTION
              allow read, write: if true;
            }
          }
        }
        ```
    For production, you would implement stricter rules, typically allowing writes only for authenticated admin users and appropriate read access for users.

### Running the Development Server

1.  **Start the Next.js development server:**
    This will typically run the application on `http://localhost:9002` (as per `package.json`).
    ```bash
    npm run dev
    ```

2.  **Start the Genkit development server (in a separate terminal, if using AI features):**
    This is required for the AI features to work. It usually runs on `http://localhost:3400`.
    ```bash
    npm run genkit:dev
    ```
    Or, for watching changes in AI flows:
    ```bash
    npm run genkit:watch
    ```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the application.
The admin panel is accessible at [http://localhost:9002/admin](http://localhost:9002/admin).

### Seeding the Database

Once Firebase is configured and your app is running:
1.  Navigate to the Admin Dashboard (`/admin`).
2.  Click the "Seed Database with Mock Data" button. This will populate your Firestore 'books' collection with the initial data from `src/data/books.ts`.

## 📝 Important Notes

*   **Authentication**: The admin panel (`/admin`) is currently publicly accessible. In a production environment, this would need to be secured with authentication (e.g., Firebase Authentication).
*   **Firebase Costs**: Be mindful of Firebase usage, especially with Firestore reads/writes and Storage, as usage beyond the free tier may incur costs.
*   **Error Handling**: Basic error handling is in place. More robust error management might be needed for production.

## 🛠️ Scripts

*   `npm run dev`: Starts the Next.js development server with Turbopack.
*   `npm run genkit:dev`: Starts the Genkit development server.
*   `npm run genkit:watch`: Starts the Genkit development server with file watching.
*   `npm run build`: Builds the application for production.
*   `npm run start`: Starts the production server.
*   `npm run lint`: Lints the codebase.
*   `npm run typecheck`: Runs TypeScript type checking.

## 📁 Project Structure (Key Firebase-related files)

*   `src/lib/firebase.ts`: Firebase app initialization (Auth, Firestore, Storage).
*   `src/lib/book-service-firebase.ts`: Core functions for interacting with Firestore 'books' collection.
*   `src/lib/actions/bookActions.ts`: Server Actions for book CRUD operations and seeding.
*   `src/app/admin/`: Admin panel routes, now interacting with Firestore.
*   `src/data/books.ts`: Contains the initial mock book data used for seeding.

## 🤝 Contributing

Contributions are welcome! Please follow the existing code style and ensure all tests pass. (Further contribution guidelines can be added here).

---

This project was bootstrapped using Firebase Studio.
