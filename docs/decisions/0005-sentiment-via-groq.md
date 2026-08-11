# Sentiment classification calls the Groq API, behind a provider interface

## Why this

Section 44 forbids the crawler calling the model directly, and section 40 asks two
questions that are one question about blast radius: if the news service fails does
the chart still work, and if the sentiment model changes is the strategy engine
affected. What those questions are testing is the boundary, not the deployment
topology. So the boundary is what we build: a `SentimentProvider` interface with one
method, and everything above it knows only that interface.

Groq behind that interface means there is no model to host, no Python runtime, no
model weights to download on every teammate's machine, and no GPU question. The
whole project stays TypeScript, which keeps the shared contracts package covering
every process we run.

The thing that makes a hosted API safe here is that section 29 already tells us to
store the label and score alongside the article. So Groq is called once per article
at ingest time and never again. Backtests read stored scores from the database, the
sentiment strategy reads stored scores, and the demo reads stored scores. The
external dependency sits at the edge of the system on the ingest path, not on the
path that anything gets graded on.

Keeping it behind an interface is what makes this reversible. If Groq turns out to
be wrong — rate limits, cost, quality on crypto headlines — swapping in a local
HuggingFace model or a hosted alternative is one provider binding, and nothing above
the interface changes. That is the same mechanism used for the strategy registry and
the search generator, applied to a third seam.

## What else we looked at

**A local HuggingFace model in a separate Python service** — the version this
project would have used by default. It keeps everything inside our system and works
offline, but it costs a second runtime, model weights on every machine, and a
process that must be running before the news pipeline means anything. It also makes
the stack polyglot for one small service.

**A local model inside the backend process** — cheapest to run of the local options,
and the one that fails the section 40 questions outright. A slow model load delays
startup for the charts, and an inference crash takes down more than sentiment.

**Another hosted sentiment API** — same shape as Groq. Groq wins on latency and on
being an LLM we can prompt, which means the classification can be tuned by rewriting
a prompt rather than retraining anything.

## Trade-offs

Sentiment analysis is now a prompt to somebody else's model rather than a model we
run. Section 2 asks for sentiment analysis "using a machine learning model", and a
grader may reasonably expect to see a model rather than an API call. The provider
interface is the answer to that if it is raised — we can demonstrate a local model
behind the same interface — but this is a real exposure and worth being ready for
rather than surprised by.

Ingestion now needs the network and an API key. The key is a secret that must stay
out of the repository, which is a new class of thing this project has to handle
correctly. And an article that fails classification needs a defined state — left
unscored and retried, rather than silently stored as neutral, or the sentiment
strategy will quietly train on holes.

LLM output is not deterministic in the way a classifier is. The same headline can
come back with a slightly different score on a re-run, which sits awkwardly beside
the reproducibility that section 36 demands of backtests. Storing the score once and
never recomputing it is what keeps backtests reproducible, so the store-on-ingest
rule is load-bearing rather than an optimisation.
