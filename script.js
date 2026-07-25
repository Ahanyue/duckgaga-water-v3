(() => {
  const cards = Array.from(document.querySelectorAll('.story-card'));
  const tabs = Array.from(document.querySelectorAll('.chapter-tab'));
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const currentTitleEl = document.getElementById('currentTitle');
  const currentHintEl = document.getElementById('currentHint');
  const progressFillEl = document.getElementById('progressFill');
  const deckShell = document.querySelector('.deck-shell');
  const cardsRoot = document.getElementById('cards');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  let current = 0;
  let suppressClickUntil = 0;
  let dragState = null;

  const hints = [
    '一封来自小鸭嘎嘎公益组织的信',
    '为什么反复讲：不是远离水，是学会安全亲水。',
    '教孩子六不准：把安全规则讲成清楚、可执行的边界。',
    '第一条约定：想去水边，先和大人说。',
    '会游泳也需要大人在场。',
    '分清哪些水域可以去，哪些地方要绕开。',
    '不熟悉的水，不靠近，也别试探。',
    '发现有人落水，先叫大人和报警。',
    '和孩子一起复习，也欢迎分享给其他家长。',
  ];

  const resetHorizontalScroll = () => {
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    if (window.scrollX !== 0) window.scrollTo(0, window.scrollY);
  };

  const nearestChapter = (index) => {
    let winner = tabs[0];
    tabs.forEach((tab) => {
      if (Number(tab.dataset.jump) <= index) winner = tab;
    });
    return winner;
  };

  const setCard = (index) => {
    current = (index + cards.length) % cards.length;
    cardsRoot?.style.setProperty('--drag-x', '0px');
    cardsRoot?.style.setProperty('--drag-rot', '0deg');
    cardsRoot?.classList.remove('is-dragging', 'is-swipe-left', 'is-swipe-right');
    cards.forEach((card, i) => {
      card.classList.remove('is-active', 'is-prev', 'is-next', 'is-far', 'is-left-far');
      if (i === current) card.classList.add('is-active');
      else if (i === (current - 1 + cards.length) % cards.length) card.classList.add('is-prev');
      else if (i === (current + 1) % cards.length) card.classList.add('is-next');
      else if (i < current) card.classList.add('is-far', 'is-left-far');
      else card.classList.add('is-far');
    });

    deckShell?.classList.toggle('is-first-card', current === 0);
    tabs.forEach((tab) => tab.classList.toggle('is-active', tab === nearestChapter(current)));
    if (currentTitleEl) currentTitleEl.textContent = cards[current]?.dataset.title || '';
    if (currentHintEl) currentHintEl.textContent = hints[current] || '继续翻下一张。';
    if (progressFillEl) progressFillEl.style.transform = `scaleX(${(current + 1) / cards.length})`;
    history.replaceState(null, '', `#card-${current}`);
    requestAnimationFrame(resetHorizontalScroll);
    window.setTimeout(resetHorizontalScroll, 80);
    window.setTimeout(resetHorizontalScroll, 240);
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setCard(Number(tab.dataset.jump) || 0));
  });

  document.querySelectorAll('[data-next]').forEach((btn) => {
    btn.addEventListener('click', () => setCard(current + 1));
  });

  prevBtn?.addEventListener('click', () => setCard(current - 1));
  nextBtn?.addEventListener('click', () => setCard(current + 1));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') setCard(current + 1);
    if (event.key === 'ArrowLeft') setCard(current - 1);
  });

  cardsRoot?.addEventListener('click', (event) => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const preview = event.target.closest('.story-card.is-prev, .story-card.is-next');
    if (!preview) return;
    const index = cards.indexOf(preview);
    if (index !== -1) setCard(index);
  }, true);

  const resetDrag = () => {
    dragState = null;
    cardsRoot?.style.setProperty('--drag-x', '0px');
    cardsRoot?.style.setProperty('--drag-rot', '0deg');
    cardsRoot?.classList.remove('is-dragging', 'is-swipe-left', 'is-swipe-right');
  };

  cardsRoot?.addEventListener('pointerdown', (event) => {
    if (!isCoarsePointer && event.pointerType !== 'touch') return;
    if (event.target.closest('input')) return;
    dragState = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0,
      locked: null,
      startedAt: performance.now(),
    };
    cardsRoot.setPointerCapture?.(event.pointerId);
    cardsRoot.classList.add('is-dragging');
  });

  cardsRoot?.addEventListener('pointermove', (event) => {
    if (!dragState || event.pointerId !== dragState.id) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (!dragState.locked && Math.hypot(dx, dy) > 8) {
      dragState.locked = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'x' : 'y';
    }
    if (dragState.locked !== 'x') return;
    event.preventDefault();
    const limited = Math.max(-118, Math.min(118, dx));
    dragState.x = dx;
    dragState.y = dy;
    cardsRoot.style.setProperty('--drag-x', `${limited}px`);
    cardsRoot.style.setProperty('--drag-rot', `${limited * 0.025}deg`);
    cardsRoot.classList.toggle('is-swipe-left', limited < -42);
    cardsRoot.classList.toggle('is-swipe-right', limited > 42);
  });

  const finishDrag = (event) => {
    if (!dragState || event.pointerId !== dragState.id) return;
    const elapsed = Math.max(1, performance.now() - dragState.startedAt);
    const velocity = dragState.x / elapsed;
    const shouldFlip = dragState.locked === 'x' && (Math.abs(dragState.x) > 72 || Math.abs(velocity) > 0.55);
    const shouldSuppressClick = dragState.locked === 'x' && Math.abs(dragState.x) > 12;
    const direction = dragState.x < 0 ? 1 : -1;
    resetDrag();
    if (shouldSuppressClick) suppressClickUntil = performance.now() + 450;
    if (shouldFlip) {
      setCard(current + direction);
    }
  };

  cardsRoot?.addEventListener('pointerup', finishDrag);
  cardsRoot?.addEventListener('pointercancel', finishDrag);

  const createConfettiBurst = (target, total = 26) => {
    if (prefersReduced || !target) return;
    const rect = target.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    const colors = ['#f5e400', '#ff8fa8', '#6ec9f5', '#7fdbb5', '#fffdf2'];
    for (let index = 0; index < total; index += 1) {
      const piece = document.createElement('span');
      piece.className = 'promise-confetti';
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.85;
      const distance = 56 + Math.random() * 104;
      piece.style.left = `${originX}px`;
      piece.style.top = `${originY}px`;
      piece.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      piece.style.setProperty('--dy', `${Math.sin(angle) * distance + Math.random() * 34}px`);
      piece.style.setProperty('--rot', `${Math.random() * 520 - 260}deg`);
      piece.style.setProperty('--confetti-color', colors[index % colors.length]);
      piece.style.animationDelay = `${Math.random() * 90}ms`;
      document.body.appendChild(piece);
      window.setTimeout(() => piece.remove(), 1100);
    }
  };

  // ---- 六个约定：点亮徽章 ----
  const promiseChips = Array.from(document.querySelectorAll('.promise-chip'));
  const promiseCount = document.getElementById('promiseCount');
  const promiseProgress = promiseCount?.closest('.promise-progress');
  let previousPromiseCount = 0;
  const celebratePromises = () => {
    createConfettiBurst(promiseProgress, 26);
  };
  const updatePromiseCount = () => {
    const count = document.querySelectorAll('.promise-chip.is-lit').length;
    if (promiseCount) promiseCount.textContent = String(count);
    promiseProgress?.classList.toggle('is-complete', count === promiseChips.length);
    if (count === promiseChips.length && previousPromiseCount < promiseChips.length) {
      celebratePromises();
    }
    previousPromiseCount = count;
  };
  promiseChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('is-lit');
      updatePromiseCount();
    });
  });

  // ---- 复习清单：完成后点亮资料按钮 ----
  const repeatChecks = Array.from(document.querySelectorAll('.repeat-list input[type="checkbox"]'));
  const printLink = document.getElementById('printLink');
  let wasRepeatComplete = false;
  const updateRepeatComplete = () => {
    const isComplete = repeatChecks.length > 0 && repeatChecks.every((item) => item.checked);
    printLink?.classList.toggle('is-ready', isComplete);
    if (isComplete && !wasRepeatComplete) {
      createConfettiBurst(printLink, 30);
    }
    wasRepeatComplete = isComplete;
  };
  repeatChecks.forEach((item) => {
    item.addEventListener('change', updateRepeatComplete);
  });
  updateRepeatComplete();

  // ---- 卡片小互动 ----
  document.querySelectorAll('[data-effect]').forEach((button) => {
    button.addEventListener('click', () => {
      const visual = button.closest('.card-content')?.querySelector('.interactive-visual');
      if (!visual) return;
      const effect = button.dataset.effect;
      if (effect === 'circle') {
        visual.classList.toggle('is-circled');
        button.textContent = visual.classList.contains('is-circled') ? '陪伴圈已打开 ✓' : '打开陪伴圈';
      }
      if (effect === 'watch') {
        visual.classList.toggle('is-watched');
        button.textContent = visual.classList.contains('is-watched') ? '看护视线已点亮 ✓' : '点亮看护视线';
      }
      if (effect === 'reveal') {
        visual.classList.toggle('is-revealed');
        button.textContent = visual.classList.contains('is-revealed') ? '已经看见风险 ✓' : '看看水面下面';
      }
    });
  });

  // ---- 救援步骤：依次点亮 ----
  const rescueTokens = Array.from(document.querySelectorAll('.rescue-token'));
  const rescueTip = document.getElementById('rescueTip');
  rescueTokens.forEach((token, index) => {
    token.addEventListener('click', () => {
      const litBefore = rescueTokens.slice(0, index).every((item) => item.classList.contains('is-lit'));
      if (!litBefore) {
        token.animate?.([
          { transform: 'translateX(0)' },
          { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' },
          { transform: 'translateX(0)' },
        ], { duration: 220 });
        if (rescueTip) rescueTip.textContent = '按顺序来：先叫大人，再打 110。';
        return;
      }
      token.classList.add('is-lit');
      const count = rescueTokens.filter((item) => item.classList.contains('is-lit')).length;
      if (rescueTip) {
        rescueTip.textContent = count === rescueTokens.length
          ? '完成！记住：孩子不下水施救，先让专业的大人来帮忙。'
          : `已完成 ${count} / 4，继续点亮下一步。`;
      }
    });
  });

  // ---- 分享 ----
  const shareBtn = document.getElementById('shareBtn');
  shareBtn?.addEventListener('click', async () => {
    const shareData = {
      title: '和孩子说清水边安全 | 小鸭嘎嘎公益',
      text: '给家长的一份防溺水陪讲指南：把防溺水“六不”变成孩子记得住的安全约定。',
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (error) {
      // 用户取消分享时不打扰
    }
    try {
      await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      const old = shareBtn.textContent;
      shareBtn.textContent = '已复制分享文案 ✓';
      window.setTimeout(() => { shareBtn.textContent = old; }, 1800);
    } catch (error) {
      shareBtn.textContent = '可截图分享给家长';
    }
  });

  // ---- 小鸭 cursor 与点击水波 ----
  const cursor = document.querySelector('.duck-cursor');
  const dot = document.querySelector('.cursor-dot');
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let duckX = mouseX;
  let duckY = mouseY;
  let lastTrail = 0;
  let touchCursorActive = false;
  let hideTouchCursorTimer = null;

  const popTrail = (x, y) => {
    if (prefersReduced) return;
    const now = performance.now();
    if (now - lastTrail < 90) return;
    lastTrail = now;
    const pop = document.createElement('span');
    pop.className = 'trail-pop';
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
    document.body.appendChild(pop);
    window.setTimeout(() => pop.remove(), 700);
  };

  if (!prefersReduced && cursor && dot) {
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (hasFinePointer) document.body.classList.add('has-duck-cursor');

    const revealCursor = () => {
      if (hideTouchCursorTimer) {
        window.clearTimeout(hideTouchCursorTimer);
        hideTouchCursorTimer = null;
      }
      document.body.classList.add('cursor-ready');
    };

    const hideTouchCursor = () => {
      touchCursorActive = false;
      document.body.classList.remove('cursor-hover');
      hideTouchCursorTimer = window.setTimeout(() => {
        if (!hasFinePointer && !touchCursorActive) {
          document.body.classList.remove('cursor-ready');
        }
      }, 520);
    };

    const setCursorCoordinates = (x, y, immediate = false) => {
      mouseX = x;
      mouseY = y;
      if (immediate) {
        duckX = mouseX;
        duckY = mouseY;
      }
    };

    const setCursorPosition = (event, immediate = false) => {
      setCursorCoordinates(event.clientX, event.clientY, immediate);
    };

    const getTouchPoint = (event) => event.touches?.[0] || event.changedTouches?.[0];

    const moveCursor = () => {
      duckX += (mouseX - duckX) * 0.16;
      duckY += (mouseY - duckY) * 0.16;
      const duckOffsetY = touchCursorActive ? 58 : 22;
      cursor.style.transform = `translate3d(${duckX - 22}px, ${duckY - duckOffsetY}px, 0) rotate(${Math.sin(duckX / 80) * 5}deg)`;
      dot.style.transform = `translate3d(${mouseX - 5}px, ${mouseY - 5}px, 0)`;
      requestAnimationFrame(moveCursor);
    };
    requestAnimationFrame(moveCursor);

    window.addEventListener('pointermove', (event) => {
      setCursorPosition(event);
      if (hasFinePointer || event.pointerType === 'touch' || event.pointerType === 'pen') {
        revealCursor();
      }
      popTrail(mouseX, mouseY);
    });

    window.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        touchCursorActive = true;
        setCursorPosition(event, true);
        revealCursor();
        popTrail(mouseX, mouseY);
      }
    }, { passive: true });

    window.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') hideTouchCursor();
    }, { passive: true });

    window.addEventListener('pointercancel', (event) => {
      if (event.pointerType === 'touch' || event.pointerType === 'pen') hideTouchCursor();
    }, { passive: true });

    window.addEventListener('touchstart', (event) => {
      const point = getTouchPoint(event);
      if (!point) return;
      touchCursorActive = true;
      setCursorCoordinates(point.clientX, point.clientY, true);
      revealCursor();
      popTrail(mouseX, mouseY);
    }, { passive: true });

    window.addEventListener('touchmove', (event) => {
      const point = getTouchPoint(event);
      if (!point) return;
      touchCursorActive = true;
      setCursorCoordinates(point.clientX, point.clientY);
      revealCursor();
      popTrail(mouseX, mouseY);
    }, { passive: true });

    window.addEventListener('touchend', hideTouchCursor, { passive: true });
    window.addEventListener('touchcancel', hideTouchCursor, { passive: true });

    document.addEventListener('pointerover', (event) => {
      if (event.target.closest('button, a, label, .story-card.is-prev, .story-card.is-next')) {
        document.body.classList.add('cursor-hover');
      }
    });
    document.addEventListener('pointerout', (event) => {
      if (event.target.closest('button, a, label, .story-card.is-prev, .story-card.is-next')) {
        document.body.classList.remove('cursor-hover');
      }
    });
  }

  document.addEventListener('pointerdown', (event) => {
    popTrail(event.clientX, event.clientY);
  });

  window.addEventListener('hashchange', () => {
    const indexFromHash = Number((window.location.hash.match(/card-(\d+)/) || [])[1]);
    if (Number.isFinite(indexFromHash)) setCard(indexFromHash);
  });

  const startFromHash = Number((window.location.hash.match(/card-(\d+)/) || [])[1]);
  setCard(Number.isFinite(startFromHash) ? startFromHash : 0);
})();
