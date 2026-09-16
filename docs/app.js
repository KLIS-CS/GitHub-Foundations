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

function badgeIcon(index) {
  return index === 0 ? '🥉' : index === 1 ? '🥈' : '🥇';
}

function nextBadge(skillKey, xp, rules) {
  const badges = rules.skills?.[skillKey]?.badges || [];
  return badges.find((badge) => xp < badge.xp) || null;
}

function maxThreshold(skillKey, rules) {
  const badges = rules.skills?.[skillKey]?.badges || [];
  return badges.length ? Math.max(...badges.map((badge) => Number(badge.xp))) : 1;
}

function renderStudentList(data) {
  if (!data.students?.length) {
    app.innerHTML = `
      <div class="empty">
        <strong>No student profiles yet.</strong>
        <p>Profiles appear automatically after a student has trusted checkpoint evidence, or after the student is added to the optional roster.</p>
      </div>`;
    return;
  }

  app.innerHTML = `
    <div class="summary-bar">
      <strong>${data.students.length}</strong> developer profile${data.students.length === 1 ? '' : 's'}
      <span>·</span>
      <span>Updated ${new Date(data.generated_at).toLocaleString()}</span>
    </div>
    <div class="grid">
      ${data.students.map((student) => {
        const badges = (student.badges || []).slice(-4).reverse();
        return `
          <a class="card" href="#${slug(student.github)}">
            <div class="card-top">
              <div>
                <h2>${esc(student.name)}</h2>
                <div class="github">@${esc(student.github)}</div>
              </div>
              <div class="profile-arrow">→</div>
            </div>
            <div class="badge-row">
              ${badges.length
                ? badges.map((badge) => `<span class="badge">🏅 ${esc(badge.name)}</span>`).join('')
                : '<span class="badge muted">Profile started</span>'}
            </div>
            <div class="card-meta">
              <span>${Number(student.total_xp || 0)} verified XP</span>
              <span>${(student.verified_checkpoints || []).length} verified checkpoints</span>
            </div>
          </a>`;
      }).join('')}
    </div>`;
}

function renderProfile(student, rules) {
  const skillEntries = Object.entries(rules.skills || {});
  const badges = student.badges || [];

  const badgeHtml = badges.length
    ? badges.map((badge) => {
        const skillBadges = rules.skills?.[badge.skill]?.badges || [];
        const idx = Math.max(0, skillBadges.findIndex((b) => b.name === badge.name));
        return `<span class="badge large">${badgeIcon(idx)} ${esc(badge.name)}</span>`;
      }).join('')
    : '<span class="badge muted">Profile started</span>';

  const skillsHtml = skillEntries.map(([key, definition]) => {
    const xp = Number(student.skills?.[key] || 0);
    const max = maxThreshold(key, rules);
    const pct = Math.max(0, Math.min(100, (xp / max) * 100));
    const next = nextBadge(key, xp, rules);
    const note = next ? `Next: ${esc(next.name)} · ${xp}/${next.xp} XP` : 'Highest current badge achieved';
    return `
      <div class="skill">
        <div class="skill-head">
          <span class="skill-name">${esc(definition.label)}</span>
          <span class="skill-xp">${xp} XP</span>
        </div>
        <div class="progress" role="progressbar" aria-label="${esc(definition.label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${xp}">
          <span style="width:${pct}%"></span>
        </div>
        <p class="next-note">${note}</p>
      </div>`;
  }).join('');

  const nextCards = skillEntries.map(([key, definition]) => {
    const xp = Number(student.skills?.[key] || 0);
    const next = nextBadge(key, xp, rules);
    if (!next) return '';
    return `
      <div class="next-card">
        <strong>🔒 ${esc(next.name)}</strong>
        <span>${xp} / ${next.xp} ${esc(definition.label)} XP</span>
      </div>`;
  }).filter(Boolean).join('');

  const verified = student.verified_checkpoints || [];
  const inProgress = student.in_progress_checkpoints || [];
  const evidenceHtml = [
    ...verified.map((cp) => `<div class="evidence-item verified"><span>✓ ${esc(cp.label)}</span><span>Verified</span></div>`),
    ...inProgress.map((cp) => `<div class="evidence-item"><span>${esc(cp.label)}</span><span>In progress</span></div>`),
  ].join('');

  app.innerHTML = `
    <article class="profile">
      <div class="profile-top">
        <div>
          <p class="profile-kicker">Developer Profile</p>
          <h2 class="profile-name">${esc(student.name)}</h2>
          <p class="profile-label">@${esc(student.github)}</p>
        </div>
        <div class="xp-total"><strong>${Number(student.total_xp || 0)}</strong><span>verified XP</span></div>
      </div>

      <h3 class="section-title">Achievements</h3>
      <div class="badge-row">${badgeHtml}</div>

      <h3 class="section-title">Skills</h3>
      <div class="skill-list">${skillsHtml}</div>

      <h3 class="section-title">Next achievements</h3>
      <div class="next-grid">${nextCards || '<div class="next-card"><strong>All current badge levels achieved.</strong></div>'}</div>

      <h3 class="section-title">Verified checkpoint evidence</h3>
      <div class="evidence-list">${evidenceHtml || '<div class="empty small">No verified checkpoint evidence yet.</div>'}</div>
    </article>`;
}

async function boot() {
  try {
    const [data, rules] = await Promise.all([loadJson('data.json'), loadJson('rules.json')]);
    const render = () => {
      const github = decodeURIComponent(location.hash.replace(/^#/, ''));
      if (!github) {
        renderStudentList(data);
        return;
      }
      const student = data.students.find((item) => item.github.toLowerCase() === github.toLowerCase());
      if (!student) {
        location.hash = '';
        return;
      }
      renderProfile(student, rules);
    };
    window.addEventListener('hashchange', render);
    render();
  } catch (error) {
    app.innerHTML = `<div class="empty"><strong>Dashboard data is not ready.</strong><p>${esc(error.message)}</p></div>`;
  }
}

boot();
