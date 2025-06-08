export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  longDescription?: string;
  price: number;
  coverImageUrl: string;
  pdfUrl: string;
  dataAiHint?: string;
  publishedYear: number;
}

export const getBookById = (id: string): Book | undefined => {
  // In a real app with Firebase, this would fetch from Firestore.
  // For the prototype, it uses the mutableBooks from book-service if available, otherwise falls back to the initial books.
  // This line will be effectively overridden by getBookByIdAdmin if called from admin context.
  return books.find((book) => book.id === id);
};

export const getBooksByAuthor = (authorName: string): Book[] => {
  return books.filter(
    (book) => book.author.toLowerCase() === authorName.toLowerCase()
  );
};

// This initial list serves as a seed if no persistent storage is used.
// For a Firebase-backed app, this would typically be fetched from Firestore.
export const books: Book[] = [
  {
    id: "1",
    title: "The Midnight Library",
    author: "Matt Haig",
    category: "Fiction",
    description:
      "A novel about choices, regrets, and the infinite possibilities of life.",
    longDescription:
      "Between life and death there is a library... Would you have done anything different, if you had the chance to undo your regrets?",
    price: 15.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "library fantasy",
    publishedYear: 2020,
  },
  {
    id: "2",
    title: "Project Hail Mary",
    author: "Andy Weir",
    category: "Science Fiction",
    description:
      "An amnesiac astronaut wakes up on a solo mission to save humanity.",
    longDescription:
      "Ryland Grace is the sole survivor... he doesn’t even remember his own name or the nature of his assignment.",
    price: 18.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "space science",
    publishedYear: 2021,
  },
  {
    id: "3",
    title: "Klara and the Sun",
    author: "Kazuo Ishiguro",
    category: "Science Fiction",
    description:
      'A story about an "Artificial Friend" and her observations of human nature.',
    longDescription:
      "Klara, an Artificial Friend... watches carefully the behavior of those who come in and those who pass on the street.",
    price: 16.75,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "robot future",
    publishedYear: 2021,
  },
  {
    id: "4",
    title: "The Vanishing Half",
    author: "Brit Bennett",
    category: "Fiction",
    description:
      "A multi-generational story about twin sisters who live very different lives.",
    longDescription:
      "After running away at sixteen, the twin sisters live in two different worlds — one black, one passing for white.",
    price: 14.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "family drama",
    publishedYear: 2020,
  },
  {
    id: "5",
    title: "Atomic Habits",
    author: "James Clear",
    category: "Self-Help",
    description: "A proven way to build good habits and break bad ones.",
    longDescription:
      "James Clear reveals practical strategies to help you make tiny changes that lead to remarkable results.",
    price: 20.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "selfhelp productivity",
    publishedYear: 2018,
  },
  {
    id: "6",
    title: "Educated",
    author: "Tara Westover",
    category: "Memoir",
    description:
      "A memoir of a girl who, kept out of school, leaves her survivalist family and earns a PhD from Cambridge.",
    longDescription:
      "Tara was 17 the first time she set foot in a classroom. Her story is one of fierce family loyalty and the grief that comes with severing the closest of ties.",
    price: 17.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "memoir education",
    publishedYear: 2018,
  },
  {
    id: "7",
    title: "Where the Crawdads Sing",
    author: "Delia Owens",
    category: "Mystery",
    description:
      "A murder mystery and coming-of-age story set in the marshes of North Carolina.",
    longDescription:
      'Kya Clark, the mysterious "Marsh Girl", is suspected when a handsome local is found dead.',
    price: 14.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "mystery nature",
    publishedYear: 2018,
  },
  {
    id: "8",
    title: "The Alchemist",
    author: "Paulo Coelho",
    category: "Fiction",
    description: "A philosophical book about following your dreams.",
    longDescription:
      "Santiago, a shepherd boy, travels in search of treasure and discovers the treasure within himself.",
    price: 13.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "philosophy destiny",
    publishedYear: 1988,
  },
  {
    id: "9",
    title: "The Four Agreements",
    author: "Don Miguel Ruiz",
    category: "Spirituality",
    description: "A guide to personal freedom based on ancient Toltec wisdom.",
    longDescription:
      "The book reveals the source of self-limiting beliefs that rob us of joy and create needless suffering.",
    price: 11.95,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "spiritual selfhelp",
    publishedYear: 1997,
  },
  {
    id: "10",
    title: "Becoming",
    author: "Michelle Obama",
    category: "Memoir",
    description: "The memoir of the former First Lady of the United States.",
    longDescription:
      "Michelle Obama invites readers into her world, chronicling the experiences that shaped her.",
    price: 19.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "biography inspiration",
    publishedYear: 2018,
  },
  {
    id: "11",
    title: "Sapiens",
    author: "Yuval Noah Harari",
    category: "History",
    description: "A brief history of humankind.",
    longDescription:
      "Harari explores how Homo sapiens came to dominate the world and the consequences of our actions.",
    price: 21.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "history anthropology",
    publishedYear: 2011,
  },
  {
    id: "12",
    title: "The Power of Now",
    author: "Eckhart Tolle",
    category: "Spirituality",
    description: "A spiritual guide to living in the present moment.",
    longDescription:
      "This book teaches how to stop the chatter of the mind and live more peacefully and intentionally.",
    price: 16.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "mindfulness spirituality",
    publishedYear: 1997,
  },
  {
    id: "13",
    title: "Dune",
    author: "Frank Herbert",
    category: "Science Fiction",
    description:
      "A science fiction epic set in a desert planet where spice is everything.",
    longDescription:
      "Paul Atreides must navigate politics, prophecy, and power in a harsh universe.",
    price: 18.25,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "sci-fi epic",
    publishedYear: 1965,
  },
  {
    id: "14",
    title: "1984",
    author: "George Orwell",
    category: "Dystopian",
    description: "A dystopian novel about surveillance and totalitarianism.",
    longDescription:
      "Winston Smith rebels against a regime that controls truth itself.",
    price: 10.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "dystopia politics",
    publishedYear: 1949,
  },
  {
    id: "15",
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    category: "Classic",
    description:
      "A classic tale of justice and racial prejudice in the American South.",
    longDescription:
      "Atticus Finch defends a black man accused of a terrible crime in a deeply divided town.",
    price: 12.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "classic racism law",
    publishedYear: 1960,
  },
  {
    id: "16",
    title: "The Silent Patient",
    author: "Alex Michaelides",
    category: "Thriller",
    description:
      "A psychological thriller about a woman who stops speaking after a murder.",
    longDescription:
      "Alicia Berenson shoots her husband and never speaks again. A psychotherapist is determined to uncover the truth.",
    price: 13.75,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "thriller psychology",
    publishedYear: 2019,
  },
  {
    id: "17",
    title: "Can’t Hurt Me",
    author: "David Goggins",
    category: "Memoir",
    description:
      "The inspiring story of one man’s mental and physical transformation.",
    longDescription:
      "From a broken childhood to Navy SEAL and endurance athlete, Goggins shares his approach to mastering the mind.",
    price: 17.95,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "motivation endurance",
    publishedYear: 2018,
  },
  {
    id: "18",
    title: "Rich Dad Poor Dad",
    author: "Robert T. Kiyosaki",
    category: "Finance",
    description:
      "A financial education book that contrasts two fatherly influences.",
    longDescription:
      "Learn how to make money work for you by understanding assets, liabilities, and financial independence.",
    price: 12.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "finance investment",
    publishedYear: 1997,
  },
  {
    id: "19",
    title: "Think Like a Monk",
    author: "Jay Shetty",
    category: "Spirituality",
    description: "Train your mind for peace and purpose every day.",
    longDescription:
      "Jay Shetty shares monk wisdom on how to overcome negativity, reduce stress, and live a life of service.",
    price: 16.4,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "mindfulness peace",
    publishedYear: 2020,
  },
  {
    id: "20",
    title: "The Subtle Art of Not Giving a F*ck",
    author: "Mark Manson",
    category: "Self-Help",
    description: "A brutally honest self-help guide.",
    longDescription:
      "Manson shows that life’s struggles give it meaning and how embracing our limitations can lead to a better life.",
    price: 14.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "selfhelp attitude",
    publishedYear: 2024,
  },
  // New Diverse Books Start Here
  {
    id: "100",
    title: "Things Fall Apart",
    author: "Chinua Achebe",
    category: "African Literature",
    description:
      "A classic novel depicting pre-colonial life in Nigeria and the arrival of Europeans.",
    longDescription:
      "The story of Okonkwo, a proud and ambitious Igbo man, and his village's struggles with the changes brought by British colonialism and Christian missionaries.",
    price: 12.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "africa classic",
    publishedYear: 1958,
  },
  {
    id: "101",
    title: "Half of a Yellow Sun",
    author: "Chimamanda Ngozi Adichie",
    category: "African Literature",
    description:
      "A powerful story of love, war, and identity set during the Biafran War.",
    longDescription:
      "Through the lives of three characters caught in the turbulence of the Nigerian Civil War, Adichie explores the complexities of colonialism, ethnic conflict, and human resilience.",
    price: 16.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "nigeria war",
    publishedYear: 2006,
  },
  {
    id: "102",
    title: "Romance of the Three Kingdoms",
    author: "Luo Guanzhong",
    category: "Chinese Literature",
    description:
      "A historical novel set in the turbulent years towards the end of the Han dynasty and the Three Kingdoms period in Chinese history.",
    longDescription:
      "One of the Four Great Classical Novels of Chinese literature, it dramatizes the lives of feudal lords and their retainers, who tried to replace the dwindling Han dynasty or restore it.",
    price: 22.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "china epic",
    publishedYear: 1400, // Approximate, original is much older
  },
  {
    id: "103",
    title: "The Art of War",
    author: "Sun Tzu",
    category: "Chinese Philosophy",
    description:
      "An ancient Chinese military treatise dating from the Late Spring and Autumn Period.",
    longDescription:
      "Composed of 13 chapters, each of which is devoted to a different set of skills or art related to warfare and how it applies to military strategy and tactics.",
    price: 10.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "strategy philosophy",
    publishedYear: -500, // BCE
  },
  {
    id: "104",
    title: "The God of Small Things",
    author: "Arundhati Roy",
    category: "Indian Literature",
    description:
      'A story about the childhood experiences of fraternal twins whose lives are destroyed by the "Love Laws" that lay down "who should be loved, and how. And how much."',
    longDescription:
      "Set in Kerala, India, this Booker Prize-winning novel explores family, caste, and forbidden love with lyrical prose and profound insight.",
    price: 15.75,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "india novel",
    publishedYear: 1997,
  },
  {
    id: "105",
    title: "Midnight's Children",
    author: "Salman Rushdie",
    category: "Indian Literature",
    description:
      "A novel about India's transition from British colonialism to independence and the partition of India.",
    longDescription:
      "Saleem Sinai is born at the stroke of midnight on August 15, 1947, the moment of India's independence. His life is inextricably linked to the history of his country.",
    price: 17.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "india history",
    publishedYear: 1981,
  },
  {
    id: "106",
    title: "War and Peace",
    author: "Leo Tolstoy",
    category: "Russian Literature",
    description:
      "An epic novel chronicling the history of the French invasion of Russia and the impact of the Napoleonic era on Tsarist society.",
    longDescription:
      "Through the stories of five aristocratic families, Tolstoy explores themes of war, peace, love, and human existence on a grand scale.",
    price: 25.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "russia classic",
    publishedYear: 1869,
  },
  {
    id: "107",
    title: "Anna Karenina",
    author: "Leo Tolstoy",
    category: "Russian Literature",
    description:
      "A tragic story of a married aristocrat and her affair with the affluent Count Vronsky.",
    longDescription:
      "Tolstoy's masterpiece interweaves the doomed love affair of Anna and Vronsky with the philosophical Levin's search for meaning.",
    price: 19.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "russia tragedy",
    publishedYear: 1877,
  },
  {
    id: "108",
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen, et al.",
    category: "Mathematics",
    description:
      "A comprehensive textbook on a wide range of algorithms in depth.",
    longDescription:
      "Often called CLRS, this book covers a broad range of algorithms in depth, yet makes their design and analysis accessible to all levels of readers.",
    price: 75.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "algorithms computer science",
    publishedYear: 1990, // First edition
  },
  {
    id: "109",
    title: "Gödel, Escher, Bach: An Eternal Golden Braid",
    author: "Douglas Hofstadter",
    category: "Mathematics",
    description:
      "A Pulitzer Prize-winning book that explores fundamental concepts of mathematics, symmetry, and intelligence.",
    longDescription:
      "Hofstadter weaves together the lives and works of logician Kurt Gödel, artist M.C. Escher, and composer Johann Sebastian Bach to explore themes of self-reference and consciousness.",
    price: 24.95,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "logic philosophy",
    publishedYear: 1979,
  },
  {
    id: "110",
    title: "Feynman Lectures on Physics",
    author: "Richard P. Feynman, et al.",
    category: "Physics",
    description:
      "A legendary series of physics lectures by Nobel laureate Richard Feynman.",
    longDescription:
      "These lectures, originally delivered to Caltech undergraduates, cover a wide range of physics topics with Feynman's characteristic insight and wit.",
    price: 90.0, // For a volume or set
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "physics science",
    publishedYear: 1964,
  },
  {
    id: "111",
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    category: "Physics",
    description:
      "A landmark volume in science writing by one of the great minds of our time.",
    longDescription:
      "Hawking explains complex cosmology concepts, such as the Big Bang and black holes, in accessible terms for the general reader.",
    price: 18.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "cosmology space",
    publishedYear: 1988,
  },
  {
    id: "112",
    title: "Nervous Conditions",
    author: "Tsitsi Dangarembga",
    category: "African Literature",
    description:
      "A semi-autobiographical novel focusing on the story of a Shona family in post-colonial Rhodesia during the 1960s.",
    longDescription:
      "The novel explores themes of race, class, gender, and cultural change through the eyes of Tambu, a young girl determined to get an education.",
    price: 14.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "zimbabwe feminism",
    publishedYear: 1988,
  },
  {
    id: "113",
    title: "The Journey to the West",
    author: "Wu Cheng'en",
    category: "Chinese Literature",
    description:
      "An epic Chinese novel about the legendary pilgrimage of the Tang dynasty Buddhist monk Xuanzang.",
    longDescription:
      "Accompanied by three disciples—Sun Wukong (the Monkey King), Zhu Bajie (Pigsy), and Sha Wujing (Sandy)—Xuanzang travels to India to obtain sacred Buddhist texts.",
    price: 23.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "china mythology",
    publishedYear: 1592, // Approximate
  },
  {
    id: "114",
    title: "The Mahabharata",
    author: "Vyasa (Traditionally attributed)",
    category: "Indian Literature",
    description:
      "One of the two major Sanskrit epics of ancient India, narrating the struggle between two groups of cousins in the Kurukshetra War.",
    longDescription:
      "A foundational text of Hinduism, it explores themes of dharma, karma, and moksha through complex characters and philosophical discourses, including the Bhagavad Gita.",
    price: 28.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "india epic philosophy",
    publishedYear: -400, // BCE, estimated completion
  },
  {
    id: "115",
    title: "The Master and Margarita",
    author: "Mikhail Bulgakov",
    category: "Russian Literature",
    description:
      "A satirical novel that intertwines a visit by the Devil to Soviet Moscow with a retelling of the story of Pontius Pilate and Jesus Christ.",
    longDescription:
      "Written in secret during Stalin's regime, this masterpiece is a complex allegory of good, evil, and artistic freedom.",
    price: 17.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "russia satire fantasy",
    publishedYear: 1967, // First published (censored)
  },
  {
    id: "116",
    title: "Calculus: Early Transcendentals",
    author: "James Stewart",
    category: "Mathematics",
    description:
      "A widely used calculus textbook known for its mathematical precision and accuracy, clarity of exposition, and outstanding examples and problem sets.",
    longDescription:
      "Covers single variable and multivariable calculus, offering a comprehensive approach suitable for students in engineering, physics, and mathematics.",
    price: 150.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "calculus textbook",
    publishedYear: 1995, // First edition of this title line
  },
  {
    id: "117",
    title: "Cosmos",
    author: "Carl Sagan",
    category: "Physics",
    description:
      "Based on the acclaimed television series, this book explores the vastness of space, time, and the human quest for knowledge.",
    longDescription:
      "Sagan eloquently explains complex scientific ideas, from ancient astronomy to modern astrophysics, inspiring wonder about the universe and our place in it.",
    price: 20.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "astronomy science",
    publishedYear: 1980,
  },
  {
    id: "118",
    title: "Disgrace",
    author: "J.M. Coetzee",
    category: "African Literature",
    description:
      "A novel set in post-apartheid South Africa, exploring themes of race, power, and redemption.",
    longDescription:
      "After a scandal, a university professor retreats to his daughter's farm, where he confronts the harsh realities of the new South Africa.",
    price: 13.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "south africa literature",
    publishedYear: 1999,
  },
  {
    id: "119",
    title: "Dream of the Red Chamber",
    author: "Cao Xueqin",
    category: "Chinese Literature",
    description:
      "Also known as The Story of the Stone, this is one of China's Four Great Classical Novels.",
    longDescription:
      "An epic of Chinese aristocratic life, it details the rise and fall of a prominent family and the tragic love story at its center.",
    price: 26.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "china classic family",
    publishedYear: 1791, // First printed edition
  },
  {
    id: "120",
    title: "The Bhagavad Gita",
    author: "Vyasa (Traditionally attributed)",
    category: "Indian Philosophy",
    description:
      "A 700-verse Hindu scripture that is part of the epic Mahabharata.",
    longDescription:
      "Set in a narrative framework of a dialogue between Pandava prince Arjuna and his guide and charioteer Krishna, it presents a synthesis of Hindu ideas about dharma, bhakti, and moksha.",
    price: 9.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "hinduism philosophy scripture",
    publishedYear: -200, // BCE, approximate composition period
  },
  {
    id: "121",
    title: "Crime and Punishment",
    author: "Fyodor Dostoevsky",
    category: "Russian Literature",
    description:
      "A psychological novel exploring the moral dilemmas of a destitute student who murders an old pawnbroker.",
    longDescription:
      "Raskolnikov's intellectual justifications for his crime crumble as he faces the psychological torment of his actions and the pursuit of justice.",
    price: 16.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "russia psychology classic",
    publishedYear: 1866,
  },
  {
    id: "122",
    title: "Principia Mathematica",
    author: "Alfred North Whitehead & Bertrand Russell",
    category: "Mathematics",
    description:
      "A three-volume work on the foundations of mathematics, written between 1910 and 1913.",
    longDescription:
      "An attempt to derive all mathematical truths from a well-defined set of axioms and inference rules in symbolic logic.",
    price: 120.0, // For a set
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "logic foundations mathematics",
    publishedYear: 1910,
  },
  {
    id: "123",
    title: "The Elegant Universe",
    author: "Brian Greene",
    category: "Physics",
    description:
      "An exploration of superstring theory and the quest for a unified theory of physics.",
    longDescription:
      "Greene makes complex concepts like string theory, quantum mechanics, and general relativity accessible to a general audience.",
    price: 19.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "string theory cosmology",
    publishedYear: 1999,
  },
  {
    id: "124",
    title: "The House on Mango Street",
    author: "Sandra Cisneros",
    category: "African Literature", // More broadly Chicana Literature, but fits diverse voices
    description:
      "A series of vignettes about a young Latina girl, Esperanza Cordero, growing up in Chicago.",
    longDescription:
      "Esperanza dreams of a better life beyond her impoverished neighborhood, exploring themes of identity, culture, and coming-of-age.",
    price: 11.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "chicana identity youth",
    publishedYear: 1984,
  },
  {
    id: "125",
    title: "To Live",
    author: "Yu Hua",
    category: "Chinese Literature",
    description:
      "A powerful novel that follows the life of Fugui, a man who endures immense hardship and loss through decades of modern Chinese history.",
    longDescription:
      "From the pre-revolutionary era through the Cultural Revolution, Fugui's story is a testament to the resilience of the human spirit in the face of suffering.",
    price: 15.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "china modern history",
    publishedYear: 1993,
  },
  {
    id: "126",
    title: "A Fine Balance",
    author: "Rohinton Mistry",
    category: "Indian Literature",
    description:
      'Set in an unnamed city in India, during "The Emergency" period, this novel follows four characters from diverse backgrounds whose lives intertwine.',
    longDescription:
      "A sweeping and compassionate story of human endurance, friendship, and the struggle for dignity amidst political turmoil and social injustice.",
    price: 18.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "india emergency novel",
    publishedYear: 1995,
  },
  {
    id: "127",
    title: "Dead Souls",
    author: "Nikolai Gogol",
    category: "Russian Literature",
    description:
      'A satirical novel that follows the adventures of Chichikov, a schemer who buys up "dead souls" (deceased serfs) to use as collateral.',
    longDescription:
      "Gogol's unfinished masterpiece offers a biting critique of Russian provincial society, bureaucracy, and human foibles.",
    price: 14.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "russia satire classic",
    publishedYear: 1842,
  },
  {
    id: "128",
    title: "Number Theory",
    author: "George E. Andrews",
    category: "Mathematics",
    description:
      "A classic introduction to number theory, suitable for undergraduate students.",
    longDescription:
      "Covers topics such as divisibility, congruences, prime numbers, and Diophantine equations with clear explanations and numerous examples.",
    price: 45.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "mathematics textbook numbers",
    publishedYear: 1971,
  },
  {
    id: "129",
    title: "Quantum Mechanics: Concepts and Applications",
    author: "Nouredine Zettili",
    category: "Physics",
    description:
      "A comprehensive textbook on quantum mechanics, balancing theoretical concepts with practical applications.",
    longDescription:
      "This book provides a clear and detailed introduction to quantum mechanics, suitable for advanced undergraduate and graduate students.",
    price: 85.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "quantum physics textbook",
    publishedYear: 2001, // First edition
  },
  {
    id: "130",
    title: "Homegoing",
    author: "Yaa Gyasi",
    category: "African Literature",
    description:
      "A novel that traces the descendants of two half-sisters in Ghana: one who marries an Englishman and stays in Africa, and one who is sold into slavery in America.",
    longDescription:
      "Spanning centuries and continents, Homegoing explores the legacy of slavery, colonialism, and the search for identity.",
    price: 17.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "ghana slavery historical",
    publishedYear: 2016,
  },
  {
    id: "131",
    title: "The Three-Body Problem",
    author: "Cixin Liu",
    category: "Chinese Science Fiction",
    description:
      "The first novel in the Remembrance of Earth's Past trilogy, a mind-bending story of humanity's first contact with an alien civilization.",
    longDescription:
      "Set against the backdrop of China's Cultural Revolution, a secret military project sends signals into space and makes contact with a dying alien world.",
    price: 19.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "china scifi aliens",
    publishedYear: 2008, // Chinese original
  },
  {
    id: "132",
    title: "The White Tiger",
    author: "Aravind Adiga",
    category: "Indian Literature",
    description:
      "A dark, humorous novel about Balram Halwai, a village boy who becomes a driver for a wealthy family in Delhi, and his journey to success through corruption and murder.",
    longDescription:
      "This Booker Prize winner offers a satirical look at class struggle, globalization, and the new India.",
    price: 14.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "india satire class",
    publishedYear: 2008,
  },
  {
    id: "133",
    title: "One Day in the Life of Ivan Denisovich",
    author: "Aleksandr Solzhenitsyn",
    category: "Russian Literature",
    description:
      "A stark, powerful novel depicting a single day in a Soviet labor camp (Gulag).",
    longDescription:
      "Based on Solzhenitsyn's own experiences, the book offers a chilling glimpse into the brutality and resilience of life in the Gulag system.",
    price: 11.99,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "russia gulag historical",
    publishedYear: 1962,
  },
  {
    id: "134",
    title: "A History of π (Pi)",
    author: "Petr Beckmann",
    category: "Mathematics",
    description:
      "A fascinating journey through the history of the mathematical constant pi.",
    longDescription:
      "Beckmann traces the evolution of pi from ancient times to the modern era, exploring its mathematical significance and cultural impact.",
    price: 16.95,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "pi history math",
    publishedYear: 1971,
  },
  {
    id: "135",
    title: "Black Holes and Time Warps: Einstein's Outrageous Legacy",
    author: "Kip S. Thorne",
    category: "Physics",
    description:
      "A comprehensive exploration of black holes, wormholes, time travel, and the fabric of spacetime.",
    longDescription:
      "Nobel laureate Kip Thorne provides an in-depth yet accessible account of some of the most mind-bending concepts in modern physics.",
    price: 25.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "black holes relativity",
    publishedYear: 1994,
  },
  {
    id: "136",
    title: "An African Elegy",
    author: "Ben Okri",
    category: "African Poetry",
    description:
      "A collection of poems reflecting on the spiritual and political landscape of Africa.",
    longDescription:
      "Okri's lyrical and mystical poetry explores themes of identity, suffering, hope, and the enduring spirit of the African continent.",
    price: 13.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "africa poetry spiritual",
    publishedYear: 1992,
  },
  {
    id: "137",
    title: "Fortress Besieged",
    author: "Qian Zhongshu",
    category: "Chinese Literature",
    description:
      "A satirical novel about Fang Hongjian, a Chinese student returning from Europe with a bogus degree, and his misadventures in love and career.",
    longDescription:
      "Considered a masterpiece of modern Chinese literature, it humorously critiques Chinese society and intellectual pretensions in the 1930s.",
    price: 18.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "china satire modern",
    publishedYear: 1947,
  },
  {
    id: "138",
    title: "The Palace of Illusions",
    author: "Chitra Banerjee Divakaruni",
    category: "Indian Literature",
    description:
      "A retelling of the Indian epic Mahabharata from the perspective of Panchaali (Draupadi).",
    longDescription:
      "Divakaruni reimagines the epic through the eyes of its most compelling female character, exploring her thoughts, emotions, and struggles in a patriarchal world.",
    price: 16.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "india epic mythology",
    publishedYear: 2008,
  },
  {
    id: "139",
    title: "Doctor Zhivago",
    author: "Boris Pasternak",
    category: "Russian Literature",
    description:
      "An epic novel set against the backdrop of the Russian Revolution and its aftermath, telling the story of a physician and poet.",
    longDescription:
      "Yuri Zhivago's life is torn apart by war, revolution, and his love for two women, in this Nobel Prize-winning (though declined by author) masterpiece.",
    price: 20.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "russia revolution epic",
    publishedYear: 1957,
  },
  {
    id: "140",
    title: "What Is Mathematics, Really?",
    author: "Reuben Hersh",
    category: "Mathematics",
    description:
      "A philosophical exploration of the nature of mathematics, arguing for a humanist perspective.",
    longDescription:
      "Hersh challenges traditional Platonist views, suggesting mathematics is a human activity, a social-cultural-historical phenomenon.",
    price: 22.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "philosophy math nature",
    publishedYear: 1997,
  },
  {
    id: "141",
    title: "The Fabric of the Cosmos",
    author: "Brian Greene",
    category: "Physics",
    description:
      "An exploration of space, time, and the texture of reality, delving into concepts like quantum mechanics, cosmology, and string theory.",
    longDescription:
      "Greene takes readers on a journey through the evolution of our understanding of the universe, from Newton to Einstein and beyond.",
    price: 21.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "spacetime physics cosmology",
    publishedYear: 2004,
  },
  {
    id: "142",
    title: "The Beautyful Ones Are Not Yet Born",
    author: "Ayi Kwei Armah",
    category: "African Literature",
    description:
      "A novel set in post-independence Ghana, focusing on an unnamed man who struggles against the pervasive corruption and disillusionment around him.",
    longDescription:
      "Armah's powerful work critiques the moral decay and unfulfilled promises of a newly independent African nation.",
    price: 14.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "ghana corruption novel",
    publishedYear: 1968,
  },
  {
    id: "143",
    title: "Frog",
    author: "Mo Yan",
    category: "Chinese Literature",
    description:
      "A novel that explores China's controversial one-child policy through the story of a rural midwife.",
    longDescription:
      "Winner of the Nobel Prize in Literature, Mo Yan delves into the personal and societal impacts of decades of strict family planning.",
    price: 19.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "china policy novel",
    publishedYear: 2009, // Chinese original
  },
  {
    id: "144",
    title: "The Glass Palace",
    author: "Amitav Ghosh",
    category: "Indian Literature",
    description:
      "An epic novel spanning a century, tracing the fortunes of an Indian family from colonial Burma to modern times.",
    longDescription:
      "Ghosh weaves a rich tapestry of history, love, and exile, connecting the lives of characters across generations and continents.",
    price: 18.75,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "burma historical saga",
    publishedYear: 2000,
  },
  {
    id: "145",
    title: "Eugene Onegin",
    author: "Alexander Pushkin",
    category: "Russian Literature",
    description:
      "A novel in verse, considered a classic of Russian literature, portraying the bored, cynical aristocrat Eugene Onegin.",
    longDescription:
      "Pushkin's masterpiece explores themes of love, ennui, and societal conventions in 19th-century Russia.",
    price: 15.5,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "russia verse novel classic",
    publishedYear: 1833,
  },
  {
    id: "146",
    title: "How Not to Be Wrong: The Power of Mathematical Thinking",
    author: "Jordan Ellenberg",
    category: "Mathematics",
    description:
      "A book that shows how mathematics underlies everyday life, revealing the hidden beauty and logic of the world.",
    longDescription:
      "Ellenberg uses engaging examples to demonstrate how mathematical thinking can help us make better decisions and understand complex issues.",
    price: 17.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "math popular science logic",
    publishedYear: 2014,
  },
  {
    id: "147",
    title:
      "Six Easy Pieces: Essentials of Physics Explained by Its Most Brilliant Teacher",
    author: "Richard P. Feynman",
    category: "Physics",
    description:
      "A collection of six accessible chapters from Feynman's legendary lectures, introducing fundamental physics concepts.",
    longDescription:
      "Feynman covers topics like atoms, basic physics, the relationship of physics to other sciences, energy, gravitation, and quantum behavior.",
    price: 12.95,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "physics introductory science",
    publishedYear: 1994,
  },
  {
    id: "148",
    title: "The Penguin Book of Modern African Poetry",
    author: "Various Authors (Edited by Gerald Moore & Ulli Beier)",
    category: "African Poetry",
    description:
      "A comprehensive anthology showcasing the diversity and richness of modern African poetry.",
    longDescription:
      "Features works from poets across the continent, reflecting a wide range of themes, styles, and cultural experiences.",
    price: 22.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "africa anthology poetry",
    publishedYear: 1963, // Often updated/reissued
  },
  {
    id: "149",
    title: "The Republic",
    author: "Plato",
    category: "Philosophy", // While Greek, its influence on mathematics and physics is profound
    description:
      "A Socratic dialogue concerning justice, the order and character of the just city-state, and the just man.",
    longDescription:
      "One of the most influential works of philosophy and political theory, it explores concepts of Forms, the philosopher king, and the allegory of the cave.",
    price: 11.0,
    coverImageUrl: "https://placehold.co/300x300.png",
    pdfUrl: "/pdfs/placeholder-book.pdf",
    dataAiHint: "philosophy classic politics",
    publishedYear: -375, // BCE, approximate
  },
];
