// A small, hand-labeled retrieval eval set. Each question has one or more
// "expectedNoteKeys" — the notes a correct retrieval should surface.
// Several notes are deliberately similar (the three deployment notes, the
// two recipe notes) so the eval actually exercises discrimination rather
// than only rewarding retrieval for being topically distinct.

export const testNotes = [
  {
    key: "deploy-rollback",
    title: "Rollback procedure for the payments service",
    body:
      "If a deploy to payments-service fails health checks, run `kubectl rollout undo " +
      "deployment/payments-service -n prod`. Confirm the previous revision is healthy " +
      "via the /healthz endpoint before closing the incident. Do not retry the failed " +
      "deploy until the root cause is identified.",
  },
  {
    key: "deploy-canary",
    title: "Canary deploy steps",
    body:
      "New payments-service releases go to a 5% canary for 30 minutes before full rollout. " +
      "Watch error rate and p99 latency dashboards during the canary window. If error rate " +
      "exceeds 1%, abort and roll back automatically via the canary controller.",
  },
  {
    key: "deploy-oncall",
    title: "On-call escalation for deploy failures",
    body:
      "Page the secondary on-call if a deploy-related incident isn't acknowledged within " +
      "10 minutes. Escalation path: primary -> secondary -> eng manager. Post a summary in " +
      "#incidents once resolved.",
  },
  {
    key: "recipe-pasta",
    title: "Weeknight pasta",
    body:
      "Boil pasta 1 minute under package instructions. Reserve a cup of pasta water. " +
      "Toss with garlic, olive oil, chili flake, and a splash of the reserved water off heat " +
      "so the sauce emulsifies instead of breaking.",
  },
  {
    key: "recipe-bread",
    title: "No-knead bread",
    body:
      "Mix flour, water, salt, and a small amount of yeast. Let it sit covered for 12-18 " +
      "hours at room temperature. Shape gently, proof 30 minutes, then bake covered in a " +
      "hot dutch oven for 30 minutes and uncovered for 15 more.",
  },
  {
    key: "book-notes",
    title: "Notes on Thinking in Systems",
    body:
      "Core idea: a system's behavior comes from its structure, not the individual events " +
      "within it. Pushing on a leverage point that isn't actually load-bearing produces no " +
      "change; the highest-leverage points are usually the ones people intuit last, like " +
      "the goals the system is implicitly optimizing for.",
  },
  {
    key: "meeting-vendor",
    title: "Vendor call - observability platform",
    body:
      "Their pricing scales with ingested log volume, not host count, which matters given " +
      "our current logging is noisier than it needs to be. Asked for a trial sized to our " +
      "actual prod traffic rather than their default sandbox limits.",
  },
  {
    key: "idea-side-project",
    title: "Side project idea: recipe scaler",
    body:
      "A tool that rescales a recipe's ingredient quantities for a different serving size, " +
      "but also warns when a scaled quantity crosses a threshold where the technique " +
      "(not just the ratio) needs to change - e.g. bread hydration at large batch sizes.",
  },
];

export const testQuestions = [
  {
    question: "How do I roll back a bad payments-service deploy?",
    expectedNoteKeys: ["deploy-rollback"],
  },
  {
    question: "What's the canary rollout window before a full release?",
    expectedNoteKeys: ["deploy-canary"],
  },
  {
    question: "Who gets paged if nobody acks a deploy incident?",
    expectedNoteKeys: ["deploy-oncall"],
  },
  {
    question: "How long should bread dough sit before baking?",
    expectedNoteKeys: ["recipe-bread"],
  },
  {
    question: "What's the main idea behind Thinking in Systems?",
    expectedNoteKeys: ["book-notes"],
  },
  {
    question: "Is the observability vendor's pricing based on number of servers?",
    expectedNoteKeys: ["meeting-vendor"],
  },
];
