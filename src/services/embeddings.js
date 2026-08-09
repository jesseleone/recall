const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings";

// Batches a list of texts into a single Voyage AI request. Voyage
// distinguishes "document" inputs (things being indexed) from "query"
// inputs (the search string) and recommends different instruction
// prefixes for each — this matters more for retrieval quality than most
// people expect, so it's kept as an explicit parameter rather than
// defaulted away.
export async function embed(texts, { inputType }) {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set — see .env.example");
  }

  const response = await fetch(VOYAGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model: process.env.VOYAGE_MODEL || "voyage-3",
      input_type: inputType,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage embeddings request failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  return payload.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

export function embedDocuments(texts) {
  return embed(texts, { inputType: "document" });
}

export function embedQuery(text) {
  return embed([text], { inputType: "query" }).then((vectors) => vectors[0]);
}
