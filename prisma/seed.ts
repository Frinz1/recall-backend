import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Recall Database Seed...');

  // 1. Create Demo Student User
  const email = 'alex@recall.app';
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      name: 'Alex Cruz',
    },
  });

  console.log(`👤 Created Demo User: ${user.email} (${user.id})`);

  // 2. Create Subjects
  const netSubject = await prisma.subject.create({
    data: {
      userId: user.id,
      name: 'Computer Networks',
      colorHex: '#3B82F6',
    },
  });

  const osSubject = await prisma.subject.create({
    data: {
      userId: user.id,
      name: 'Operating Systems',
      colorHex: '#A855F7',
    },
  });

  // 3. Create Decks
  const netDeck = await prisma.deck.create({
    data: {
      userId: user.id,
      subjectId: netSubject.id,
      title: 'Transport Protocols & CIDR',
      description: 'TCP/IP handshake, CIDR subnetting, and TLS 1.3 protocol handshakes.',
      colorHex: '#3B82F6',
      isFavorite: true,
    },
  });

  const osDeck = await prisma.deck.create({
    data: {
      userId: user.id,
      subjectId: osSubject.id,
      title: 'Concurrency & Virtual Memory',
      description: 'Thread synchronization, deadlock conditions, and page thrashing.',
      colorHex: '#A855F7',
      isFavorite: true,
    },
  });

  // 4. Create Flashcards for Networking
  const c1 = await prisma.flashcard.create({
    data: {
      deckId: netDeck.id,
      question: 'Explain the difference between TCP 3-Way Handshake and 4-Way Teardown.',
      answer: 'Handshake establishes connection (SYN -> SYN-ACK -> ACK). Teardown gracefully terminates both simplex channels (FIN -> ACK -> FIN -> ACK).',
      explanation: 'Because TCP is full-duplex, each direction must be terminated independently.',
      tags: ['TCP', 'Networking', 'Transport'],
      repetitions: 3,
      intervalDays: 6,
      easeFactor: 2.4,
      timesReviewed: 4,
      timesForgot: 1,
      masteryStatus: 'reviewing',
      nextReviewDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // Due today!
    },
  });

  const c2 = await prisma.flashcard.create({
    data: {
      deckId: netDeck.id,
      question: 'What is CIDR Subnetting and why was it introduced?',
      answer: 'Classless Inter-Domain Routing uses variable-length subnet masks (/24, /27) to allocate IP addresses efficiently and mitigate global routing table bloat.',
      explanation: 'Replaced rigid Class A, B, and C addressing which wasted millions of unused IPs.',
      tags: ['IP', 'CIDR', 'Subnetting'],
      repetitions: 1,
      intervalDays: 1,
      easeFactor: 1.6, // Weakness radar candidate!
      timesReviewed: 4,
      timesForgot: 3, // 75% fail rate
      masteryStatus: 'learning',
      nextReviewDate: new Date(Date.now() - 1 * 60 * 60 * 1000), // Due today!
    },
  });

  // 5. Create Flashcards for OS
  const c3 = await prisma.flashcard.create({
    data: {
      deckId: osDeck.id,
      question: 'What are the 4 Coffman conditions required for a Deadlock to occur?',
      answer: '1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait',
      explanation: 'Eliminating any single one of these four conditions guarantees that deadlock cannot occur.',
      tags: ['Concurrency', 'Deadlocks', 'Kernel'],
      repetitions: 1,
      intervalDays: 1,
      easeFactor: 1.7, // Weakness candidate
      timesReviewed: 3,
      timesForgot: 2,
      masteryStatus: 'learning',
      nextReviewDate: new Date(Date.now() - 30 * 60 * 1000), // Due today!
    },
  });

  const c4 = await prisma.flashcard.create({
    data: {
      deckId: osDeck.id,
      question: 'Compare Mutex vs. Counting Semaphore in thread synchronization.',
      answer: 'A Mutex is a locking mechanism with ownership (only the thread that locked it can unlock it). A Semaphore is a signaling mechanism without ownership.',
      explanation: 'Counting semaphores allow up to N concurrent threads access to a pool of shared resources.',
      tags: ['Threads', 'Mutex', 'Primitives'],
      repetitions: 4,
      intervalDays: 14,
      easeFactor: 2.6,
      timesReviewed: 5,
      timesForgot: 0,
      masteryStatus: 'mastered',
      nextReviewDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    },
  });

  // 6. Create Historical Review Logs
  await prisma.cardReview.createMany({
    data: [
      { cardId: c1.id, userId: user.id, rating: 'good' },
      { cardId: c2.id, userId: user.id, rating: 'again' },
      { cardId: c3.id, userId: user.id, rating: 'again' },
      { cardId: c4.id, userId: user.id, rating: 'easy' },
    ],
  });

  console.log('✅ Database seeded successfully with authentic CS decks & reviews!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
