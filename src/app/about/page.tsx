
import { Info } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <Info className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-headline font-bold text-primary sm:text-5xl">
          About BookWise
        </h1>
      </div>
      <div className="prose prose-lg mx-auto text-foreground text-base leading-relaxed space-y-6">
        <p>
          Welcome to BookWise, your digital-first bookstore designed for the modern reader. We are passionate about connecting people with compelling stories, insightful knowledge, and the joy of reading, all made accessible through a seamless online experience.
        </p>
        <p>
          Our mission is to curate a diverse collection of handpicked books, ensuring that every title on our platform offers value and enrichment. From timeless classics to contemporary bestsellers, and from in-depth non-fiction to captivating fictional worlds, we strive to have something for every reader.
        </p>
        <p>
          At BookWise, we leverage the power of AI to help you discover your next favorite book. Our intelligent recommendation engine learns your preferences and suggests titles tailored to your unique taste, making the journey of finding a new book exciting and effortless.
        </p>
        <p>
          We believe in the convenience of instant access. That's why all our books are available as PDF downloads immediately after purchase. No waiting for shipping, no clutter – just pure reading enjoyment at your fingertips.
        </p>
        <p>
          Thank you for choosing BookWise. We're excited to be a part of your reading adventures!
        </p>
      </div>
    </div>
  );
}
