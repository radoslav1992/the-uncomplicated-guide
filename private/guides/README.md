# Guide files

Put the PDFs here (git-ignored). Upload them to the private R2 bucket `kova-guides` **without
renaming**: the object key is the exact file name and must equal `fileKey` in `src/data/guides.ts`,
letter for letter. Drag and drop in R2 → kova-guides → Objects → Upload, or:

    npx wrangler r2 object put "kova-guides/<file name>" --file "private/guides/<file name>" --remote

Add `--local` instead of `--remote` to seed the local bucket for development.

| Upload as (= `fileKey`)                          | Guide              | Buyer saves it as                   |
| ------------------------------------------------ | ------------------ | ----------------------------------- |
| `247_AI_Assistants_ElevenAgents_EN_v1.1_Kova.pdf` | 24/7 AI Assistants | `24-7-AI-Assistants-EN-v1.1.pdf`     |
| `AI_Video_Ads_UGC_Guide_EN_v1.0.pdf`             | AI Video Ads & UGC | `AI-Video-Ads-and-UGC-EN-v1.0.pdf`   |
