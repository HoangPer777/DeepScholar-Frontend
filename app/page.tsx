const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001/api/v1";
const aiUrl = process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8002/api";


export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">DeepScholar</p>
        <h1>Scientific publishing, ranking, and agentic research in one stack.</h1>
        <p className="lede">
          Frontend is initialized and ready to connect to Django and FastAPI services for auth, article CRUD, PDF ingestion,
          chatbot, and deep research.
        </p>
        <div className="endpoint-grid">
          <article>
            <h2>Backend API</h2>
            <p>{backendUrl}</p>
          </article>
          <article>
            <h2>AI Service</h2>
            <p>{aiUrl}</p>
          </article>
        </div>
      </section>
    </main>
  );
}