import Link from 'next/link';

export default function GeneratePage({ params }: { params: { id: string } }) {
  return (
    <main>
      <h1>Generate Metadata + Schema</h1>
      <p>Batch generation placeholder. No LLM integration yet.</p>
      <Link href={`/projects/${params.id}/module1/table`}>Open Table</Link>
    </main>
  );
}
