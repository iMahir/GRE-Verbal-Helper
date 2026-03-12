# VocabMaster — GRE Vocabulary Prep

A Magoosh-inspired GRE vocabulary preparation app built with Next.js. Learn 1,113 words across 38 groups using flashcards, quizzes, spaced repetition, and AI-powered features.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)

## Features

- **Dashboard** — Track daily streaks, activity heatmap, quiz trends, and group progress at a glance
- **Learn Mode** — Infinite adaptive practice with MCQs powered by spaced repetition (SRS)
- **Quiz** — Timed assessments (10/20/30 questions) with score history
- **Flashcards** — Flip cards with keyboard shortcuts (Space, ←, →)
- **Groups** — Browse all 38 word groups with filtering, progress bars, and bulk actions
- **AI Assistant** — Explore words (explain, synonyms, sentences, mnemonics), compare confusing pairs, chat, and get personalized study advice
- **Weak Words Review** — Filter by due/hard/low-streak words and practice with flashcards
- **Dark/Light Theme** — Full theme support with smooth toggles
- **Pronunciation** — Browser SpeechSynthesis for word pronunciation
- **Keyboard Shortcuts** — Navigate quizzes and flashcards without a mouse
- **Offline-First** — All progress stored in localStorage (no account needed)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Theming | next-themes |
| AI | GPT4Free API (OpenAI-compatible) |
| Storage | localStorage (client-side) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/verbal-helper.git
cd verbal-helper
npm install
```

### Environment Variables

Copy the example env file and add your API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
G4F_API_BASE=https://g4f.space/v1
G4F_API_KEY=your_api_key_here
```

> The app works without an API key — AI features will simply show an error message.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx            # Dashboard
│   ├── learn/page.tsx      # Adaptive learning (SRS + MCQ)
│   ├── quiz/page.tsx       # Timed quiz mode
│   ├── flashcards/page.tsx # Flashcard practice
│   ├── groups/
│   │   ├── page.tsx        # Group listing
│   │   └── [id]/page.tsx   # Group detail
│   ├── ai/page.tsx         # AI assistant
│   ├── weak-words/page.tsx # Weak words review
│   ├── api/ai/route.ts     # AI API route
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Theme & component styles
├── components/
│   ├── Navbar.tsx           # Navigation + theme toggle
│   ├── Flashcard.tsx        # Flip card component
│   ├── ProgressRing.tsx     # SVG progress ring
│   ├── ThemeProvider.tsx    # next-themes wrapper
│   └── OnboardingModal.tsx  # First-time welcome
├── data/
│   └── words.ts            # 1,113 GRE words (38 groups)
└── hooks/
    └── useProgress.ts      # SRS, progress tracking, localStorage
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add `G4F_API_KEY` in Environment Variables
4. Deploy

### Other Platforms

Any platform supporting Node.js 18+ works. Set the environment variables and run:

```bash
npm run build
npm start
```

## License

MIT
