# hwp-maker

**AI‑powered web tool for creating and editing Korean HWP/HWPX documents**

---

## 🎯 Project Overview

`hwp-maker` is a modern web application that lets anyone generate, edit, and download Hangul Word Processor (HWP/HWPX) files using natural‑language commands powered by AI. The workflow is intuitive:

1. **Enter a natural‑language instruction** (e.g., "Add a title section about project goals").
2. **AI generates the appropriate document content** while respecting a pre‑defined style/template.
3. **Real‑time preview** on the right‑hand panel using the `rhwp` WebAssembly (WASM) renderer, where you can also make direct edits.
4. **Download** the finished document as `.hwp` or `.hwpx`.

The app is designed for **self‑hosting** (Vercel or any static host) and requires **no authentication** – anyone can start editing instantly.

---

## 🛠️ Tech Stack

| Category            | Choice                     |
|---------------------|----------------------------|
| **Framework**       | **Next.js** (App Router)   |
| **Language**        | **TypeScript** (strict)    |
| **Styling**         | **Tailwind CSS v3**        |
| **Document Engine** | **rhwp (WASM)** – client‑side only |
| **AI Integration**  | **OpenAI‑compatible API** (also supports Ollama) |
| **State Management**| **Session Storage** – persists per‑session editing state |
| **File Export**     | Local download of `.hwp` / `.hwpx` |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js ≥ 18**
- **npm** (comes with Node) or **pnpm** / **yarn**
- An **OpenAI‑compatible API key** (or an Ollama endpoint) – see the *Configuration* section below.

### 1. Clone the Repository

```bash
git clone https://github.com/suime/hwp-maker.git
cd hwp-maker
```

### 2. Install Dependencies

```bash
npm install   # or `pnpm install` / `yarn`
```

### 3. Set Environment Variables

Create a `.env.local` file at the project root:

```env
# Server‑side proxy (optional)
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key

# Direct client‑side calls – prefix with NEXT_PUBLIC_
NEXT_PUBLIC_AI_BASE_URL=http://localhost:11434/v1   # Example for Ollama
```

> **Tip**: If you only use the client‑side mode, you can omit the `OPENAI_` variables and only keep the `NEXT_PUBLIC_` ones.

### 4. Run the Development Server

```bash
npm run dev
```

Open <http://localhost:3000> in your browser. The editor loads the `rhwp` WASM module dynamically on the client side.

---

## ✨ Core Features

- **Natural‑Language Editing** – chat‑style panel on the left.
- **Live WASM Preview** – rendered HWP document on the right, editable directly.
- **AI‑driven Content Generation** – respects a fixed style/template; only the content is generated.
- **AI Configuration UI** – set API Key, Base URL, and model name; stored in session storage.
- **Export** – download the document as `.hwp` or `.hwpx`.
- **Zero Backend** – all heavy lifting (WASM rendering + AI calls) happens in the browser, keeping the app lightweight and easy to deploy.

---

## 📁 Project Structure

```
hwp-maker/
├─ app/                     # Next.js App Router
│   ├─ layout.tsx
│   ├─ page.tsx            # Main editor page
│   └─ api/
│       └─ ai/route.ts    # Optional AI proxy (Edge/Serverless)
├─ components/
│   ├─ editor/            # HWP editor UI
│   ├─ chat/              # AI chat panel
│   └─ ui/                # Reusable UI primitives (buttons, cards…)
├─ lib/
│   ├─ ai/                # Wrapper around fetch for AI calls
│   ├─ rhwp/              # WASM loader & helper functions
│   └─ session/           # Session‑storage utilities
├─ public/
│   └─ wasm/               # rhwp.wasm binary
├─ styles/                 # Tailwind config & globals
├─ types/
│   └─ hwp.ts             # Type definitions for HWP structures
└─ README.md               # ← This file
```

---

## ⚙️ Configuration Details

### AI Settings UI

- **API Base URL** – e.g., `https://api.openai.com/v1` or `http://localhost:11434/v1` for Ollama.
- **API Key** – required for OpenAI‑compatible services.
- **Model Name** – pick any model the endpoint supports (e.g., `gpt-4o`, `llama2:7b`).

All values are persisted in **session storage**, so they survive page reloads but are cleared when the browser tab is closed.

### WASM Loading

The `rhwp` WASM file is loaded lazily in a `useEffect` with `'use client'` to ensure it only runs in the browser. Errors while loading are caught and displayed to the user.

---

## 📦 Deployment

Because the app is fully static (except optional API proxy), you can deploy to any static‑hosting platform:

- **Vercel** – just push the repo; Vercel will run `npm run build` and serve the generated output.
- **Netlify / Cloudflare Pages** – similar workflow.
- **Self‑hosted** – serve the `out/` directory via Nginx, Apache, or a simple file server.

If you need the AI proxy (e.g., to hide your API key), add the `api/ai/route.ts` implementation and enable Edge Functions on Vercel.

---

## 🧪 Testing

Currently the project does not include automated tests. For manual verification:

1. Open the app.
2. Type a prompt like `"Add a section titled 'Overview' with two bullet points"`.
3. Confirm the preview updates and the document can be downloaded.

Future work will add unit tests for the AI wrapper and integration tests for the WASM renderer.

---

## 📚 Resources

- **rhwp WASM** – <https://github.com/suime/rhwp-wasm>
- **Tailwind CSS** – <https://tailwindcss.com/>
- **Next.js App Router** – <https://nextjs.org/docs/app>
- **OpenAI API** – <https://platform.openai.com/docs/api-reference/introduction>

---

## 🙏 Contributing

Contributions are welcome! Fork the repository, create a feature branch, and open a pull request. Please adhere to the existing coding conventions (TypeScript strict mode, Tailwind utility classes, and the folder layout described above).

---

## 📜 License

This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

*Happy hacking! 🎉*
