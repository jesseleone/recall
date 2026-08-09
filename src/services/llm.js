import Anthropic from "@anthropic-ai/sdk";

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set — see .env.example");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

const ANSWER_TOOL = {
  name: "answer_with_citations",
  description: "Provide the final answer along with which retrieved notes it draws on.",
  input_schema: {
    type: "object",
    properties: {
      answer: {
        type: "string",
        description: "The answer to the user's question, grounded only in the provided notes.",
      },
      citedChunkIndices: {
        type: "array",
        items: { type: "integer" },
        description: "Indices (0-based) of the retrieved notes actually used to answer.",
      },
    },
    required: ["answer", "citedChunkIndices"],
  },
};

// Forcing the response through a tool call (rather than asking the model
// to "please respond in JSON" in prose) means citations are structurally
// guaranteed to be present and parseable — there's no regex-scraping a
// free-text answer for note references, and no risk of the model
// answering in a format that silently fails to parse.
export async function generateAnswer({ question, retrievedChunks }) {
  if (retrievedChunks.length === 0) {
    return {
      answer: "I don't have any notes that relate to this question.",
      citations: [],
    };
  }

  const context = retrievedChunks
    .map((chunk, i) => `[${i}] (note: ${chunk.noteId})\n${chunk.text}`)
    .join("\n\n---\n\n");

  const response = await getClient().messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
    max_tokens: 1024,
    system:
      "You answer questions using ONLY the numbered notes provided. " +
      "If the notes don't contain enough information to answer, say so explicitly " +
      "rather than filling gaps with outside knowledge. Always call answer_with_citations.",
    messages: [
      {
        role: "user",
        content: `Notes:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
    tools: [ANSWER_TOOL],
    tool_choice: { type: "tool", name: "answer_with_citations" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  const { answer, citedChunkIndices } = toolUse.input;

  const citations = citedChunkIndices
    .filter((i) => i >= 0 && i < retrievedChunks.length)
    .map((i) => ({ noteId: retrievedChunks[i].noteId, text: retrievedChunks[i].text }));

  return { answer, citations };
}
