/**
 * DungeonGame — Progression engine, encrypted stage loader, save state, and UI orchestration.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'blackhollow_dungeon_save_v1';

  const state = {
    rawRooms: [],
    unlockedRooms: [],
    unlockedIndex: 0,
    viewingIndex: 0,
    keys: {}, // keys[i] = solution from room i-1 that decrypted room i
    startTime: Date.now(),
    completedAt: null,
    attempts: 0,
    hintsOpened: {}, // { [roomIndex]: count }
    activeWidget: null,
    isChecking: false,
    resetConfirmPending: false,
  };

  const dom = {};

  function cacheDom() {
    dom.title = document.getElementById('dungeon-title');
    dom.subtitle = document.getElementById('dungeon-subtitle');
    dom.trail = document.getElementById('chamber-trail');
    dom.stage = document.getElementById('chamber-stage');
    dom.chronicleBtn = document.getElementById('btn-chronicle');
    dom.chronicleBackdrop = document.getElementById('chronicle-backdrop');
    dom.chronicleCloseBtn = document.getElementById('btn-close-chronicle');
    dom.chronicleEntries = document.getElementById('chronicle-entries');
    dom.audioBtn = document.getElementById('btn-audio');
    dom.resetBtn = document.getElementById('btn-reset');
    dom.cryptoWarning = document.getElementById('crypto-warning');
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_e) {
      return null;
    }
  }

  function persistSave() {
    try {
      const payload = {
        unlockedIndex: state.unlockedIndex,
        keys: state.keys,
        startTime: state.startTime,
        completedAt: state.completedAt,
        attempts: state.attempts,
        hintsOpened: state.hintsOpened,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_e) {
      // Ignore storage quota errors
    }
  }

  function formatDuration(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
    }
    return `${mins}m ${String(secs).padStart(2, '0')}s`;
  }

  function renderTrail() {
    dom.trail.innerHTML = '';
    state.rawRooms.forEach((rawRoom, idx) => {
      const isUnlocked = idx <= state.unlockedIndex;
      const isCurrent = idx === state.viewingIndex;
      const isSolved = idx < state.unlockedIndex;
      const isVictoryNode = idx === state.rawRooms.length - 1;

      const stepBtn = document.createElement('button');
      stepBtn.type = 'button';
      stepBtn.className = 'trail-node';
      if (isCurrent) stepBtn.classList.add('is-active');
      if (isSolved) stepBtn.classList.add('is-solved');
      if (!isUnlocked) stepBtn.classList.add('is-locked');
      if (isVictoryNode) stepBtn.classList.add('is-exit');

      stepBtn.disabled = !isUnlocked;
      const label = rawRoom.roman || (isVictoryNode ? '✦' : String(idx + 1));
      stepBtn.innerHTML = `<span class="trail-glyph">${isUnlocked ? label : '🔒'}</span>`;
      stepBtn.title = isUnlocked
        ? (state.unlockedRooms[idx] && state.unlockedRooms[idx].title) || `Chamber ${idx + 1}`
        : `Locked Chamber ${idx + 1}`;

      if (isUnlocked) {
        stepBtn.addEventListener('click', () => {
          state.viewingIndex = idx;
          renderTrail();
          renderCurrentStage();
          global.DungeonAudio.playStoneClick(190);
        });
      }

      dom.trail.appendChild(stepBtn);

      if (idx < state.rawRooms.length - 1) {
        const connector = document.createElement('span');
        connector.className = 'trail-connector';
        if (idx < state.unlockedIndex) connector.classList.add('is-lit');
        dom.trail.appendChild(connector);
      }
    });
  }

  function renderVictoryStage(room) {
    const endTime = state.completedAt || Date.now();
    const elapsed = formatDuration(endTime - state.startTime);
    const chambersCleared = state.rawRooms.length - 1;

    dom.stage.innerHTML = '';
    const card = document.createElement('section');
    card.className = 'chamber-card victory-card fade-in';

    const badge = document.createElement('div');
    badge.className = 'chamber-badge victory-badge';
    badge.textContent = room.roman ? `${room.roman} · Freedom` : '✦ · Freedom';
    card.appendChild(badge);

    const h2 = document.createElement('h2');
    h2.className = 'chamber-title';
    h2.textContent = room.title || 'Beyond the Iron Gate';
    card.appendChild(h2);

    const lore = document.createElement('div');
    lore.className = 'chamber-lore';
    (room.lore || []).forEach((para) => {
      const p = document.createElement('p');
      p.textContent = para;
      lore.appendChild(p);
    });
    card.appendChild(lore);

    const statsGrid = document.createElement('div');
    statsGrid.className = 'victory-stats';
    const stats = [
      { label: 'Chambers Escaped', value: String(chambersCleared) },
      { label: 'Time Below', value: elapsed },
      { label: 'Seal Attempts', value: String(state.attempts) },
    ];
    stats.forEach((s) => {
      const box = document.createElement('div');
      box.className = 'stat-box';
      box.innerHTML = `<div class="stat-value"></div><div class="stat-label"></div>`;
      box.querySelector('.stat-value').textContent = s.value;
      box.querySelector('.stat-label').textContent = s.label;
      statsGrid.appendChild(box);
    });
    card.appendChild(statsGrid);

    const actions = document.createElement('div');
    actions.className = 'victory-actions';
    const replayBtn = document.createElement('button');
    replayBtn.type = 'button';
    replayBtn.className = 'primary-seal-btn';
    replayBtn.textContent = 'Descend Again (New Run)';
    replayBtn.addEventListener('click', resetRun);
    actions.appendChild(replayBtn);
    card.appendChild(actions);

    dom.stage.appendChild(card);
  }

  function renderCurrentStage() {
    const room = state.unlockedRooms[state.viewingIndex];
    if (!room) return;

    if (room.isVictory) {
      renderVictoryStage(room);
      return;
    }

    const isAlreadySolved = state.viewingIndex < state.unlockedIndex;
    const savedKeyForNext = state.keys[state.viewingIndex + 1] || '';

    dom.stage.innerHTML = '';
    const card = document.createElement('section');
    card.className = 'chamber-card fade-in';

    const topRow = document.createElement('div');
    topRow.className = 'chamber-top-row';

    const badge = document.createElement('div');
    badge.className = 'chamber-badge';
    badge.textContent = `Chamber ${room.roman || state.viewingIndex + 1} of ${state.rawRooms.length - 1}`;
    topRow.appendChild(badge);

    if (isAlreadySolved) {
      const solvedTag = document.createElement('div');
      solvedTag.className = 'solved-pill';
      solvedTag.textContent = '✓ Seal Broken';
      topRow.appendChild(solvedTag);
    }
    card.appendChild(topRow);

    const h2 = document.createElement('h2');
    h2.className = 'chamber-title';
    h2.textContent = room.title;
    card.appendChild(h2);

    if (room.subtitle) {
      const sub = document.createElement('p');
      sub.className = 'chamber-subtitle';
      sub.textContent = room.subtitle;
      card.appendChild(sub);
    }

    const storyData = getRoomStory(room);
    if (storyData.paragraphs.length > 0) {
      const storyBox = document.createElement('div');
      storyBox.className = 'story-preface-box';

      const storyTop = document.createElement('div');
      storyTop.className = 'story-preface-header';
      const storyTitle = document.createElement('span');
      storyTitle.className = 'story-preface-title';
      storyTitle.textContent = `📖 ${storyData.title}`;
      storyTop.appendChild(storyTitle);

      const storyActions = document.createElement('div');
      storyActions.className = 'story-preface-actions';

      const fullChronicleBtn = document.createElement('button');
      fullChronicleBtn.type = 'button';
      fullChronicleBtn.className = 'mini-stone-btn';
      fullChronicleBtn.textContent = 'All Story Bits';
      fullChronicleBtn.addEventListener('click', openChronicle);
      storyActions.appendChild(fullChronicleBtn);

      const collapseBtn = document.createElement('button');
      collapseBtn.type = 'button';
      collapseBtn.className = 'mini-stone-btn';
      collapseBtn.textContent = 'Hide';
      storyActions.appendChild(collapseBtn);
      storyTop.appendChild(storyActions);
      storyBox.appendChild(storyTop);

      const storyBody = document.createElement('div');
      storyBody.className = 'story-preface-body';
      storyData.paragraphs.forEach((para) => {
        const p = document.createElement('p');
        p.textContent = para;
        storyBody.appendChild(p);
      });
      storyBox.appendChild(storyBody);

      collapseBtn.addEventListener('click', () => {
        storyBody.hidden = !storyBody.hidden;
        collapseBtn.textContent = storyBody.hidden ? 'Show' : 'Hide';
      });

      card.appendChild(storyBox);
    }

    if (room.lore && room.lore.length > 0) {
      const lore = document.createElement('div');
      lore.className = 'chamber-lore';
      room.lore.forEach((para) => {
        const p = document.createElement('p');
        p.textContent = para;
        lore.appendChild(p);
      });
      card.appendChild(lore);
    }

    const puzzleMount = document.createElement('div');
    puzzleMount.className = 'puzzle-mount';
    card.appendChild(puzzleMount);

    state.activeWidget = global.DungeonPuzzles.renderPuzzle(
      puzzleMount,
      room.puzzle,
      isAlreadySolved ? savedKeyForNext : null
    );

    // Feedback message banner
    const feedback = document.createElement('div');
    feedback.className = 'seal-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    card.appendChild(feedback);

    // Action row
    const actionBar = document.createElement('div');
    actionBar.className = 'seal-action-bar';

    if (isAlreadySolved) {
      const returnBtn = document.createElement('button');
      returnBtn.type = 'button';
      returnBtn.className = 'primary-seal-btn';
      returnBtn.textContent =
        state.unlockedIndex === state.rawRooms.length - 1
          ? 'Return to Escape Courtyard →'
          : `Advance to Chamber ${state.unlockedRooms[state.unlockedIndex].roman || state.unlockedIndex + 1} →`;
      returnBtn.addEventListener('click', () => {
        state.viewingIndex = state.unlockedIndex;
        renderTrail();
        renderCurrentStage();
        global.DungeonAudio.playStoneClick(220);
      });
      actionBar.appendChild(returnBtn);
    } else {
      const submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.className = 'primary-seal-btn';
      submitBtn.id = 'btn-test-seal';
      submitBtn.textContent = room.actionLabel || 'Test the Stone Seal';

      const handleAttempt = async () => {
        if (state.isChecking) return;
        const rawAnswer = state.activeWidget ? state.activeWidget.getAnswer() : '';
        const normalized = global.DungeonCrypto.normalizeAnswer(rawAnswer);

        if (!normalized) {
          feedback.textContent = 'The mechanism awaits your input before the seal can be tested.';
          feedback.className = 'seal-feedback is-warn';
          return;
        }

        state.isChecking = true;
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Testing Seal...';
        feedback.textContent = '';
        feedback.className = 'seal-feedback';

        state.attempts += 1;
        persistSave();

        try {
          const nextEncrypted = state.rawRooms[state.viewingIndex + 1];
          const decrypted = await global.DungeonCrypto.decryptPayload(nextEncrypted, normalized);

          if (!decrypted) {
            global.DungeonAudio.playLockedRumble();
            card.classList.remove('shake');
            void card.offsetWidth;
            card.classList.add('shake');
            feedback.textContent =
              room.failMessage ||
              'Iron grinds against stone, yet the seal holds fast. Examine the clues once more.';
            feedback.className = 'seal-feedback is-error';
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            state.isChecking = false;
            return;
          }

          // Success! Unlock next room
          const nextIdx = state.viewingIndex + 1;
          state.unlockedRooms[nextIdx] = decrypted;
          state.keys[nextIdx] = normalized;
          if (nextIdx > state.unlockedIndex) {
            state.unlockedIndex = nextIdx;
          }
          if (decrypted.isVictory && !state.completedAt) {
            state.completedAt = Date.now();
          }
          persistSave();

          if (decrypted.isVictory) {
            global.DungeonAudio.playVictoryFanfare();
          } else {
            global.DungeonAudio.playUnlockChord();
          }

          feedback.textContent = 'A deep click echoes through the masonry—the way forward unseals!';
          feedback.className = 'seal-feedback is-success';

          setTimeout(() => {
            state.viewingIndex = nextIdx;
            state.isChecking = false;
            renderTrail();
            renderCurrentStage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 520);
        } catch (err) {
          feedback.textContent = err.message || 'Cryptographic error while testing the seal.';
          feedback.className = 'seal-feedback is-error';
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          state.isChecking = false;
        }
      };

      submitBtn.addEventListener('click', handleAttempt);

      // Allow Enter key inside text inputs to trigger submit
      puzzleMount.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') {
          e.preventDefault();
          handleAttempt();
        }
      });

      actionBar.appendChild(submitBtn);
    }

    card.appendChild(actionBar);

    dom.stage.appendChild(card);
  }

  function resetRun() {
    localStorage.removeItem(STORAGE_KEY);
    state.unlockedRooms = [state.rawRooms[0]];
    state.unlockedIndex = 0;
    state.viewingIndex = 0;
    state.keys = {};
    state.startTime = Date.now();
    state.completedAt = null;
    state.attempts = 0;
    state.hintsOpened = {};
    state.resetConfirmPending = false;
    dom.resetBtn.textContent = 'Reset Run';
    dom.resetBtn.classList.remove('is-confirming');
    renderTrail();
    renderCurrentStage();
    global.DungeonAudio.playIronClank();
  }

  function getRoomStory(room) {
    if (room && room.story) {
      if (typeof room.story === 'string') {
        return { title: 'Story Preface', paragraphs: [room.story] };
      }
      if (Array.isArray(room.story)) {
        return { title: 'Story Preface', paragraphs: room.story };
      }
      return {
        title: room.story.title || 'Story Preface',
        paragraphs: Array.isArray(room.story.paragraphs) ? room.story.paragraphs : [],
      };
    }
    return { title: 'Story Preface', paragraphs: [] };
  }

  function renderChronicleEntries() {
    if (!dom.chronicleEntries) return;
    dom.chronicleEntries.innerHTML = '';

    for (let i = 0; i <= state.unlockedIndex && i < state.unlockedRooms.length; i++) {
      const room = state.unlockedRooms[i];
      if (!room) continue;
      const storyData = getRoomStory(room);
      const paragraphs = storyData.paragraphs.length > 0 ? storyData.paragraphs : room.lore || [];
      if (paragraphs.length === 0) continue;

      const entry = document.createElement('article');
      entry.className = 'chronicle-entry';
      if (i === state.viewingIndex) entry.classList.add('is-current');

      const hdr = document.createElement('div');
      hdr.className = 'chronicle-entry-header';
      const label = document.createElement('span');
      label.className = 'chronicle-entry-label';
      label.textContent = room.isVictory
        ? `${room.roman || '✦'} · Finale`
        : `Chamber ${room.roman || i + 1} · ${room.title || ''}`;
      hdr.appendChild(label);

      if (storyData.title && storyData.paragraphs.length > 0) {
        const st = document.createElement('span');
        st.className = 'chronicle-entry-subtitle';
        st.textContent = storyData.title;
        hdr.appendChild(st);
      }
      entry.appendChild(hdr);

      paragraphs.forEach((para) => {
        const p = document.createElement('p');
        p.textContent = para;
        entry.appendChild(p);
      });

      dom.chronicleEntries.appendChild(entry);
    }
  }

  function openChronicle() {
    if (!dom.chronicleBackdrop) return;
    renderChronicleEntries();
    dom.chronicleBackdrop.hidden = false;
    dom.chronicleBtn.setAttribute('aria-expanded', 'true');
    global.DungeonAudio.playStoneClick(200);
  }

  function closeChronicle() {
    if (!dom.chronicleBackdrop) return;
    dom.chronicleBackdrop.hidden = true;
    dom.chronicleBtn.setAttribute('aria-expanded', 'false');
  }

  function bindHeaderControls() {
    if (dom.chronicleBtn) {
      dom.chronicleBtn.addEventListener('click', openChronicle);
    }
    if (dom.chronicleCloseBtn) {
      dom.chronicleCloseBtn.addEventListener('click', closeChronicle);
    }
    if (dom.chronicleBackdrop) {
      dom.chronicleBackdrop.addEventListener('click', (e) => {
        if (e.target === dom.chronicleBackdrop) closeChronicle();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dom.chronicleBackdrop && !dom.chronicleBackdrop.hidden) {
        closeChronicle();
      }
    });

    dom.audioBtn.addEventListener('click', () => {
      const next = !global.DungeonAudio.enabled;
      global.DungeonAudio.setEnabled(next);
      dom.audioBtn.textContent = next ? '🔊 Sound On' : '🔇 Muted';
      dom.audioBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
      if (next) global.DungeonAudio.playStoneClick(220);
    });

    dom.resetBtn.addEventListener('click', () => {
      if (!state.resetConfirmPending) {
        state.resetConfirmPending = true;
        dom.resetBtn.textContent = 'Confirm Reset?';
        dom.resetBtn.classList.add('is-confirming');
        setTimeout(() => {
          if (state.resetConfirmPending) {
            state.resetConfirmPending = false;
            dom.resetBtn.textContent = 'Reset Run';
            dom.resetBtn.classList.remove('is-confirming');
          }
        }, 3500);
      } else {
        resetRun();
      }
    });
  }

  async function init() {
    cacheDom();

    if (!global.crypto || !global.crypto.subtle) {
      dom.cryptoWarning.hidden = false;
    }

    const data = global.DUNGEON_ROOMS;
    if (!data || !Array.isArray(data.rooms) || data.rooms.length < 2) {
      dom.stage.innerHTML =
        '<div class="chamber-card"><p class="error-text">Dungeon data is missing or incomplete. Check data/rooms.js.</p></div>';
      return;
    }

    if (data.meta) {
      if (data.meta.title) dom.title.textContent = data.meta.title;
      if (data.meta.subtitle) dom.subtitle.textContent = data.meta.subtitle;
    }

    state.rawRooms = data.rooms;
    state.unlockedRooms = [data.rooms[0]];

    const save = loadSave();
    if (save && typeof save.unlockedIndex === 'number') {
      state.startTime = save.startTime || Date.now();
      state.completedAt = save.completedAt || null;
      state.attempts = save.attempts || 0;
      state.hintsOpened = save.hintsOpened || {};

      const savedKeys = save.keys || {};
      let highestValid = 0;
      for (let i = 1; i <= save.unlockedIndex && i < state.rawRooms.length; i++) {
        const key = savedKeys[i];
        if (!key) break;
        const decrypted = await global.DungeonCrypto.decryptPayload(state.rawRooms[i], key);
        if (!decrypted) break;
        state.unlockedRooms[i] = decrypted;
        state.keys[i] = key;
        highestValid = i;
      }
      state.unlockedIndex = highestValid;
      state.viewingIndex = highestValid;
    }

    bindHeaderControls();
    renderTrail();
    renderCurrentStage();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
