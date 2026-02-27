export default function ReportPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <h1>Quality Report</h1>
      <p>Project: {params.id}</p>
      <p>Report generation is a placeholder for this vertical slice.</p>
    </main>
  );
}
