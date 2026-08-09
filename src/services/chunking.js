const MAX_CHUNK_CHARS = 1200;

// Notes are short-form by nature. Fixed-size chunking (the default for
// long-document RAG) causes two problems here: (1) most notes are already
// smaller than a typical chunk size, so splitting adds nothing but
// bookkeeping, and (2) a stray split mid-thought on a short note destroys
// exactly the context that made the note useful in the first place.
//
// Instead: keep a note as one chunk unless it's long enough that a single
// embedding would blur distinct topics together, in which case split on
// paragraph boundaries and only fall back to sentence-splitting for a
// single paragraph that still exceeds the limit.
export function chunkNote({ title, body }) {
  const text = body.trim();

  if (text.length <= MAX_CHUNK_CHARS) {
    return [{ position: 0, text: withTitleContext(title, text) }];
  }

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= MAX_CHUNK_CHARS) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (paragraph.length <= MAX_CHUNK_CHARS) {
      current = paragraph;
    } else {
      chunks.push(...splitBySentence(paragraph));
    }
  }

  if (current) chunks.push(current);

  return chunks.map((text, position) => ({ position, text: withTitleContext(title, text) }));
}

function splitBySentence(paragraph) {
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > MAX_CHUNK_CHARS && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// Short chunks embed poorly in isolation — "the deployment failed again"
// means very different things across different notes. Prepending the
// note's title gives every chunk enough standalone context to embed
// meaningfully, at the cost of a few duplicated tokens per chunk.
function withTitleContext(title, text) {
  return `${title}\n\n${text}`;
}
