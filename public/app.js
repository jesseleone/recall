const state = { token: localStorage.getItem("recall_token") };

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

function showApp() {
  $("auth-screen").classList.add("hidden");
  $("app-screen").classList.remove("hidden");
  loadNotes();
}

function showAuth() {
  $("app-screen").classList.add("hidden");
  $("auth-screen").classList.remove("hidden");
}

$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const mode = e.submitter.dataset.mode;
  const email = $("email").value;
  const password = $("password").value;

  try {
    const { token } = await api(`/auth/${mode}`, { method: "POST", body: JSON.stringify({ email, password }) });
    state.token = token;
    localStorage.setItem("recall_token", token);
    $("auth-error").textContent = "";
    showApp();
  } catch (err) {
    $("auth-error").textContent = err.message;
  }
});

$("logout").addEventListener("click", () => {
  state.token = null;
  localStorage.removeItem("recall_token");
  showAuth();
});

$("save-note").addEventListener("click", async () => {
  const title = $("note-title").value.trim();
  const body = $("note-body").value.trim();
  if (!title || !body) return;

  await api("/notes", { method: "POST", body: JSON.stringify({ title, body }) });
  $("note-title").value = "";
  $("note-body").value = "";
  loadNotes();
});

async function loadNotes() {
  const notes = await api("/notes");
  const container = $("notes-list");
  container.innerHTML = "";

  for (const note of notes) {
    const el = document.createElement("div");
    el.className = "note";
    el.innerHTML = `
      <h3>${escapeHtml(note.title)}</h3>
      <p>${escapeHtml(note.body)}</p>
      <div class="meta">${new Date(note.updatedAt).toLocaleString()}</div>
      <button data-id="${note._id}">Delete</button>
    `;
    el.querySelector("button").addEventListener("click", async () => {
      await api(`/notes/${note._id}`, { method: "DELETE" });
      loadNotes();
    });
    container.appendChild(el);
  }
}

$("ask-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = $("question").value;
  const answerEl = $("answer");
  answerEl.textContent = "Thinking...";

  try {
    const { answer, citations } = await api("/query", { method: "POST", body: JSON.stringify({ question }) });
    answerEl.innerHTML = `<p>${escapeHtml(answer)}</p>`;
    for (const citation of citations) {
      const el = document.createElement("div");
      el.className = "citation";
      el.textContent = citation.text;
      answerEl.appendChild(el);
    }
  } catch (err) {
    answerEl.textContent = err.message;
  }
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

if (state.token) showApp();
