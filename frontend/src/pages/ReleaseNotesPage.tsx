import { type ReactElement } from 'react';
import { Layout } from '../components/ui/Layout';
import { Sparkles, Calendar } from 'lucide-react';
import {
  releases,
  TAG_LABELS,
  TAG_COLORS,
  type Release,
  type ReleaseItem,
} from '../data/releaseNotes';

function TagBadge({ tag }: { tag: ReleaseItem['tag'] }): ReactElement {
  const colors = TAG_COLORS[tag];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.125rem 0.5rem',
        borderRadius: 'var(--radius-sm, 4px)',
        backgroundColor: colors.bg,
        color: colors.fg,
        fontSize: '0.6875rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      {TAG_LABELS[tag]}
    </span>
  );
}

function ReleaseCard({ release, isLatest }: { release: Release; isLatest: boolean }): ReactElement {
  return (
    <article
      style={{
        backgroundColor: 'var(--color-surface, white)',
        borderRadius: 'var(--radius-lg, 8px)',
        border: '1px solid var(--color-border, #e5e7eb)',
        padding: '1.5rem',
        marginBottom: '1.25rem',
        boxShadow: isLatest ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '0.75rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--color-border, #e5e7eb)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            v{release.version}
          </h2>
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {release.title}
          </span>
          {isLatest && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.125rem 0.5rem',
                backgroundColor: '#fff8e1',
                color: '#f57f17',
                borderRadius: 'var(--radius-sm, 4px)',
                fontSize: '0.6875rem',
                fontWeight: 600,
              }}
            >
              <Sparkles size={11} />
              最新
            </span>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: 'var(--text-secondary)',
            fontSize: '0.8125rem',
          }}
        >
          <Calendar size={14} />
          {release.date}
        </div>
      </header>

      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          lineHeight: 1.7,
          margin: '0 0 1rem 0',
        }}
      >
        {release.summary}
      </p>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.625rem',
        }}
      >
        {release.items.map((item, idx) => (
          <li
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.625rem',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              lineHeight: 1.6,
            }}
          >
            <span style={{ flexShrink: 0, marginTop: '0.125rem' }}>
              <TagBadge tag={item.tag} />
            </span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function ReleaseNotesPage(): ReactElement {
  return (
    <Layout headerTitle="リリースノート">
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}
          >
            <Sparkles size={22} style={{ color: 'var(--text-primary)' }} />
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              リリースノート
            </h1>
          </div>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              margin: 0,
              lineHeight: 1.7,
            }}
          >
            Scenario Lab の更新履歴です。新機能・改善・修正をリリース順に記載しています。
          </p>
        </div>

        {releases.map((release, idx) => (
          <ReleaseCard key={release.version} release={release} isLatest={idx === 0} />
        ))}

        <div
          style={{
            textAlign: 'center',
            color: 'var(--text-tertiary, #999)',
            fontSize: '0.75rem',
            marginTop: '2rem',
          }}
        >
          詳細な変更履歴は{' '}
          <a
            href="https://github.com/junmiya/scenario-lab/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)' }}
          >
            CHANGELOG.md
          </a>{' '}
          を参照してください。
        </div>
      </div>
    </Layout>
  );
}
