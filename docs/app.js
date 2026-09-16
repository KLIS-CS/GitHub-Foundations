const app = document.querySelector('#app');

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slug(value) {
  return encodeURIComponent(value);
}

function initials(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function badgeIcon(index) {
  return index === 0 ? '◉' : index === 1 ? '◆' : '★';
}

function nextBadge(skillKey, xp, rules) {
  const badges = rules.skills?.[skillKey]?.badges || [];
  return badges.find((badge) => xp < badge.xp) || null;
}

function maxThreshold(skillKey, rules) {
  const badges = rules.skills?.[skillKey]?.badges || [];
  return badges.length ? Math.max(...badges.map((badge) => Number(badge.xp))) : 1;
}

function studentStatus(student) {
  const verified = (student.verified_checkpoints || []).length;
  const progress = (student.in_progress_checkpoints || []).length;
  if (verified && progress) return { label: 'Active', className: 'active' };
  if (verified) return { label: 'Verified', className: 'verified' };
  if (progress) return { label: 'In progress', className: 'progressing' };
  return { label: 'Not started', className: 'not-started' };
}

function checkpointMap(student) {
  const map = new Map();
  (student.verified_checkpoints || []).forEach((cp) => map.set(cp.id, 'verified'));
  (student.in_progress_checkpoints || []).forEach((cp) => map.set(cp.id, 'progressing'));
  return map;
}

function checkpointTrack(student, checkpoints) {
  const states = checkpointMap(student);
  return `
    <div class="checkpoint-track" aria-label="Checkpoint progress">
      ${(checkpoints || []).map((cp) => {
        const state = states.get(cp.id) || 'not-started';
        const short = cp.id.toUpperCase();
        return `<span class="checkpoint-dot ${state}" title="${esc(cp.label)} · ${state === 'verified' ? 'Verified' : state === 'progressing' ? 'In progress' : 'Not started'}">${esc(short)}</span>`;
      }).join('')}
    </div>`;
}

function renderStudentList(data, rules) {
  if (!data.students?.length) {
    app.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◇</div>
        <strong>No student profiles yet</strong>
        <p>Profiles appear automatically when checkpoint evidence is detected or a student is added to the roster.</p>
      </div>`;
    return;
  }

  const totalBadges = data.students.reduce((sum, student) => sum + (student.badges || []).length, 0);
  const totalVerified = data.students.reduce((sum, student) => sum + (student.verified_checkpoints || []).length, 0);
  const active = data.students.filter((student) => {
    const status = studentStatus(student).className;
    return status === 'active' || status === 'verified' || status === 'progressing';
  }).length;

  app.innerHTML = `
    <section class="stats-grid" aria-label="Class overview">
      <div class="stat-card"><span>Students</span><strong>${data.students.length}</strong><small>developer profiles</small></div>
      <div class="stat-card"><span>Active</span><strong>${active}</strong><small>with checkpoint evidence</small></div>
      <div class="stat-card"><span>Verified</span><strong>${totalVerified}</strong><small>checkpoint completions</small></div>
      <div class="stat-card"><span>Badges</span><strong>${totalBadges}</strong><small>skills unlocked</small></div>
    </section>

    <section class="directory-panel">
      <div class="directory-head">
        <div>
          <p class="section-eyebrow">Student directory</p>
          <h2>Developer Profiles</h2>
          <p>Real names are linked to GitHub accounts through the class roster.</p>
        </div>
        <label class="search-box">
          <span>⌕</span>
          <input id="student-search" type="search" placeholder="Search name or GitHub account" autocomplete="off">
        </label>
      </div>

      <div class="grid" id="student-grid">
        ${data.students.map((student) => {
          const badges = (student.badges || []).slice(-3).reverse();
          const status = studentStatus(student);
          const displayName = student.name || student.github;
          const searchText = `${displayName} ${student.github}`.toLowerCase();
          return `
            <a class="student-card" href="#${slug(student.github)}" data-search="${esc(searchText)}">
              <div class="student-card-head">
                <div class="avatar">${esc(initials(displayName))}</div>
                <span class="status-pill ${status.className}"><i></i>${esc(status.label)}</span>
              </div>

              <div class="identity-block">
                <h3>${esc(displayName)}</h3>
                <p>@${esc(student.github)}</p>
                ${student.name_mapped ? '' : '<span class="identity-note">Roster name not linked yet</span>'}
              </div>

              ${checkpointTrack(student, data.checkpoints)}

              <div class="badge-shelf compact">
                ${badges.length
                  ? badges.map((badge) => `<span class="achievement-chip">${esc(badge.name)}</span>`).join('')
                  : '<span class="achievement-chip muted">First badge in progress</span>'}
              </div>

              <div class="student-card-footer">
                <div><strong>${Number(student.total_xp || 0)}</strong><span>XP</span></div>
                <div><strong>${(student.badges || []).length}</strong><span>Badges</span></div>
                <div><strong>${(student.verified_checkpoints || []).length}</strong><span>Verified</span></div>
                <span class="open-profile">View profile →</span>
              </div>
            </a>`;
        }).join('')}
      </div>
      <div class="no-results" id="no-results" hidden>No matching student profile.</div>
    </section>

    <p class="updated-note">Updated ${new Date(data.generated_at).toLocaleString()}</p>`;

  const search = document.querySelector('#student-search');
  const cards = [...document.querySelectorAll('.student-card')];
  const noResults = document.querySelector('#no-results');
  search?.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const match = !query || card.dataset.search.includes(query);
      card.hidden = !match;
      if (match) visible += 1;
    });
    noResults.hidden = visible !== 0;
  });
}

function renderProfile(student, data, rules) {
  const skillEntries = Object.entries(rules.skills || {});
  const badges = student.badges || [];
  const status = studentStatus(student);
  const displayName = student.name || student.github;

  const badgeHtml = badges.length
    ? badges.map((badge) => {
        const skillBadges = rules.skills?.[badge.skill]?.badges || [];
        const idx = Math.max(0, skillBadges.findIndex((b) => b.name === badge.name));
        return `
          <div class="badge-card tier-${idx + 1}">
            <div class="badge-symbol">${badgeIcon(idx)}</div>
            <div>
              <span>${esc(badge.skill_label)}</span>
              <strong>${esc(badge.name)}</strong>
            </div>
          </div>`;
      }).join('')
    : '<div class="badge-empty"><span>◇</span><div><strong>First badge in progress</strong><p>Verified checkpoint work will unlock achievements here.</p></div></div>';

  const skillsHtml = skillEntries.map(([key, definition]) => {
    const xp = Number(student.skills?.[key] || 0);
    const max = maxThreshold(key, rules);
    const pct = Math.max(0, Math.min(100, (xp / max) * 100));
    const next = nextBadge(key, xp, rules);
    const note = next ? `${next.xp - xp} XP to ${next.name}` : 'Top badge unlocked';
    return `
      <div class="skill-card skill-${esc(key)}">
        <div class="skill-head">
          <div>
            <span class="skill-name">${esc(definition.label)}</span>
            <small>${esc(note)}</small>
          </div>
          <strong>${xp}<span> XP</span></strong>
        </div>
        <div class="progress" role="progressbar" aria-label="${esc(definition.label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${xp}">
          <span style="width:${pct}%"></span>
        </div>
        <div class="milestone-row">
          ${(definition.badges || []).map((badge) => `<span class="${xp >= badge.xp ? 'reached' : ''}">${badge.xp}</span>`).join('')}
        </div>
      </div>`;
  }).join('');

  const states = checkpointMap(student);
  const evidenceHtml = (data.checkpoints || []).map((cp, index) => {
    const state = states.get(cp.id) || 'not-started';
    const label = state === 'verified' ? 'Verified' : state === 'progressing' ? 'In progress' : 'Not started';
    return `
      <div class="evidence-row ${state}">
        <div class="evidence-index">${index + 1}</div>
        <div class="evidence-copy">
          <strong>${esc(cp.id.toUpperCase())} · ${esc(cp.label)}</strong>
          <span>${esc(label)}</span>
        </div>
        <div class="evidence-mark">${state === 'verified' ? '✓' : state === 'progressing' ? '•' : '—'}</div>
      </div>`;
  }).join('');

  app.innerHTML = `
    <article class="profile-page">
      <a class="back-link" href="#">← All students</a>

      <section class="profile-hero">
        <div class="profile-avatar">${esc(initials(displayName))}</div>
        <div class="profile-identity">
          <p class="profile-kicker">KLIS-CS Developer Profile</p>
          <h2>${esc(displayName)}</h2>
          <div class="profile-meta-row">
            <a href="${esc(student.github_url || `https://github.com/${student.github}`)}" target="_blank" rel="noreferrer">@${esc(student.github)} ↗</a>
            <span class="status-pill ${status.className}"><i></i>${esc(status.label)}</span>
            ${student.name_mapped ? '<span class="roster-chip">Roster linked</span>' : '<span class="roster-chip pending">Name mapping pending</span>'}
          </div>
        </div>
        <div class="profile-score">
          <strong>${Number(student.total_xp || 0)}</strong>
          <span>verified XP</span>
        </div>
      </section>

      <div class="profile-layout">
        <div class="profile-main">
          <section class="profile-section">
            <div class="section-heading">
              <div><p class="section-eyebrow">Achievement shelf</p><h3>Badges</h3></div>
              <span>${badges.length} unlocked</span>
            </div>
            <div class="badge-grid">${badgeHtml}</div>
          </section>

          <section class="profile-section">
            <div class="section-heading">
              <div><p class="section-eyebrow">Competency profile</p><h3>Skills</h3></div>
              <span>Evidence-based XP</span>
            </div>
            <div class="skills-grid">${skillsHtml}</div>
          </section>
        </div>

        <aside class="profile-side">
          <section class="side-panel">
            <div class="section-heading compact-heading">
              <div><p class="section-eyebrow">Learning evidence</p><h3>Checkpoints</h3></div>
            </div>
            <div class="evidence-list">${evidenceHtml}</div>
          </section>

          <section class="side-panel profile-summary">
            <p class="section-eyebrow">Profile summary</p>
            <div><span>Verified checkpoints</span><strong>${(student.verified_checkpoints || []).length}/${(data.checkpoints || []).length}</strong></div>
            <div><span>Badges unlocked</span><strong>${badges.length}</strong></div>
            <div><span>Total verified XP</span><strong>${Number(student.total_xp || 0)}</strong></div>
          </section>
        </aside>
      </div>
    </article>`;
}

async function boot() {
  try {
    const [data, rules] = await Promise.all([loadJson('data.json'), loadJson('rules.json')]);
    const render = () => {
      const github = decodeURIComponent(location.hash.replace(/^#/, ''));
      if (!github) {
        renderStudentList(data, rules);
        return;
      }
      const student = data.students.find((item) => item.github.toLowerCase() === github.toLowerCase());
      if (!student) {
        location.hash = '';
        return;
      }
      renderProfile(student, data, rules);
    };
    window.addEventListener('hashchange', render);
    render();
  } catch (error) {
    app.innerHTML = `<div class="empty-state"><div class="empty-icon">!</div><strong>Dashboard data is not ready</strong><p>${esc(error.message)}</p></div>`;
  }
}

boot();
