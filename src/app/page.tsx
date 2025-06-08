
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BookCard from '@/components/books/BookCard';
import type { Book } from '@/data/books';
import { getAllBooksFromDb } from '@/lib/book-service-firebase'; // Updated
import { Library, Zap, CreditCard, BrainCircuit, Facebook, Instagram, Twitter as XIcon, ExternalLink, AlertTriangle } from 'lucide-react';

export default async function LandingPage() {
  let previewBooks: Book[] = [];
  let fetchError: string | null = null;
  const firebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (firebaseConfigured) {
    try {
      const allBooks = await getAllBooksFromDb();
      previewBooks = allBooks.slice(0, 4); // Get first 4 for preview
    } catch (error) {
      console.error("Error fetching books for landing page:", error);
      fetchError = error instanceof Error ? error.message : "An unknown error occurred while fetching books.";
    }
  }


  const features = [
    {
      icon: <Library className="h-10 w-10 text-primary mb-4" />,
      title: 'Curated Book Selection',
      text: 'Only top-rated and meaningful books, handpicked for you.',
    },
    {
      icon: <Zap className="h-10 w-10 text-primary mb-4" />,
      title: 'Instant PDF Access',
      text: 'Get your books immediately after purchase, ready to read.',
    },
    {
      icon: <CreditCard className="h-10 w-10 text-primary mb-4" />,
      title: 'Secure Payments',
      text: 'Shop with confidence using our secure payment gateways.',
    },
    {
      icon: <BrainCircuit className="h-10 w-10 text-primary mb-4" />,
      title: 'AI Recommendations',
      text: 'Find your next favorite book in seconds with our smart advisor.',
    },
  ];

  const testimonials = [
    {
      quote: 'Found my dream book in under 2 minutes! The AI advisor is amazing.',
      name: 'Anne M.',
      avatarUrl: 'https://placehold.co/80x80.png',
      avatarFallback: 'AM',
      dataAiHint: 'portrait person',
    },
    {
      quote: 'The instant PDF download is a game-changer. So convenient!',
      name: 'James K.',
      avatarUrl: 'https://placehold.co/80x80.png',
      avatarFallback: 'JK',
      dataAiHint: 'person profile',
    },
    {
      quote: 'BookWise has a fantastic collection. I always find something new and exciting.',
      name: 'Sarah L.',
      avatarUrl: 'https://placehold.co/80x80.png',
      avatarFallback: 'SL',
      dataAiHint: 'user avatar',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        {/* 1. Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-6xl font-headline font-bold text-primary mb-6">
              Discover, Buy & Read Smarter with BookWise
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Your one-stop shop for handpicked books with instant download access.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/shop">Browse Books</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/recommendations">Try AI Book Advisor</Link>
              </Button>
            </div>
            <div className="mt-16 aspect-video max-w-4xl mx-auto rounded-lg overflow-hidden shadow-2xl">
              <Image
                src="https://placehold.co/1200x675.png"
                alt="Hero image collage of books and reading devices"
                width={1200}
                height={675}
                className="object-cover w-full h-full"
                priority
                data-ai-hint="books reading collage"
              />
            </div>
          </div>
        </section>

        {/* 2. Features Section */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-headline font-semibold text-center mb-12 text-foreground">
              Why BookWise?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center p-6 bg-background rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  {feature.icon}
                  <h3 className="text-xl font-headline font-semibold mb-2 text-primary">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. AI Book Advisor Preview */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <BrainCircuit className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-headline font-semibold text-primary mb-4">
              Not Sure What to Read? Let AI Help You.
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Tell us your interests, and our intelligent advisor will suggest the perfect book tailored to your taste.
            </p>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/recommendations">Get Recommendations</Link>
            </Button>
          </div>
        </section>

        {/* 4. Book Catalog Preview */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-headline font-semibold text-center mb-12 text-foreground">
              Explore Our Latest Arrivals
            </h2>
            {!firebaseConfigured && (
              <div className="text-center p-4 mb-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
                <p className="font-bold flex items-center justify-center"><AlertTriangle className="mr-2 h-5 w-5" /> Firebase Not Configured</p>
                <p>Book previews cannot be loaded. Please check your <code>.env.local</code> settings.</p>
              </div>
            )}
            {firebaseConfigured && fetchError && (
              <div className="text-center p-4 mb-6 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground rounded-md">
                <p className="font-bold flex items-center justify-center"><AlertTriangle className="mr-2 h-5 w-5" /> Error Loading Books</p>
                <p>{fetchError}</p>
              </div>
            )}
            {firebaseConfigured && !fetchError && previewBooks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {previewBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            )}
            {firebaseConfigured && !fetchError && previewBooks.length === 0 && (
              <p className="text-center text-muted-foreground">No books to display currently. Try seeding the database in the admin panel.</p>
            )}
            <div className="text-center mt-12">
              <Button asChild size="lg" variant="outline">
                <Link href="/shop">See Full Catalog <ExternalLink className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 5. Customer Testimonials */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-headline font-semibold text-center mb-12 text-primary">
              Loved by Readers Like You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 rounded-[24px]">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground italic mb-4">"{testimonial.quote}"</p>
                    <div className="flex items-center">
                      <Avatar className="h-12 w-12 mr-4">
                        <AvatarImage src={testimonial.avatarUrl} alt={testimonial.name} data-ai-hint={testimonial.dataAiHint} />
                        <AvatarFallback>{testimonial.avatarFallback}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{testimonial.name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Call-to-Action (Mid-Page) */}
        <section className="py-20 bg-primary text-primary-foreground rounded-[24px]">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-headline font-bold mb-6">
              Buy a Book. Download in Seconds. Read for a Lifetime.
            </h2>
            <Button asChild size="lg" variant="secondary" className="bg-accent hover:bg-accent/80 text-accent-foreground">
              <Link href="/shop">Start Shopping Now</Link>
            </Button>
          </div>
        </section>

        {/* 7. About BookWise */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-headline font-semibold text-primary mb-4">
              About BookWise
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We’re a digital-first bookstore passionate about connecting readers with compelling stories and knowledge. BookWise leverages AI to help you discover, shop, and read faster with instant PDF downloads, making your next literary adventure just a click away.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
