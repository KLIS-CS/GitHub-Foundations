(() => {
  const MANUAL_KEY = 'klis-dashboard-language';
  const AUTO_KEY = 'klis-dashboard-auto-language';
  const supported = new Set(['en', 'zh']);
  let language = 'en';

  const exactZh = new Map(Object.entries({
    'KLIS-CS · Developer Growth': 'KLIS-CS · 开发者成长',
    'Verified learning.': '真实学习有据可查。',
    'Visible growth.': '成长清晰可见。',
    'Real GitHub work becomes verified checkpoint evidence, skill XP, badges, and a developer profile that students and families can understand at a glance.': '学生在 GitHub 上的真实学习成果会转化为经过验证的关卡证据、技能 XP、徽章和开发者档案，让学生和家长一目了然地看到成长。',
    'Student directory': '学生目录',
    'Loading developer profiles…': '正在加载开发者档案…',
    'KLIS-CS Developer Achievement Dashboard · Achievements reflect verified learning evidence. Formal grades are kept separate.': 'KLIS-CS 开发者成就仪表盘 · 成就基于已验证的学习证据，正式课程成绩与本页面分开记录。',
    'Students': '学生人数',
    'developer profiles': '开发者档案',
    'Active': '活跃',
    'with checkpoint evidence': '有关卡学习证据',
    'Verified': '已验证',
    'checkpoint completions': '已完成关卡',
    'Badges': '徽章',
    'skills unlocked': '已解锁技能',
    'Developer Profiles': '开发者档案',
    'Real names are linked to GitHub accounts through the class roster.': '学生姓名通过班级名单与 GitHub 账号进行关联。',
    'Roster name not linked yet': '尚未关联学生姓名',
    'First badge in progress': '首枚徽章解锁中',
    'View profile →': '查看档案 →',
    'No matching student profile.': '没有找到匹配的学生档案。',
    'No student profiles yet': '暂时没有学生档案',
    'Profiles appear automatically when checkpoint evidence is detected or a student is added to the roster.': '检测到关卡学习证据或将学生加入班级名单后，档案会自动出现。',
    'In progress': '进行中',
    'Not started': '未开始',
    'KLIS-CS Developer Profile': 'KLIS-CS 开发者档案',
    'Roster linked': '名单已关联',
    'Name mapping pending': '姓名映射待完成',
    'verified XP': '已验证 XP',
    'Achievement shelf': '成就徽章墙',
    'Competency profile': '能力档案',
    'Skills': '技能',
    'Evidence-based XP': '基于证据的 XP',
    'Learning evidence': '学习证据',
    'Checkpoints': '学习关卡',
    'Profile summary': '档案概览',
    'Verified checkpoints': '已验证关卡',
    'Badges unlocked': '已解锁徽章',
    'Total verified XP': '已验证 XP 总计',
    'All students': '全部学生',
    'Top badge unlocked': '最高级徽章已解锁',
    'Verified checkpoint work will unlock achievements here.': '完成经过验证的关卡任务后，会在这里解锁成就。',

    'KLIS-CS · Verified Developer Growth': 'KLIS-CS · 已验证的开发者成长',
    'Student Developer Profile': '学生开发者档案',
    'A parent-friendly view of verified GitHub learning evidence, skill growth, and badges.': '面向家长的简明视图：展示经过验证的 GitHub 学习证据、技能成长和徽章。',
    'Class dashboard': '班级仪表盘',
    'Loading student profile…': '正在加载学生档案…',
    'Achievements reflect verified learning evidence. Formal grades are kept separate from this profile.': '成就反映经过验证的学习证据；正式课程成绩与本档案分开记录。',
    'Verified Student Developer Profile': '已验证的学生开发者档案',
    'Identity linked': '身份已关联',
    'What this profile shows': '这份档案展示什么',
    'Achievements are generated from verified GitHub learning evidence such as completed checkpoints and professional development workflows. Formal course grades are not shown here.': '本档案中的成就来自经过验证的 GitHub 学习证据，例如已完成的学习关卡和规范的软件开发流程。这里不显示正式课程成绩。',
    'Copy family link': '复制家长链接',
    'Link copied': '链接已复制',
    'At a glance': '概览',
    'No student selected': '未选择学生',
    'Open this page with a student profile link from the KLIS-CS dashboard.': '请从 KLIS-CS 班级仪表盘打开某位学生的档案链接。',
    'Student profile not found': '未找到学生档案',
    'This account may not be linked to the class roster yet.': '该账号可能尚未与班级名单关联。',
    'Profile data is not ready': '档案数据尚未准备好',
    'Dashboard data is not ready': '仪表盘数据尚未准备好',

    'Git Workflow': 'Git 工作流',
    'JavaScript': 'JavaScript',
    'Testing': '测试',
    'Debugging': '调试',
    'HCI / UI': 'HCI / UI',
    'Collaboration': '协作',

    'Git Explorer': 'Git 探索者',
    'Git Workflow Pro': 'Git 工作流达人',
    'Repository Master': '仓库大师',
    'JS Starter': 'JS 入门者',
    'JavaScript Builder': 'JavaScript 构建者',
    'JS Developer': 'JS 开发者',
    'Test Starter': '测试入门者',
    'Test Engineer': '测试工程师',
    'Quality Engineer': '质量工程师',
    'Bug Hunter': 'Bug 猎手',
    'Debugger': '调试者',
    'Debugging Specialist': '调试专家',
    'UI Explorer': 'UI 探索者',
    'UI Designer': 'UI 设计师',
    'Product Designer': '产品设计师',
    'Contributor': '贡献者',
    'Code Reviewer': '代码审查员',
    'Team Developer': '团队开发者',

    'Repository Setup': '仓库设置',
    'Feature Branch & Pull Request': '功能分支与 Pull Request',
    'Feature Branch & Pull Request Workflow': '功能分支与 Pull Request 工作流'
  }));

  const textOriginals = new WeakMap();
  const attrOriginals = new WeakMap();

  function zh(text) {
    if (!text) return text;
    if (exactZh.has(text)) return exactZh.get(text);

    let match = text.match(/^(\d+) XP to (.+)$/);
    if (match) return `还需 ${match[1]} XP 解锁${zh(match[2])}`;

    match = text.match(/^(\d+) unlocked$/);
    if (match) return `已解锁 ${match[1]} 个`;

    match = text.match(/^Updated (.+)$/);
    if (match) return `更新时间：${match[1]}`;

    match = text.match(/^(CP\d+)\s*·\s*(.+)$/i);
    if (match) return `${match[1].toUpperCase()} · ${zh(match[2])}`;

    match = text.match(/^(.+)\s*·\s*(Verified|In progress|Not started)$/);
    if (match) return `${zh(match[1])} · ${zh(match[2])}`;

    match = text.match(/^(.+) · KLIS-CS Developer Profile$/);
    if (match) return `${match[1]} · KLIS-CS 开发者档案`;

    return text;
  }

  function translateText(text) {
    return language === 'zh' ? zh(text) : text;
  }

  function translateTextNode(node) {
    if (!textOriginals.has(node)) textOriginals.set(node, node.nodeValue || '');
    const original = textOriginals.get(node);
    const match = original.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match) return;
    const next = `${match[1]}${translateText(match[2])}${match[3]}`;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function attributeStore(element) {
    if (!attrOriginals.has(element)) attrOriginals.set(element, new Map());
    return attrOriginals.get(element);
  }

  function translateAttribute(element, name) {
    if (!element.hasAttribute(name)) return;
    const store = attributeStore(element);
    if (!store.has(name)) store.set(name, element.getAttribute(name) || '');
    const original = store.get(name);
    const next = translateText(original);
    if (element.getAttribute(name) !== next) element.setAttribute(name, next);
  }

  function translateTree(root = document.documentElement) {
    if (!root) return;

    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }

    if (root.nodeType === Node.ELEMENT_NODE) {
      ['placeholder', 'title', 'aria-label'].forEach((name) => translateAttribute(root, name));
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);

    if (root.querySelectorAll) {
      root.querySelectorAll('[placeholder], [title], [aria-label]').forEach((element) => {
        ['placeholder', 'title', 'aria-label'].forEach((name) => translateAttribute(element, name));
      });
    }
  }

  function updateLanguageControls() {
    document.querySelectorAll('[data-set-language]').forEach((button) => {
      const selected = button.dataset.setLanguage === language;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function applyLanguage() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    translateTree(document.documentElement);
    updateLanguageControls();
  }

  function setLanguage(next, { manual = true } = {}) {
    if (!supported.has(next)) return;
    language = next;
    if (manual) {
      try { localStorage.setItem(MANUAL_KEY, next); } catch {}
    }
    applyLanguage();
    window.dispatchEvent(new CustomEvent('klis-language-change', { detail: { language } }));
  }

  async function detectLanguage() {
    try {
      const manual = localStorage.getItem(MANUAL_KEY);
      if (supported.has(manual)) return manual;
    } catch {}

    try {
      const cached = sessionStorage.getItem(AUTO_KEY);
      if (supported.has(cached)) return cached;
    } catch {}

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch('https://ipapi.co/country/', {
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Country lookup failed');
      const country = (await response.text()).trim().toUpperCase();
      const detected = country === 'CN' ? 'zh' : 'en';
      try { sessionStorage.setItem(AUTO_KEY, detected); } catch {}
      return detected;
    } catch {
      return 'en';
    } finally {
      clearTimeout(timeout);
    }
  }

  function installControls() {
    document.querySelectorAll('[data-set-language]').forEach((button) => {
      if (button.dataset.i18nBound === 'true') return;
      button.dataset.i18nBound = 'true';
      button.addEventListener('click', () => setLanguage(button.dataset.setLanguage, { manual: true }));
    });
    updateLanguageControls();
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => translateTree(node));
      if (mutation.type === 'attributes' && mutation.target instanceof Element) {
        ['placeholder', 'title', 'aria-label'].forEach((name) => translateAttribute(mutation.target, name));
      }
    });
    installControls();
  });

  async function init() {
    language = await detectLanguage();
    applyLanguage();
    installControls();
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label']
    });
    return language;
  }

  window.KLISI18n = {
    init,
    setLanguage,
    getLanguage: () => language,
    translate: translateText,
    applyLanguage,
    installControls
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
