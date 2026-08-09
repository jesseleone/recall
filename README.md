# recall

A notes app with retrieval-augmented search and Q&A — ask questions
about your own notes and get grounded answers with citations back to
the source.

## Background

This repository started in 2013 with Node.js,
Express, Passport, and Mongoose. The core intent — an app where you store what you know
and find it again later. With the advancement of AI and RAG, I wanted to transition from keyword lookup to semantic retrieval over your own corpus, grounded and cited rather than hallucinated.

## Why

Most "notes app" AI features bolt a chatbot onto existing UI. This explores the
retrieval problem properly instead: chunking strategy, embedding choice, retrieval
evaluation, and citation grounding — the parts that actually determine whether
answers are trustworthy, as opposed to the part that's just an API call to an LLM.

## Architecture

```
                    ┌──────────────┐
                    │   Client     │  (thin UI — not the focus)
                    └──────┬───────┘
                           │  JWT auth
                    ┌──────▼───────┐
                    │   API layer   │  Express
                    └──────┬───────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        Notes CRUD    Ingestion     Query/RAG
        (Mongoose)    Pipeline      Endpoint
              │            │            │
              │      ┌─────▼─────┐      │
              │      │  Chunk +   │      │
              │      │  Embed     │      │
              │      │ (Voyage)   │      │
              │      └─────┬─────┘       │
              │            │             │
              └──────┬─────┴──────┬──────┘
                     ▼             ▼
              MongoDB          Vector Search
             (notes, users) → (local cosine or
                                Atlas $vectorSearch)
                                     │
                                     ▼
                              Claude (grounded
                               answer, forced
                               tool-call output
                               with citations)
```

## Key design decisions

### Two vector search backends, one interface
`src/services/vectorSearch.js` implements retrieval two ways behind the same
function signature: `local` does a brute-force cosine-similarity scan in JS,
`atlas` delegates to MongoDB Atlas's `$vectorSearch` aggregation stage (HNSW-backed
approximate nearest neighbor). `local` is the default — zero external setup, and
exact rather than approximate, which is what you want for the retrieval eval script
where you're measuring ground-truth ranking quality, not production latency. `atlas`
is there for when the corpus is large enough that an O(n) scan per query stops being
free; switching is one environment variable because both return the same shape.

If you do run the `atlas` backend, Atlas requires the vector index to be created
explicitly (this isn't inferred from the Mongoose schema):
```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 1024, "similarity": "cosine" },
    { "type": "filter", "path": "userId" }
  ]
}
```

### Chunking: mostly, don't
Notes are short-form by nature. Fixed-size chunking — the default for long-document
RAG — solves a problem this app mostly doesn't have: most notes are already smaller
than a typical chunk size, so splitting adds bookkeeping without benefit, and a
stray split mid-thought on a short note destroys the exact context that made the
note retrievable in the first place. `chunkNote` keeps a note as one chunk unless
it's long enough that a single embedding would blur distinct topics together, and
even then splits on paragraph (then sentence) boundaries rather than fixed character
windows. Every chunk is also prefixed with the note's title before embedding —
short chunks embed ambiguously in isolation ("the deployment failed again" means
very different things across different notes), and the title is cheap, high-signal
context.

### Retrieval evaluation is separate from generation evaluation
`npm run eval` seeds a fixed, hand-labeled set of notes (`eval/dataset.js`) —
including deliberately similar notes (three deploy-related notes, two recipes) so
the eval actually exercises discrimination, not just topic separation — and reports
recall@3 and mean reciprocal rank against the real embedding + vector search path.
It does not touch the LLM at all. You can't fix answer quality on top of broken
retrieval, so retrieval is measured on its own before generation enters the picture.

### Citations via forced tool use, not prompted JSON
`generateAnswer` forces the model's response through an `answer_with_citations` tool
call rather than asking it to "please respond in JSON" in prose. Citations are
structurally guaranteed to be present and parseable — there's no regex-scraping a
free-text answer for note references, and no risk of the model answering in a format
that silently fails to parse.

## What I'd change at scale

- **The `local` vector backend is O(n) per query.** Fine at notes-app scale for one
  user; the `atlas` backend exists for exactly this reason and is the intended
  production path.
- **Every save fully re-chunks and re-embeds the note**, even for a one-character
  edit. Notes are small and edited far less often than they're read, so this wasn't
  worth the complexity of incremental re-chunking — but it's the first thing that
  would need to change for larger notes or high edit frequency.
- **No reranking step.** Vector similarity alone picks the top-k; a cross-encoder
  rerank pass would likely improve precision at the margin, left out to keep the
  retrieval path easy to evaluate in isolation.
- **The query endpoint (embedding + retrieval + generation, end to end) isn't
  covered by the automated test suite** — it requires live Voyage and Anthropic API
  calls. Chunking and vector-ranking logic are unit tested with no external
  dependency, and notes CRUD + the ingestion pipeline are integration tested against
  a real (in-memory) MongoDB with the embedding call stubbed at the network layer.
  End-to-end retrieval quality is covered by `npm run eval` instead, which is
  designed to run against the real APIs — that's a deliberate split, not a gap
  covered up as a gap.
- **No rate limiting or per-user quota** on embedding/generation calls — fine for a
  single-user demo, not fine the moment this has more than one real user.

## Getting started

Requires a MongoDB instance (local `mongod`, Docker, or Atlas), a
[Voyage AI](https://www.voyageai.com/) API key, and an
[Anthropic](https://console.anthropic.com/) API key.

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI, VOYAGE_API_KEY, ANTHROPIC_API_KEY
npm run dev             # http://localhost:3000
npm test                 # unit + integration tests, no external API calls needed
npm run eval              # retrieval quality eval — requires VOYAGE_API_KEY
```

## Stack

Node.js · Express · Mongoose · MongoDB (local cosine similarity or Atlas Vector
Search) · Voyage AI (embeddings) · Claude (generation)
