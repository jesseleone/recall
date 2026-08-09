// Stubs the Voyage embeddings HTTP call so notes/ingestion tests don't
// require a real VOYAGE_API_KEY. Returns a short deterministic vector
// derived from each input string's length + character codes, which is
// enough for CRUD-path tests (they only check that embeddings exist and
// are the right shape, never retrieval quality — see eval/dataset.js and
// `npm run eval` for retrieval-quality testing against the real API).
export function installFakeVoyage() {
  process.env.VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || "test-key";
  const originalFetch = global.fetch;

  global.fetch = async (url, options) => {
    if (typeof url === "string" && url.includes("api.voyageai.com")) {
      const { input } = JSON.parse(options.body);
      const data = input.map((text, index) => ({
        index,
        embedding: fakeEmbedding(text),
      }));
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
    return originalFetch(url, options);
  };

  return () => {
    global.fetch = originalFetch;
  };
}

function fakeEmbedding(text) {
  const vector = new Array(8).fill(0);
  for (let i = 0; i < text.length; i++) {
    vector[i % vector.length] += text.charCodeAt(i);
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}
