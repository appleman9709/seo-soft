import Link from 'next/link';

const rows = [
  { url: '/sample-page', status: 'Draft', title: 'Sample Product' },
  { url: '/another-page', status: 'Review', title: 'Another Product' }
];

export default function TablePage({ params }: { params: { id: string } }) {
  return (
    <main>
      <h1>Module 1 Table</h1>
      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>URL</th>
            <th>Status</th>
            <th>Title</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.url}>
              <td>{row.url}</td>
              <td>{row.status}</td>
              <td>{row.title}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <Link href={`/projects/${params.id}/module1/report`}>View report</Link>
      </p>
    </main>
  );
}
