
# BookWise - Your Smart Online Bookstore

BookWise is a modern, digital-first online bookstore built with Next.js, React, and Tailwind CSS. It leverages AI for book recommendations and aims to provide a seamless shopping experience for book lovers.

## ✨ Features

*   **Next.js App Router**: For optimized routing and server components.
*   **React & TypeScript**: For a robust and type-safe frontend.
*   **ShadCN UI & Tailwind CSS**: For a beautiful, responsive, and customizable user interface.
*   **Genkit**: For integrating AI-powered book recommendations.
*   **Landing Page**: Engaging introduction to BookWise.
*   **Shop Page**: Browse and filter books with pagination.
*   **AI Book Advisor**: Get personalized book suggestions.
*   **Shopping Cart**: Add books and proceed to a mock checkout.
*   **Author Pages**: View books by a specific author.
*   **Static Pages**: About, Contact, Privacy Policy, Terms & Conditions.
*   **Mobile-Friendly Design**: Responsive layout for all devices.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn

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
    Create a `.env.local` file in the root directory and add any necessary environment variables (e.g., API keys for Genkit/Google AI).
    Refer to `.env.example` if provided, or the Genkit documentation for specifics.
    Example:
    ```
    GOOGLE_API_KEY=your_google_api_key_here
    ```

### Running the Development Server

1.  **Start the Next.js development server:**
    This will typically run the application on `http://localhost:9002` (as per `package.json`).
    ```bash
    npm run dev
    ```

2.  **Start the Genkit development server (in a separate terminal):**
    This is required for the AI features to work. It usually runs on `http://localhost:3400`.
    ```bash
    npm run genkit:dev
    ```
    Or, for watching changes in AI flows:
    ```bash
    npm run genkit:watch
    ```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the application.

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
*   `src/components/`: Reusable UI components.
    *   `src/components/ui/`: ShadCN UI components.
    *   `src/components/layout/`: Header, Footer, etc.
    *   `src/components/books/`: Book-specific components (BookCard, etc.).
    *   `src/components/ai/`: AI-related client components.
*   `src/ai/`: Genkit related files.
    *   `src/ai/flows/`: Genkit flow definitions.
*   `src/contexts/`: React context providers (e.g., CartContext).
*   `src/data/`: Static data (e.g., book catalog).
*   `src/hooks/`: Custom React hooks.
*   `src/lib/`: Utility functions.
*   `public/`: Static assets.

## 🤝 Contributing

Contributions are welcome! Please follow the existing code style and ensure all tests pass. (Further contribution guidelines can be added here).

---

This project was bootstrapped using Firebase Studio.
