import { useState, useEffect } from 'react';

const API = '/api';

export default function App() {
  const [tab, setTab] = useState<'skills' | 'runs'>('skills');
  const [skills, setSkills] = useState<{ name: string; description?: string }[]>([]);
  const [runs, setRuns] = useState<{ id: string; skillName?: string; startedAt?: string }[]>([]);

  useEffect(() => {
    fetch(`${API}/skills/installed`).then((r) => r.json()).then((d) => setSkills(d.skills || [])).catch(() => setSkills([]));
    fetch(`${API}/runs`).then((r) => r.json()).then((d) => setRuns(d.runs || [])).catch(() => setRuns([]));
  }, [tab]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: 800 }}>
      <h1 style={{ marginBottom: '1rem' }}>SkillRunner</h1>
      <nav style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => setTab('skills')}
          style={{
            padding: '0.5rem 1rem',
            background: tab === 'skills' ? '#334155' : 'transparent',
            border: '1px solid #475569',
            borderRadius: 4,
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
        >
          Skills
        </button>
        <button
          onClick={() => setTab('runs')}
          style={{
            padding: '0.5rem 1rem',
            background: tab === 'runs' ? '#334155' : 'transparent',
            border: '1px solid #475569',
            borderRadius: 4,
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
        >
          Runs
        </button>
      </nav>
      {tab === 'skills' && (
        <section>
          <h2>Installed Skills</h2>
          {skills.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No skills installed. Run <code>skill install &lt;name&gt;</code></p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {skills.map((s) => (
                <li key={s.name} style={{ padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                  <strong>{s.name}</strong>
                  {s.description && <div style={{ color: '#94a3b8', fontSize: '0.9em' }}>{s.description}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {tab === 'runs' && (
        <section>
          <h2>Recent Runs</h2>
          {runs.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No runs yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {runs.map((r) => (
                <li key={r.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                  <code>{r.id}</code> — {r.skillName || '?'} — {r.startedAt || ''}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
