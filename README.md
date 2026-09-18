# History of Kazakhstan — Oral Exam Trainer

An English-language trainer for the oral History of Kazakhstan exam, with extra emphasis on the Stone Age.

## What is included

- 453 multiple-choice questions in chronological order.
- 137 Stone Age questions as the priority practice section.
- 17 official syllabus topics covering Introduction, the Stone Age, Early Iron Age, and Turkic era.
- Random Topic and Start Again controls in Essay mode.
- OpenAI-assisted essay review using four criteria: Human or AI, Fact Check, Relevance, and Depth.
- Practice, flashcards, essay timer, progress statistics, and responsive mobile/desktop layout.

## Run locally with AI review

Requirements: Node.js 18 or newer and an OpenAI API key.

1. Copy `.env.example` to `.env`.
2. Put your key in `.env` as `OPENAI_API_KEY=...`.
3. Run `npm run dev`.
4. Open `http://localhost:8787`.

On Windows, you can instead double-click `start-trainer.bat`. It loads `.env` when that file exists, or asks for the key for the current session.

The browser sends essay text only to the local `/api/evaluate` endpoint. The server reads the API key, so the key is never embedded in `index.html` or exposed to visitors.

## Without AI review

`index.html` can still be opened directly or hosted as a static GitHub Pages site. All training modes work, but AI review requires the Node server because GitHub Pages cannot run `server.mjs` or securely store an API key.

## Deployment

### GitHub Pages — static trainer

The included `.github/workflows/deploy-pages.yml` deploys the static trainer after every push to `main`.

1. Push the project to GitHub.
2. In the repository, open **Settings → Pages**.
3. Choose **GitHub Actions** as the deployment source.

GitHub Pages is suitable for the question bank, flashcards, and essay topics. The AI Review button displays a clear note there because Pages cannot safely store the OpenAI key or run the API endpoint.

### Vercel — trainer with AI review

The included `vercel.json` and `api/evaluate.js` create the `/api/evaluate` serverless endpoint automatically.

1. Import the GitHub repository in Vercel.
2. In **Settings → Environment Variables**, add `OPENAI_API_KEY` with your real key.
3. Optionally add `OPENAI_MODEL=gpt-5-mini`.
4. Deploy. Use the Vercel URL for the full version with AI review.

Never add your actual key to `.env.example`, GitHub, or browser JavaScript.

## Important note

The Human or AI result is a writing-pattern heuristic, not proof of authorship. It should be used as feedback rather than as an accusation or grading decision.

## Security

- Never commit `.env` or a real API key.
- Commit `.env.example` only; it documents the required variables without containing secrets.
- If a key is exposed, revoke it and create a new one immediately.

## License

MIT — see [LICENSE](LICENSE).
