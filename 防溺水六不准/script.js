(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const yearEl = document.getElementById('copyright-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- 滚动触发 + 错落节奏（同组内每个元素间隔 30ms，封顶避免拖沓）----
  const groups = [
    document.querySelectorAll('#parents .parent-card'),
    document.querySelectorAll('#rules .rule-card'),
    document.querySelectorAll('.rescue-step'),
    document.querySelectorAll('#emergency .call-tile'),
  ];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

  groups.forEach((group) => {
    group.forEach((el, i) => {
      if (!prefersReduced) el.style.transitionDelay = `${Math.min(i * 30, 240)}ms`;
      observer.observe(el);
    });
  });

  document.querySelectorAll('.reveal:not(.rule-card):not(.rescue-step)').forEach((el) => observer.observe(el));
  document.querySelectorAll('.reveal-left, .reveal-right').forEach((el) => observer.observe(el));

  // ---- 关于我们：数字滚动计数 ----
  const countEls = document.querySelectorAll('.count-up');
  if (countEls.length) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        countObserver.unobserve(el);
        const target = Number(el.dataset.count) || 0;
        if (prefersReduced) { el.textContent = target; return; }
        const duration = 900;
        const start = performance.now();
        const step = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target);
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    countEls.forEach((el) => countObserver.observe(el));
  }

  // ---- 六不准卡片：点击 / 键盘展开详情 + 打勾进度 ----
  const ruleCards = document.querySelectorAll('.rule-card');
  const progressFill = document.getElementById('rule-progress-fill');
  const progressLabel = document.getElementById('rule-progress-label');

  const updateProgress = () => {
    const total = ruleCards.length;
    const done = document.querySelectorAll('.rule-card.is-done').length;
    if (progressFill) progressFill.style.width = `${(done / total) * 100}%`;
    if (progressLabel) progressLabel.textContent = `已聊 ${done} / ${total}`;
  };

  ruleCards.forEach((card) => {
    const toggle = () => {
      const isOpen = card.classList.toggle('is-open');
      card.setAttribute('aria-expanded', String(isOpen));
      const label = card.querySelector('.rule-card__toggle');
      if (label) label.textContent = isOpen ? '收起 −' : '点开，看看怎么讲 +';
      if (isOpen && !card.classList.contains('is-done')) {
        card.classList.add('is-done');
        updateProgress();
      }
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });

  // ---- 关于我们：分享按钮 ----
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: '小鸭爱漂流，也要安全到岸 | 小鸭嘎嘎公益',
        text: '写给家长的防溺水六个安全约定：不是不让孩子亲近水，是让孩子安全地靠近水。',
        url: window.location.href,
      };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
          return;
        }
      } catch (err) {
        // 用户取消分享或不支持，走剪贴板兜底
      }
      try {
        await navigator.clipboard.writeText(shareData.url);
        const original = shareBtn.textContent;
        shareBtn.textContent = '已复制链接 ✓';
        setTimeout(() => { shareBtn.textContent = original; }, 1800);
      } catch (err) {
        // 剪贴板也不可用时静默失败，不影响核心功能
      }
    });
  }
})();
