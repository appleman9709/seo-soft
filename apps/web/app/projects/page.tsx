import Link from 'next/link';

const projects = [{ id: 'demo-project', name: 'Demo Project' }];

export default function ProjectsPage() {
  return (
    <main>
      <h1>Projects</h1>
      <button type="button">Create Project</button>
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            <Link href={`/projects/${project.id}/module1/import`}>{project.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
