# MindText Journal

This is a standalone playground for the MindText journal experience with a chat view and a searchable summaries view.

## Getting Started

1. Install dependencies
   ```
   npm install
   ```
2. Copy `.env.local.example` to `.env.local` and manually set `OPENAI_API_KEY`. (OpenAI API key must be valid.)
3. Run the development server
   ```
   npm run dev
   ```
4. Visit `http://localhost:3000`.

## Features

- Entries are saved locally (browser storage) so summaries can resurface them.
- Search by keyword to find past themes, names, moods, etc.
