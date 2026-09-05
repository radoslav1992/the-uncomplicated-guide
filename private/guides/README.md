# Guide files

Put the PDFs here (git-ignored) and upload them to the R2 bucket declared in `wrangler.jsonc`:

    npx wrangler r2 object put uncomplicated-guides-files/<fileKey> --file private/guides/<file>.pdf --remote

`<fileKey>` must match `fileKey` in `src/data/guides.ts`. Add `--local` instead of `--remote`
to seed the local bucket for development.

Current files:

| fileKey                      | Guide              |
| ---------------------------- | ------------------ |
| `ai-assistants-en-v1.1.pdf`  | 24/7 AI Assistants |
