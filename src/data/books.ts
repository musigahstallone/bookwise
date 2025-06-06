export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  longDescription?: string;
  price: number;
  coverImageUrl: string;
  pdfUrl: string; // Placeholder for PDF download
  dataAiHint?: string;
}

export const books: Book[] = [
  {
    id: '1',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    description: 'A novel about choices, regrets, and the infinite possibilities of life.',
    longDescription: 'Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived. To see how things would be if you had made other choices... Would you have done anything different, if you had the chance to undo your regrets?',
    price: 15.99,
    coverImageUrl: 'https://placehold.co/300x450.png',
    pdfUrl: '/pdfs/placeholder-book.pdf',
    dataAiHint: 'library fantasy',
  },
  {
    id: '2',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    description: 'An amnesiac astronaut wakes up on a solo mission to save humanity.',
    longDescription: 'Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself will perish. Except that right now, he doesn’t know that. He can’t even remember his own name, let alone the nature of his assignment or how to complete it.',
    price: 18.50,
    coverImageUrl: 'https://placehold.co/300x450.png',
    pdfUrl: '/pdfs/placeholder-book.pdf',
    dataAiHint: 'space science',
  },
  {
    id: '3',
    title: 'Klara and the Sun',
    author: 'Kazuo Ishiguro',
    description: 'A story about an "Artificial Friend" and her observations of human nature.',
    longDescription: 'Klara and the Sun tells the story of Klara, an Artificial Friend with outstanding observational qualities, who, from her place in the store, watches carefully the behavior of those who come in to browse, and of those who pass on the street outside. She remains hopeful that a customer will soon choose her.',
    price: 16.75,
    coverImageUrl: 'https://placehold.co/300x450.png',
    pdfUrl: '/pdfs/placeholder-book.pdf',
    dataAiHint: 'robot future',
  },
  {
    id: '4',
    title: 'The Vanishing Half',
    author: 'Brit Bennett',
    description: 'A multi-generational story about twin sisters who choose to live in two very different worlds.',
    longDescription: 'The Vignes twin sisters will always be identical. But after growing up together in a small, southern black community and running away at age sixteen, it\'s not justthe shape of their daily lives that is different as adults, it\'s everything: their families, their communities, their racial identities.',
    price: 14.99,
    coverImageUrl: 'https://placehold.co/300x450.png',
    pdfUrl: '/pdfs/placeholder-book.pdf',
    dataAiHint: 'family drama',
  },
  {
    id: '5',
    title: 'Atomic Habits',
    author: 'James Clear',
    description: 'An easy and proven way to build good habits and break bad ones.',
    longDescription: 'No matter your goals, Atomic Habits offers a proven framework for improving--every day. James Clear, one of the world\'s leading experts on habit formation, reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results.',
    price: 20.00,
    coverImageUrl: 'https://placehold.co/300x450.png',
    pdfUrl: '/pdfs/placeholder-book.pdf',
    dataAiHint: 'selfhelp productivity',
  },
];

export const getBookById = (id: string): Book | undefined => {
  return books.find(book => book.id === id);
};
