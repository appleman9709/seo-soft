import Link from 'next/link';

export default function ImportPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <h1>Import Rows</h1>
      <p>Project: {params.id}</p>
      <p>Upload CSV/XLSX and choose a mapping preset (placeholder UI).</p>
      <Link href={`/projects/${params.id}/module1/generate`}>Next: Generate</Link>
    </main>
  );
}
