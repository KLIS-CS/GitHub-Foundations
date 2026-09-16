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

function renderProfile(student, data, rules) {
  const skillEntries = Object.entries(rules.skills || {});
  const badges = student.badges || [];
  const status = studentStatus(student);
  const displayName = student.name || student.github;
  const states = checkpointMap(student);

  document.title = `${displayName} · KLIS-CS Developer Profile`;

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
    <article class="profile-page family-profile">
      <section class="profile-hero">
        <div class="profile-avatar">${esc(initials(displayName))}</div>
        <div class="profile-identity">
          <p class="profile-kicker">Verified Student Developer Profile</p>
          <h2>${esc(displayName)}</h2>
          <div class="profile-meta-row">
            <a href="${esc(student.github_url || `https://github.com/${student.github}`)}" target="_blank" rel="noreferrer">@${esc(student.github)} ↗</a>
            <span class="status-pill ${status.className}"><i></i>${esc(status.label)}</span>
            ${student.name_mapped ? '<span class="roster-chip">Identity linked</span>' : '<span class="roster-chip pending">Name mapping pending</span>'}
          </div>
        </div>
        <div class="profile-score">
          <strong>${Number(student.total_xp || 0)}</strong>
          <span>verified XP</span>
        </div>
      </section>

      <section class="family-note">
        <div>
          <strong>What this profile shows</strong>
          <p>Achievements are generated from verified GitHub learning evidence such as completed checkpoints and professional development workflows. Formal course grades are not shown here.</p>
        </div>
        <button class="share-button" id="share-profile" type="button">Copy family link</button>
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
            <p class="section-eyebrow">At a glance</p>
            <div><span>Verified checkpoints</span><strong>${(student.verified_checkpoints || []).length}/${(data.checkpoints || []).length}</strong></div>
            <div><span>Badges unlocked</span><strong>${badges.length}</strong></div>
            <div><span>Total verified XP</span><strong>${Number(student.total_xp || 0)}</strong></div>
          </section>
        </aside>
      </div>
    </article>`;

  document.querySelector('#share-profile')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(location.href);
      button.textContent = 'Link copied';
      setTimeout(() => { button.textContent = 'Copy family link'; }, 1800);
    } catch {
      window.prompt('Copy this family profile link:', location.href);
    }
  });
}

async function boot() {
  try {
    const params = new URLSearchParams(location.search);
    const github = (params.get('student') || '').trim();
    if (!github) {
      app.innerHTML = '<div class="empty-state"><div class="empty-icon">◇</div><strong>No student selected</strong><p>Open this page with a student profile link from the KLIS-CS dashboard.</p></div>';
      return;
    }

    const [data, rules] = await Promise.all([loadJson('data.json'), loadJson('rules.json')]);
    const student = data.students.find((item) => item.github.toLowerCase() === github.toLowerCase());
    if (!student) {
      app.innerHTML = '<div class="empty-state"><div class="empty-icon">!</div><strong>Student profile not found</strong><p>This account may not be linked to the class roster yet.</p></div>';
      return;
    }

    renderProfile(student, data, rules);
  } catch (error) {
    app.innerHTML = `<div class="empty-state"><div class="empty-icon">!</div><strong>Profile data is not ready</strong><p>${esc(error.message)}</p></div>`;
  }
}

boot();
