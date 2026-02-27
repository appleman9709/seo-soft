window.issueData = [
  { url: '/hotels/paris', status: 'error', issueType: 'Title too long', details: '68 characters' },
  { url: '/hotels/london', status: 'warning', issueType: 'Missing meta description', details: 'Description is empty' },
  { url: '/hotels/berlin', status: 'error', issueType: 'Duplicate H1', details: 'H1 repeats listing title' },
  { url: '/hotels/rome', status: 'ready', issueType: 'No issues', details: 'Compliant' },
  { url: '/hotels/madrid', status: 'warning', issueType: 'Title too long', details: '64 characters' },
  { url: '/hotels/lisbon', status: 'ready', issueType: 'No issues', details: 'Compliant' },
  { url: '/hotels/vienna', status: 'error', issueType: 'Missing canonical', details: 'Canonical not found' }
];

window.fixSuggestions = {
  'Title too long': 'Shorten by removing city names or repeated modifiers to stay near 55–60 chars.',
  'Missing meta description': 'Add a concise 140–160 character description that includes the primary keyword.',
  'Duplicate H1': 'Use a unique H1 focused on the specific page intent.',
  'Missing canonical': 'Add a canonical URL pointing to the preferred page version.',
  'No issues': 'No action needed.'
};
