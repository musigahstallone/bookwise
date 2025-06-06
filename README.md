
# BookWise - Your Smart Online Bookstore

BookWise is a modern, digital-first online bookstore built with Next.js, React, and Tailwind CSS. It leverages AI for book recommendations and aims to provide a seamless shopping experience for book lovers. This project also includes an Admin Dashboard for managing books, including PDF uploads to Firebase Storage.

## ✨ Features

*   **Next.js App Router**: For optimized routing and server components.
*   **React & TypeScript**: For a robust and type-safe frontend.
*   **ShadCN UI & Tailwind CSS**: For a beautiful, responsive, and customizable user interface.
*   **Genkit**: For integrating AI-powered book recommendations.
*   **Firebase Storage**: For hosting book PDF files uploaded via the admin panel.
*   **Landing Page**: Engaging introduction to BookWise.
*   **Shop Page**: Browse and filter books with pagination.
*   **AI Book Advisor**: Get personalized book suggestions.
*   **Shopping Cart**: Add books and proceed to a mock checkout with an order summary page.
*   **Author Pages**: View books by a specific author.
*   **Static Pages**: About, Contact, Privacy Policy, Terms & Conditions.
*   **Admin Dashboard**:
    *   Manage books (CRUD operations).
    *   Upload PDF files for books directly to Firebase Storage.
    *   View basic site statistics (total books).
    *   Pagination for book lists.
    *   Mobile-responsive design.
*   **Mobile-Friendly Design**: Responsive layout for all devices, including the admin panel.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   A Firebase Project:
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
    Create a `.env.local` file in the root directory by copying `.env` (if it exists as a template) or creating it manually. Add your Firebase project configuration:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_FIREBASE_MEASUREMENT_ID" # Optional

    # If using Genkit with Google AI, also include:
    # GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY_HERE"
    ```

4.  **Configure Firebase Storage Rules (for development/prototyping):**
    In your Firebase Console, navigate to Storage > Rules. For easy development and testing of PDF uploads, you can use permissive rules. **IMPORTANT: These rules are NOT secure for production.**
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
    For production, you would implement stricter rules, typically allowing writes only for authenticated admin users.

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

## 📝 Important Notes for Admin Panel

*   **Data Persistence**: Book metadata modifications (add, edit, delete names, descriptions, etc.) made in the admin panel are currently for the **current session only** and are stored in-memory. They will not persist across server restarts or application rebuilds. PDF files uploaded will persist in Firebase Storage. For full persistence of book metadata, integration with a database like Firebase Firestore is required.
*   **No Authentication**: The admin panel (`/admin`) is currently publicly accessible. In a production environment, this would need to be secured with authentication.

## 🛠️ Scripts

*   `npm run dev`: Starts the Next.js development server with Turbopack.
*   `npm run genkit:dev`: Starts the Genkit development server.
*   `npm run genkit:watch`: Starts the Genkit development server with file watching.
*   `npm run build`: Builds the application for production.
*   `npm run start`: Starts the production server.
*   `npm run lint`: Lints the codebase.
*   `npm run typecheck`: Runs TypeScript type checking.

## 📁 Project Structure

*   `src/app/`: Main application routes (App Router).
    *   `src/app/admin/`: Admin panel routes.
*   `src/components/`: Reusable UI components.
    *   `src/components/ui/`: ShadCN UI components.
    *   `src/components/layout/`: Header, Footer, etc.
    *   `src/components/books/`: Book-specific components (BookCard, etc.).
    *   `src/components/ai/`: AI-related client components.
    *   `src/components/admin/`: Admin panel specific components.
*   `src/ai/`: Genkit related files.
    *   `src/ai/flows/`: Genkit flow definitions.
*   `src/contexts/`: React context providers (e.g., CartContext).
*   `src/data/`: Static data (e.g., initial book catalog).
*   `src/hooks/`: Custom React hooks.
*   `src/lib/`: Utility functions, Firebase config, book service.
*   `public/`: Static assets (e.g., placeholder PDFs).

## 🤝 Contributing

Contributions are welcome! Please follow the existing code style and ensure all tests pass. (Further contribution guidelines can be added here).

---

This project was bootstrapped using Firebase Studio.
