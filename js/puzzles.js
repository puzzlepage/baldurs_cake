/**
 * DungeonPuzzles — Interactive tactile puzzle renderers.
 * Each renderer builds its UI solely from the decrypted room's `puzzle` config
 * and exposes `getAnswer()` without ever storing the solution in the client.
 */
(function (global) {
  'use strict';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  /**
   * Inline SVG rune symbols for Rune Dials and decorations.
   */
  function createRuneSvg(glyphId) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('class', 'rune-svg');
    svg.setAttribute('aria-hidden', 'true');

    const paths = {
      flame: [
        'M32 8 C38 20, 48 26, 44 40 C42 49, 36 54, 32 56 C28 54, 22 49, 20 40 C16 26, 26 20, 32 8 Z',
        'M32 26 C35 33, 39 38, 36 45 C34 49, 32 51, 32 51 C32 51, 30 49, 28 45 C25 38, 29 33, 32 26 Z',
      ],
      tide: [
        'M10 24 Q21 14 32 24 T54 24',
        'M10 36 Q21 26 32 36 T54 36',
        'M14 48 Q23 40 32 48 T50 48',
      ],
      stone: [
        'M32 10 L52 48 L12 48 Z',
        'M32 10 L32 48',
        'M21 34 L43 34',
      ],
      gale: [
        'M12 22 L42 22 C49 22, 52 14, 45 12 C40 11, 37 15, 39 18',
        'M10 34 L48 34 C54 34, 56 44, 48 46 C43 47, 41 42, 43 39',
        'M16 46 L36 46',
      ],
      void: [
        'M32 10 A22 22 0 1 0 32 54 A15 22 0 1 1 32 10 Z',
        'M42 24 L48 24 M45 21 L45 27',
      ],
      'elder-1': [
        'M32 10 V54',
        'M32 20 L44 32 L32 44 L20 32 Z',
      ],
      'elder-2': [
        'M20 12 V52',
        'M44 12 V52',
        'M20 22 L44 42',
        'M44 22 L20 42',
      ],
      'elder-3': [
        'M32 10 V54',
        'M16 14 L32 30 L48 14',
        'M22 46 H42',
      ],
      'elder-4': [
        'M18 14 H46 L18 50 H46 Z',
      ],
      'elder-5': [
        'M20 10 V54',
        'M20 16 L46 26 L20 36',
        'M20 36 L42 48',
      ],
      'elder-6': [
        'M14 28 L32 10 L50 28',
        'M18 48 L32 30 L46 48',
        'M32 22 V54',
      ],
      'elder-7': [
        'M16 16 L48 48',
        'M48 16 L16 48',
        'M32 10 V54',
        'M20 12 H44',
      ],
    };

    const list = paths[glyphId] || paths.stone;
    list.forEach((d) => {
      const p = document.createElementNS(svgNS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', '3.2');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(p);
    });

    return svg;
  }

  /**
   * 1. RIDDLE-LOCK: Engraved stone plaques + rotating numeric iron tumblers.
   */
  function renderRiddleLock(container, config, initialAnswer) {
    const count = config.dialCount || 4;
    const digits = new Array(count).fill(0);

    if (initialAnswer && /^\d+$/.test(initialAnswer) && initialAnswer.length === count) {
      for (let i = 0; i < count; i++) {
        digits[i] = Number(initialAnswer[i]);
      }
    }

    const plaquesGrid = el('div', 'plaques-grid');
    (config.plaques || []).forEach((plaque, idx) => {
      const card = el('div', 'stone-plaque');
      const header = el('div', 'plaque-header');
      header.appendChild(el('span', 'plaque-roman', ['I', 'II', 'III', 'IV', 'V', 'VI'][idx] || String(idx + 1)));
      header.appendChild(el('span', 'plaque-title', plaque.title || `Inscription ${idx + 1}`));
      card.appendChild(header);
      card.appendChild(el('p', 'plaque-text', plaque.text));
      plaquesGrid.appendChild(card);
    });
    container.appendChild(plaquesGrid);

    const lockFrame = el('div', 'padlock-frame');
    lockFrame.appendChild(el('div', 'mechanism-label', 'IRON TUMBLER LOCK'));
    const tumblersRow = el('div', 'tumblers-row');

    const digitNodes = [];
    for (let i = 0; i < count; i++) {
      const col = el('div', 'tumbler-col');
      col.appendChild(el('span', 'tumbler-index', ['I', 'II', 'III', 'IV', 'V', 'VI'][i] || String(i + 1)));

      const upBtn = el('button', 'tumbler-btn', '▲');
      upBtn.type = 'button';
      upBtn.setAttribute('aria-label', `Increase tumbler ${i + 1}`);

      const windowBox = el('div', 'tumbler-window', String(digits[i]));
      digitNodes.push(windowBox);

      const downBtn = el('button', 'tumbler-btn', '▼');
      downBtn.type = 'button';
      downBtn.setAttribute('aria-label', `Decrease tumbler ${i + 1}`);

      upBtn.addEventListener('click', () => {
        digits[i] = (digits[i] + 1) % 10;
        windowBox.textContent = String(digits[i]);
        windowBox.classList.remove('tick');
        void windowBox.offsetWidth;
        windowBox.classList.add('tick');
        global.DungeonAudio.playStoneClick(190 + digits[i] * 8);
      });

      downBtn.addEventListener('click', () => {
        digits[i] = (digits[i] + 9) % 10;
        windowBox.textContent = String(digits[i]);
        windowBox.classList.remove('tick');
        void windowBox.offsetWidth;
        windowBox.classList.add('tick');
        global.DungeonAudio.playStoneClick(150 + digits[i] * 8);
      });

      col.appendChild(upBtn);
      col.appendChild(windowBox);
      col.appendChild(downBtn);
      tumblersRow.appendChild(col);
    }

    lockFrame.appendChild(tumblersRow);
    container.appendChild(lockFrame);

    return {
      getAnswer: () => digits.join(''),
    };
  }

  /**
   * 2. RUNE-DIALS: Logic rules ledger + 4 basalt rune monoliths.
   */
  function renderRuneDials(container, config, initialAnswer) {
    const runes = config.runes || [];
    const plinthCount = config.plinthCount || 4;
    const selectedIndices = new Array(plinthCount).fill(0);

    if (initialAnswer) {
      const parts = initialAnswer.split('-');
      if (parts.length === plinthCount) {
        parts.forEach((part, idx) => {
          const found = runes.findIndex((r) => r.id.toUpperCase() === part.toUpperCase());
          if (found >= 0) selectedIndices[idx] = found;
        });
      }
    }

    const ledger = el('div', 'parchment-card');
    ledger.appendChild(el('div', 'parchment-title', config.ledgerTitle || "Warden's Seal Ledger"));
    const ul = el('ul', 'rules-list');
    (config.rules || []).forEach((rule) => {
      const li = el('li');
      li.textContent = rule;
      ul.appendChild(li);
    });
    ledger.appendChild(ul);
    container.appendChild(ledger);

    const plinthStage = el('div', 'plinths-grid');

    function updatePlinth(idx, glyphHolder, labelNode) {
      const rune = runes[selectedIndices[idx]];
      glyphHolder.innerHTML = '';
      glyphHolder.appendChild(createRuneSvg(rune.glyph));
      glyphHolder.dataset.rune = rune.glyph;
      labelNode.textContent = rune.label;
    }

    for (let i = 0; i < plinthCount; i++) {
      const plinth = el('div', 'rune-plinth');
      plinth.appendChild(el('div', 'plinth-roman', `Plinth ${['I', 'II', 'III', 'IV', 'V'][i] || i + 1}`));

      const glyphHolder = el('div', 'rune-glyph-box');
      glyphHolder.setAttribute('role', 'button');
      glyphHolder.setAttribute('tabindex', '0');
      glyphHolder.setAttribute('title', 'Click to rotate rune');

      const labelNode = el('div', 'rune-name');

      const controls = el('div', 'plinth-controls');
      const prevBtn = el('button', 'mini-stone-btn', '◀');
      prevBtn.type = 'button';
      prevBtn.setAttribute('aria-label', `Previous rune for Plinth ${i + 1}`);
      const nextBtn = el('button', 'mini-stone-btn', '▶');
      nextBtn.type = 'button';
      nextBtn.setAttribute('aria-label', `Next rune for Plinth ${i + 1}`);

      const step = (delta) => {
        selectedIndices[i] = (selectedIndices[i] + delta + runes.length) % runes.length;
        updatePlinth(i, glyphHolder, labelNode);
        global.DungeonAudio.playStoneClick(210);
      };

      prevBtn.addEventListener('click', () => step(-1));
      nextBtn.addEventListener('click', () => step(1));
      glyphHolder.addEventListener('click', () => step(1));
      glyphHolder.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          step(1);
        }
      });

      controls.appendChild(prevBtn);
      controls.appendChild(labelNode);
      controls.appendChild(nextBtn);

      plinth.appendChild(glyphHolder);
      plinth.appendChild(controls);
      updatePlinth(i, glyphHolder, labelNode);
      plinthStage.appendChild(plinth);
    }

    container.appendChild(plinthStage);

    return {
      getAnswer: () => selectedIndices.map((idx) => runes[idx].id.toUpperCase()).join('-'),
    };
  }

  /**
   * 3. LEVER-GATE: Interactive iron wall levers + counterweight plaque.
   */
  function renderLeverGate(container, config, initialAnswer) {
    const labels = config.leverLabels || ['I', 'II', 'III', 'IV', 'V'];
    const states = new Array(labels.length).fill(0); // 0 = UP, 1 = DOWN

    if (initialAnswer && /^[01]+$/.test(initialAnswer) && initialAnswer.length === labels.length) {
      for (let i = 0; i < labels.length; i++) {
        states[i] = Number(initialAnswer[i]);
      }
    }

    const plaque = el('div', 'parchment-card brass-plaque');
    if (config.plaqueStyle === 'mimic') {
      plaque.classList.add('mimic-plaque');
    } else if (config.plaqueStyle === 'gargoyle') {
      plaque.classList.add('gargoyle-plaque');
    }
    plaque.appendChild(el('div', 'parchment-title', config.plaqueTitle || 'Counterweight Specifications'));

    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    if (config.numberedLaws) {
      const list = el('div', 'laws-list');
      (config.rules || []).forEach((rule, idx) => {
        const isObj = rule && typeof rule === 'object';
        const badgeText = isObj && rule.label ? rule.label : `Law ${romans[idx] || idx + 1}`;
        const bodyText = isObj ? rule.text : rule;

        const row = el('div', 'law-item');
        row.appendChild(el('span', 'law-badge', badgeText));
        row.appendChild(el('span', 'law-text', bodyText));
        list.appendChild(row);
      });
      plaque.appendChild(list);
    } else {
      const ul = el('ul', 'rules-list');
      (config.rules || []).forEach((rule) => {
        const li = el('li');
        li.textContent = typeof rule === 'object' ? rule.text : rule;
        ul.appendChild(li);
      });
      plaque.appendChild(ul);
    }
    container.appendChild(plaque);

    const leverRack = el('div', 'lever-rack');
    labels.forEach((lbl, idx) => {
      const unit = el('button', 'lever-unit');
      unit.type = 'button';
      unit.setAttribute('aria-pressed', states[idx] === 1 ? 'true' : 'false');

      const header = el('span', 'lever-label', `Lever ${lbl}`);
      const track = el('div', 'lever-track');
      const arm = el('div', 'lever-arm');
      const handle = el('div', 'lever-handle');
      arm.appendChild(handle);
      track.appendChild(arm);

      const status = el('span', 'lever-state', states[idx] === 1 ? 'DOWN' : 'UP');
      if (states[idx] === 1) unit.classList.add('is-down');

      unit.addEventListener('click', () => {
        states[idx] = states[idx] === 1 ? 0 : 1;
        unit.classList.toggle('is-down', states[idx] === 1);
        unit.setAttribute('aria-pressed', states[idx] === 1 ? 'true' : 'false');
        status.textContent = states[idx] === 1 ? 'DOWN' : 'UP';
        global.DungeonAudio.playIronClank();
      });

      unit.appendChild(header);
      unit.appendChild(track);
      unit.appendChild(status);
      leverRack.appendChild(unit);
    });

    container.appendChild(leverRack);

    return {
      getAnswer: () => states.join(''),
    };
  }

  /**
   * 4. CIPHER-WHEEL: Interactive SVG twin-ring brass astrolabe + parchment scroll.
   */
  function renderCipherWheel(container, config, initialAnswer) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let shift = 0;

    const scroll = el('div', 'parchment-card');
    scroll.appendChild(el('div', 'parchment-title', config.scrollTitle || 'Intercepted Wax-Sealed Scroll'));
    if (config.sealRiddle) {
      scroll.appendChild(el('p', 'scroll-riddle', config.sealRiddle));
    }
    const cipherBox = el('div', 'cipher-text-box');
    cipherBox.appendChild(el('span', 'cipher-caption', 'CIPHERTEXT:'));
    cipherBox.appendChild(el('code', 'cipher-code', config.ciphertext || ''));
    scroll.appendChild(cipherBox);
    container.appendChild(scroll);

    const workspace = el('div', 'cipher-workspace');

    // Interactive SVG twin-ring wheel
    const wheelWrap = el('div', 'cipher-wheel-wrap');
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 320 320');
    svg.setAttribute('class', 'cipher-svg');

    const outerCircle = document.createElementNS(svgNS, 'circle');
    outerCircle.setAttribute('cx', '160');
    outerCircle.setAttribute('cy', '160');
    outerCircle.setAttribute('r', '150');
    outerCircle.setAttribute('class', 'wheel-ring-outer');
    svg.appendChild(outerCircle);

    const midCircle = document.createElementNS(svgNS, 'circle');
    midCircle.setAttribute('cx', '160');
    midCircle.setAttribute('cy', '160');
    midCircle.setAttribute('r', '114');
    midCircle.setAttribute('class', 'wheel-ring-inner');
    svg.appendChild(midCircle);

    const coreCircle = document.createElementNS(svgNS, 'circle');
    coreCircle.setAttribute('cx', '160');
    coreCircle.setAttribute('cy', '160');
    coreCircle.setAttribute('r', '74');
    coreCircle.setAttribute('class', 'wheel-core');
    svg.appendChild(coreCircle);

    // Outer static ring = Plaintext A-Z
    alphabet.forEach((ch, idx) => {
      const angle = (idx * 360) / 26 - 90;
      const rad = (angle * Math.PI) / 180;
      const x = 160 + 132 * Math.cos(rad);
      const y = 160 + 132 * Math.sin(rad);
      const txt = document.createElementNS(svgNS, 'text');
      txt.setAttribute('x', x.toFixed(1));
      txt.setAttribute('y', y.toFixed(1));
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('dominant-baseline', 'central');
      txt.setAttribute('class', 'wheel-letter-outer');
      txt.textContent = ch;
      svg.appendChild(txt);
    });

    // Inner rotating group = Ciphertext A-Z
    const innerGroup = document.createElementNS(svgNS, 'g');
    innerGroup.setAttribute('class', 'wheel-inner-group');
    alphabet.forEach((ch, idx) => {
      const angle = (idx * 360) / 26 - 90;
      const rad = (angle * Math.PI) / 180;
      const x = 160 + 95 * Math.cos(rad);
      const y = 160 + 95 * Math.sin(rad);
      const txt = document.createElementNS(svgNS, 'text');
      txt.setAttribute('x', x.toFixed(1));
      txt.setAttribute('y', y.toFixed(1));
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('dominant-baseline', 'central');
      txt.setAttribute('class', 'wheel-letter-inner');
      txt.textContent = ch;
      innerGroup.appendChild(txt);
    });
    svg.appendChild(innerGroup);

    // Top alignment pointer
    const marker = document.createElementNS(svgNS, 'polygon');
    marker.setAttribute('points', '160,6 154,18 166,18');
    marker.setAttribute('class', 'wheel-pointer');
    svg.appendChild(marker);

    // Center readout inside core
    const centerShiftText = document.createElementNS(svgNS, 'text');
    centerShiftText.setAttribute('x', '160');
    centerShiftText.setAttribute('y', '152');
    centerShiftText.setAttribute('text-anchor', 'middle');
    centerShiftText.setAttribute('class', 'wheel-center-shift');
    svg.appendChild(centerShiftText);

    const centerMapText = document.createElementNS(svgNS, 'text');
    centerMapText.setAttribute('x', '160');
    centerMapText.setAttribute('y', '174');
    centerMapText.setAttribute('text-anchor', 'middle');
    centerMapText.setAttribute('class', 'wheel-center-map');
    svg.appendChild(centerMapText);

    wheelWrap.appendChild(svg);

    const controlsPanel = el('div', 'cipher-controls-panel');
    const rotateBtns = el('div', 'cipher-rotate-btns');
    const btnBack5 = el('button', 'mini-stone-btn', '↺ -5');
    const btnBack1 = el('button', 'mini-stone-btn', '◀ -1');
    const btnFwd1 = el('button', 'mini-stone-btn', '+1 ▶');
    const btnFwd5 = el('button', 'mini-stone-btn', '+5 ↻');
    [btnBack5, btnBack1, btnFwd1, btnFwd5].forEach((b) => (b.type = 'button'));

    rotateBtns.appendChild(btnBack5);
    rotateBtns.appendChild(btnBack1);
    rotateBtns.appendChild(btnFwd1);
    rotateBtns.appendChild(btnFwd5);
    controlsPanel.appendChild(rotateBtns);

    // Live single-glyph alignment helper table for ciphertext letters
    const decodedPreview = el('div', 'cipher-preview');
    decodedPreview.appendChild(el('span', 'cipher-preview-label', 'Wheel Alignment Preview:'));
    const previewLetters = el('code', 'cipher-preview-code');
    decodedPreview.appendChild(previewLetters);
    controlsPanel.appendChild(decodedPreview);

    const inputWrap = el('div', 'seal-input-wrap');
    const inputLabel = el('label', 'seal-input-label', 'Inscribe the Decoded Passphrase:');
    const input = el('input', 'seal-text-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = config.inputPlaceholder || 'Enter passphrase...';
    if (initialAnswer) input.value = initialAnswer;

    inputWrap.appendChild(inputLabel);
    inputWrap.appendChild(input);
    controlsPanel.appendChild(inputWrap);

    function updateWheel() {
      // Rotating inner wheel counter-clockwise by shift brings letter[shift] under outer 'A'
      const deg = -(shift * 360) / 26;
      innerGroup.style.transformOrigin = '160px 160px';
      innerGroup.style.transform = `rotate(${deg.toFixed(2)}deg)`;
      centerShiftText.textContent = `SHIFT +${shift}`;
      centerMapText.textContent = `A ⇄ ${alphabet[shift]}`;

      const raw = (config.ciphertext || '').toUpperCase();
      const decoded = raw
        .split('')
        .map((ch) => {
          const idx = alphabet.indexOf(ch);
          if (idx === -1) return ch;
          return alphabet[(idx - shift + 26) % 26];
        })
        .join('');
      previewLetters.textContent = decoded;
    }

    const adjustShift = (delta) => {
      shift = (shift + delta + 26) % 26;
      updateWheel();
      global.DungeonAudio.playStoneClick(240);
    };

    btnBack5.addEventListener('click', () => adjustShift(-5));
    btnBack1.addEventListener('click', () => adjustShift(-1));
    btnFwd1.addEventListener('click', () => adjustShift(1));
    btnFwd5.addEventListener('click', () => adjustShift(5));

    updateWheel();
    workspace.appendChild(wheelWrap);
    workspace.appendChild(controlsPanel);
    container.appendChild(workspace);

    return {
      getAnswer: () => input.value,
    };
  }

  /**
   * 5. SIGIL-GRID: Interactive 4x4 Nonogram/Path stone mosaic.
   */
  function renderSigilGrid(container, config, initialAnswer) {
    const size = config.size || 4;
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, size);
    const active = new Set();

    if (initialAnswer) {
      initialAnswer.split('-').forEach((id) => {
        if (id) active.add(id.trim().toUpperCase());
      });
    }

    const tablet = el('div', 'parchment-card');
    tablet.appendChild(el('div', 'parchment-title', config.tabletTitle || 'Tablet of the Starless Mosaic'));
    const ul = el('ul', 'rules-list');
    (config.rules || []).forEach((rule) => {
      const li = el('li');
      li.textContent = rule;
      ul.appendChild(li);
    });
    tablet.appendChild(ul);
    container.appendChild(tablet);

    const gridWrap = el('div', 'sigil-grid-wrap');
    const table = el('div', 'sigil-matrix');
    table.style.gridTemplateColumns = `auto repeat(${size}, minmax(58px, 76px))`;

    // Top-left corner spacer
    table.appendChild(el('div', 'matrix-corner', '✦'));

    // Column headers + Nonogram hints
    cols.forEach((colName, cIdx) => {
      const hdr = el('div', 'matrix-col-hdr');
      hdr.appendChild(el('span', 'hdr-coord', colName));
      if (config.colHints && config.colHints[cIdx] !== undefined) {
        hdr.appendChild(el('span', 'hdr-count', String(config.colHints[cIdx])));
      }
      table.appendChild(hdr);
    });

    // Rows
    for (let r = 1; r <= size; r++) {
      const rowHdr = el('div', 'matrix-row-hdr');
      rowHdr.appendChild(el('span', 'hdr-coord', String(r)));
      if (config.rowHints && config.rowHints[r - 1] !== undefined) {
        rowHdr.appendChild(el('span', 'hdr-count', String(config.rowHints[r - 1])));
      }
      table.appendChild(rowHdr);

      for (let c = 0; c < size; c++) {
        const coord = `${cols[c]}${r}`;
        const tile = el('button', 'sigil-tile');
        tile.type = 'button';
        tile.dataset.coord = coord;
        tile.appendChild(el('span', 'tile-coord', coord));

        if (config.startTile === coord) {
          tile.appendChild(el('span', 'tile-badge badge-start', 'START'));
        } else if (config.exitTile === coord) {
          tile.appendChild(el('span', 'tile-badge badge-exit', 'EXIT'));
        }

        if (active.has(coord)) {
          tile.classList.add('is-lit');
        }

        tile.addEventListener('click', () => {
          if (active.has(coord)) {
            active.delete(coord);
            tile.classList.remove('is-lit');
          } else {
            active.add(coord);
            tile.classList.add('is-lit');
          }
          global.DungeonAudio.playStoneClick(active.has(coord) ? 280 : 150);
        });

        table.appendChild(tile);
      }
    }

    gridWrap.appendChild(table);
    container.appendChild(gridWrap);

    return {
      getAnswer: () => Array.from(active).sort().join('-'),
    };
  }

  /**
   * 6. TEXT-SEAL: General-purpose carved riddle & passphrase seal (handy for Forge expansion).
   */
  function renderTextSeal(container, config, initialAnswer) {
    const card = el('div', 'parchment-card');
    if (config.inscriptionTitle) {
      card.appendChild(el('div', 'parchment-title', config.inscriptionTitle));
    }
    if (config.inscription) {
      card.appendChild(el('p', 'scroll-riddle', config.inscription));
    }
    container.appendChild(card);

    const inputWrap = el('div', 'seal-input-wrap centered-seal');
    inputWrap.appendChild(el('label', 'seal-input-label', config.prompt || 'Speak the Passphrase:'));
    const input = el('input', 'seal-text-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = config.inputPlaceholder || 'Enter solution...';
    if (initialAnswer) input.value = initialAnswer;

    inputWrap.appendChild(input);
    container.appendChild(inputWrap);

    return {
      getAnswer: () => input.value,
    };
  }

  /**
   * 7. WALL-KNOCKS: Audio-only Polybius / Tap-Code masonry knock sequence + passphrase input.
   */
  function renderWallKnocks(container, config, initialAnswer) {
    const sequence = Array.isArray(config.sequence) ? config.sequence : [];
    let speed = 1;
    let activeHandle = null;

    function formatTime(sec) {
      const s = Math.max(0, Math.round(sec));
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return `${m}:${String(rem).padStart(2, '0')}`;
    }

    const wallCard = el('div', 'parchment-card wall-knocks-card');
    wallCard.appendChild(el('div', 'parchment-title', config.wallTitle || 'The Masonry Wall'));
    if (config.wallNote) {
      wallCard.appendChild(el('p', 'scroll-riddle', config.wallNote));
    }

    const muteWarn = el(
      'div',
      'knocks-mute-warn',
      '🔇 Sound is currently muted—click "Sound On" in the header to hear the wall.'
    );
    muteWarn.hidden = global.DungeonAudio.enabled;
    wallCard.appendChild(muteWarn);

    const controlsRow = el('div', 'knocks-controls');
    const playBtn = el('button', 'mini-stone-btn knocks-play-btn', '▶ Listen to the Wall');
    playBtn.type = 'button';

    const replayBtn = el('button', 'mini-stone-btn', '↻ Replay');
    replayBtn.type = 'button';

    const speedGroup = el('div', 'knocks-speed-group');
    speedGroup.appendChild(el('span', 'knocks-speed-label', 'Pace:'));
    const speedBtns = [0.75, 1, 1.25].map((rate) => {
      const b = el('button', 'mini-stone-btn knocks-speed-btn', `${rate}×`);
      b.type = 'button';
      if (rate === speed) b.classList.add('is-active');
      b.addEventListener('click', () => {
        speed = rate;
        speedBtns.forEach((btn) => btn.classList.toggle('is-active', btn === b));
        if (activeHandle) {
          startPlayback();
        } else {
          syncDurationLabel();
        }
      });
      speedGroup.appendChild(b);
      return b;
    });

    controlsRow.appendChild(playBtn);
    controlsRow.appendChild(replayBtn);
    controlsRow.appendChild(speedGroup);
    wallCard.appendChild(controlsRow);

    const progressRow = el('div', 'knocks-progress-row');
    const track = el('div', 'knocks-progress-track');
    const fill = el('div', 'knocks-progress-fill');
    track.appendChild(fill);
    const timeLabel = el('span', 'knocks-time', '0:00 / 0:00');
    progressRow.appendChild(track);
    progressRow.appendChild(timeLabel);
    wallCard.appendChild(progressRow);

    container.appendChild(wallCard);

    function getPlannedDuration() {
      if (global.DungeonAudio && typeof global.DungeonAudio.computeKnockTimeline === 'function') {
        return global.DungeonAudio.computeKnockTimeline(sequence, speed).totalDuration;
      }
      return 0;
    }

    function syncDurationLabel(elapsed = 0) {
      const total = getPlannedDuration();
      timeLabel.textContent = `${formatTime(elapsed)} / ${formatTime(total)}`;
      const pct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
      fill.style.width = `${pct.toFixed(1)}%`;
    }

    function resetPlaybackUI() {
      activeHandle = null;
      playBtn.textContent = '▶ Listen to the Wall';
      playBtn.classList.remove('is-playing');
      syncDurationLabel(0);
    }

    function startPlayback() {
      muteWarn.hidden = global.DungeonAudio.enabled;
      if (!global.DungeonAudio.enabled) {
        muteWarn.classList.remove('pulse-warn');
        void muteWarn.offsetWidth;
        muteWarn.classList.add('pulse-warn');
        return;
      }

      if (activeHandle) {
        activeHandle.stop();
        activeHandle = null;
      }

      playBtn.textContent = '⏹ Stop';
      playBtn.classList.add('is-playing');

      activeHandle = global.DungeonAudio.playKnockSequence(sequence, {
        speed,
        onProgress: (elapsed, total) => {
          if (!container.isConnected) {
            if (activeHandle) activeHandle.stop();
            return;
          }
          timeLabel.textContent = `${formatTime(elapsed)} / ${formatTime(total)}`;
          const pct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
          fill.style.width = `${pct.toFixed(1)}%`;
        },
        onComplete: () => {
          resetPlaybackUI();
        },
        onStop: () => {
          resetPlaybackUI();
        },
      });
    }

    playBtn.addEventListener('click', () => {
      if (activeHandle) {
        activeHandle.stop();
      } else {
        startPlayback();
      }
    });

    replayBtn.addEventListener('click', () => {
      startPlayback();
    });

    const audioBtn = document.getElementById('btn-audio');
    const syncMuteBanner = () => {
      if (!container.isConnected) {
        if (audioBtn) audioBtn.removeEventListener('click', syncMuteBanner);
        return;
      }
      setTimeout(() => {
        muteWarn.hidden = global.DungeonAudio.enabled;
      }, 0);
    };
    if (audioBtn) {
      audioBtn.addEventListener('click', syncMuteBanner);
    }

    syncDurationLabel(0);

    const inputWrap = el('div', 'seal-input-wrap centered-seal');
    inputWrap.appendChild(el('label', 'seal-input-label', config.prompt || 'Speak the Word That Trips the Latch:'));
    const input = el('input', 'seal-text-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = config.inputPlaceholder || 'Enter the decoded word...';
    if (initialAnswer) input.value = initialAnswer;

    inputWrap.appendChild(input);
    container.appendChild(inputWrap);

    return {
      getAnswer: () => input.value,
    };
  }

  /**
   * 8. RUNE-NOTES: 7 resonant musical runes + brass tuning fork + carved archway sequence.
   */
  function renderRuneNotes(container, config, initialAnswer) {
    const runes = Array.isArray(config.runes) ? config.runes : [];
    const fork = config.tuningFork || { label: 'A', noteLabel: '440 Hz', freq: 440 };
    const archwayGlyphs = Array.isArray(config.archwayGlyphs) ? config.archwayGlyphs : [];

    const altar = el('div', 'parchment-card rune-notes-card');
    altar.appendChild(el('div', 'parchment-title', config.consoleTitle || 'Altar of the Seven Runes'));

    const muteWarn = el(
      'div',
      'knocks-mute-warn',
      '🔇 Sound is currently muted—click "Sound On" in the header to hear the runes and tuning fork.'
    );
    muteWarn.hidden = global.DungeonAudio.enabled;
    altar.appendChild(muteWarn);

    const flashMuteWarn = () => {
      muteWarn.hidden = global.DungeonAudio.enabled;
      if (!global.DungeonAudio.enabled) {
        muteWarn.classList.remove('pulse-warn');
        void muteWarn.offsetWidth;
        muteWarn.classList.add('pulse-warn');
        return true;
      }
      return false;
    };

    const audioBtn = document.getElementById('btn-audio');
    const syncMuteBanner = () => {
      if (!container.isConnected) {
        if (audioBtn) audioBtn.removeEventListener('click', syncMuteBanner);
        return;
      }
      setTimeout(() => {
        muteWarn.hidden = global.DungeonAudio.enabled;
      }, 0);
    };
    if (audioBtn) {
      audioBtn.addEventListener('click', syncMuteBanner);
    }

    // Tuning fork bar
    const forkBar = el('div', 'tuning-fork-bar');
    const forkBtn = el('button', 'mini-stone-btn tuning-fork-btn');
    forkBtn.type = 'button';
    const forkIcon = el('span', 'fork-crest', 'Ψ');
    const forkText = el('span', 'fork-label', `Strike Tuning Fork: ${fork.label}`);
    const forkMeta = el('span', 'fork-meta', fork.noteLabel || `${fork.freq} Hz`);
    forkBtn.appendChild(forkIcon);
    forkBtn.appendChild(forkText);
    forkBtn.appendChild(forkMeta);

    forkBtn.addEventListener('click', () => {
      if (flashMuteWarn()) return;
      global.DungeonAudio.playTuningFork(fork.freq);
      forkBtn.classList.remove('is-ringing');
      void forkBtn.offsetWidth;
      forkBtn.classList.add('is-ringing');
    });
    forkBar.appendChild(forkBtn);
    altar.appendChild(forkBar);

    // 7 scrambled clickable rune stones + scratchpad note input
    const grid = el('div', 'notes-altar-grid');
    runes.forEach((r, idx) => {
      const cell = el('div', 'note-rune-card');
      const stoneBtn = el('button', 'note-rune-btn');
      stoneBtn.type = 'button';
      stoneBtn.setAttribute('aria-label', `Sound rune stone ${idx + 1}`);
      stoneBtn.appendChild(createRuneSvg(r.glyph));

      stoneBtn.addEventListener('click', () => {
        if (flashMuteWarn()) return;
        global.DungeonAudio.playRuneChime(r.freq);
        stoneBtn.classList.remove('is-ringing');
        void stoneBtn.offsetWidth;
        stoneBtn.classList.add('is-ringing');
      });

      const chalkInput = el('input', 'note-chalk-input');
      chalkInput.type = 'text';
      chalkInput.maxLength = 2;
      chalkInput.placeholder = '?';
      chalkInput.autocomplete = 'off';
      chalkInput.spellcheck = false;
      chalkInput.setAttribute('aria-label', `Scratchpad note for rune ${idx + 1}`);

      cell.appendChild(stoneBtn);
      cell.appendChild(chalkInput);
      grid.appendChild(cell);
    });
    altar.appendChild(grid);
    container.appendChild(altar);

    // Sealed Archway lintel sequence
    const lintel = el('div', 'parchment-card archway-lintel');
    lintel.appendChild(el('div', 'parchment-title', config.archwayTitle || 'The Sealed Choir Gate'));
    const slotsRow = el('div', 'archway-slots');
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
    archwayGlyphs.forEach((glyphId, idx) => {
      const slot = el('div', 'archway-slot');
      const socket = el('div', 'archway-glyph-socket');
      socket.appendChild(createRuneSvg(glyphId));
      slot.appendChild(socket);
      slot.appendChild(el('span', 'archway-index', romans[idx] || String(idx + 1)));
      slotsRow.appendChild(slot);
    });
    lintel.appendChild(slotsRow);
    container.appendChild(lintel);

    // Passphrase input
    const inputWrap = el('div', 'seal-input-wrap centered-seal');
    inputWrap.appendChild(el('label', 'seal-input-label', config.prompt || 'Speak the Word Carved Across the Archway:'));
    const input = el('input', 'seal-text-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = config.inputPlaceholder || 'Enter the word...';
    if (initialAnswer) input.value = initialAnswer;

    inputWrap.appendChild(input);
    container.appendChild(inputWrap);

    return {
      getAnswer: () => input.value,
    };
  }

  const RESISTOR_SWATCHES = {
    black: { label: 'Black', hex: '#1c1a18', stroke: '#4a433b' },
    brown: { label: 'Brown', hex: '#6e3b1e' },
    red: { label: 'Red', hex: '#b82824' },
    orange: { label: 'Orange', hex: '#d96b1c' },
    yellow: { label: 'Yellow', hex: '#d6b229' },
    green: { label: 'Green', hex: '#2e7d45' },
    blue: { label: 'Blue', hex: '#285da1' },
    violet: { label: 'Violet', hex: '#7a3b9c' },
    grey: { label: 'Grey', hex: '#7b8087' },
    white: { label: 'White', hex: '#eae3d5' },
    gold: { label: 'Gold', hex: '#d4a644' },
    silver: { label: 'Silver', hex: '#b6bcc4' },
  };

  function createPotionVialSvg(bandIds) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 80 124');
    svg.setAttribute('class', 'vial-svg');
    svg.setAttribute('aria-hidden', 'true');

    const defs = document.createElementNS(svgNS, 'defs');
    const clip = document.createElementNS(svgNS, 'clipPath');
    const clipId = `vial-clip-${Math.random().toString(36).slice(2, 9)}`;
    clip.setAttribute('id', clipId);
    const clipPathShape = document.createElementNS(svgNS, 'path');
    clipPathShape.setAttribute(
      'd',
      'M31 32 L31 44 C18 50, 14 62, 14 78 L14 106 C14 113, 19 117, 26 117 L54 117 C61 117, 66 113, 66 106 L66 78 C66 62, 62 50, 49 44 L49 32 Z'
    );
    clip.appendChild(clipPathShape);
    defs.appendChild(clip);
    svg.appendChild(defs);

    // Cork stopper
    const cork = document.createElementNS(svgNS, 'path');
    cork.setAttribute('d', 'M30 8 L50 8 L48 24 L32 24 Z');
    cork.setAttribute('fill', '#7a5938');
    cork.setAttribute('stroke', '#3d2a18');
    cork.setAttribute('stroke-width', '1.5');
    svg.appendChild(cork);

    // Bottle lip
    const lip = document.createElementNS(svgNS, 'rect');
    lip.setAttribute('x', '27');
    lip.setAttribute('y', '24');
    lip.setAttribute('width', '26');
    lip.setAttribute('height', '7');
    lip.setAttribute('rx', '3');
    lip.setAttribute('fill', '#25211d');
    lip.setAttribute('stroke', '#6e6253');
    lip.setAttribute('stroke-width', '1.4');
    svg.appendChild(lip);

    // Dark tinted glass body background
    const bodyBg = document.createElementNS(svgNS, 'path');
    bodyBg.setAttribute(
      'd',
      'M31 31 L31 44 C18 50, 14 62, 14 78 L14 106 C14 113, 19 117, 26 117 L54 117 C61 117, 66 113, 66 106 L66 78 C66 62, 62 50, 49 44 L49 31 Z'
    );
    bodyBg.setAttribute('fill', '#171412');
    svg.appendChild(bodyBg);

    // 4 colored bands clipped inside bottle belly
    const bandsGroup = document.createElementNS(svgNS, 'g');
    bandsGroup.setAttribute('clip-path', `url(#${clipId})`);
    const ySlots = [
      { y: 51, h: 12 },
      { y: 67, h: 12 },
      { y: 83, h: 12 },
      { y: 101, h: 12 },
    ];
    (bandIds || []).slice(0, 4).forEach((colorKey, idx) => {
      const swatch = RESISTOR_SWATCHES[String(colorKey).toLowerCase()] || RESISTOR_SWATCHES.black;
      const slot = ySlots[idx];
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', '12');
      rect.setAttribute('y', String(slot.y));
      rect.setAttribute('width', '56');
      rect.setAttribute('height', String(slot.h));
      rect.setAttribute('fill', swatch.hex);
      rect.setAttribute('stroke', swatch.stroke || 'rgba(0,0,0,0.55)');
      rect.setAttribute('stroke-width', '1');
      bandsGroup.appendChild(rect);
    });
    svg.appendChild(bandsGroup);

    // Glass outline & subtle left specular highlight
    const outline = document.createElementNS(svgNS, 'path');
    outline.setAttribute(
      'd',
      'M31 31 L31 44 C18 50, 14 62, 14 78 L14 106 C14 113, 19 117, 26 117 L54 117 C61 117, 66 113, 66 106 L66 78 C66 62, 62 50, 49 44 L49 31'
    );
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', '#8c7e6a');
    outline.setAttribute('stroke-width', '1.8');
    svg.appendChild(outline);

    const glare = document.createElementNS(svgNS, 'path');
    glare.setAttribute('d', 'M21 66 C19 74, 19 94, 21 108');
    glare.setAttribute('fill', 'none');
    glare.setAttribute('stroke', 'rgba(255, 244, 224, 0.24)');
    glare.setAttribute('stroke-width', '2.5');
    glare.setAttribute('stroke-linecap', 'round');
    svg.appendChild(glare);

    return svg;
  }

  /**
   * 9. POTION-SHELF: Banded apothecary vials + color inspection bar + passphrase input.
   */
  function renderPotionShelf(container, config, initialAnswer) {
    const vials = Array.isArray(config.vials) ? config.vials : [];

    const shelfCard = el('div', 'parchment-card potion-shelf-card');
    shelfCard.appendChild(el('div', 'parchment-title', config.shelfTitle || "The Alchemist's Shelf"));

    const inspectBar = el('div', 'vial-inspect-bar', 'Click or hover any vial to inspect its painted collars.');
    const vialsGrid = el('div', 'vials-shelf-grid');

    const formatBands = (bands) =>
      (bands || [])
        .map((b) => (RESISTOR_SWATCHES[String(b).toLowerCase()] || { label: b }).label)
        .join(' · ');

    const cardNodes = [];
    vials.forEach((vial) => {
      const btn = el('button', 'vial-btn');
      btn.type = 'button';
      btn.setAttribute('aria-label', `${vial.label} vial: ${formatBands(vial.bands)}`);
      btn.appendChild(createPotionVialSvg(vial.bands));
      btn.appendChild(el('span', 'vial-tag', vial.label));

      const showInspection = () => {
        cardNodes.forEach((n) => n.classList.remove('is-inspected'));
        btn.classList.add('is-inspected');
        inspectBar.textContent = `${vial.label}: ${formatBands(vial.bands)}`;
      };

      btn.addEventListener('mouseenter', showInspection);
      btn.addEventListener('focus', showInspection);
      btn.addEventListener('click', () => {
        showInspection();
        global.DungeonAudio.playStoneClick(240);
      });

      cardNodes.push(btn);
      vialsGrid.appendChild(btn);
    });

    shelfCard.appendChild(vialsGrid);
    shelfCard.appendChild(el('div', 'shelf-plank'));
    shelfCard.appendChild(inspectBar);
    container.appendChild(shelfCard);

    const inputWrap = el('div', 'seal-input-wrap centered-seal');
    inputWrap.appendChild(el('label', 'seal-input-label', config.prompt || 'Speak the Distilled Word:'));
    const input = el('input', 'seal-text-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = config.inputPlaceholder || 'Enter the word...';
    if (initialAnswer) input.value = initialAnswer;

    inputWrap.appendChild(input);
    container.appendChild(inputWrap);

    return {
      getAnswer: () => input.value,
    };
  }

  /**
   * 10. NONOGRAM: Interactive NxN Picross / Nonogram stone floor (supports drag paint + X marks).
   */
  function renderNonogram(container, config, initialAnswer) {
    const size = config.size || 15;
    const rowHints = Array.isArray(config.rowHints) ? config.rowHints : [];
    const colHints = Array.isArray(config.colHints) ? config.colHints : [];
    const letters = Array.isArray(config.letters) ? config.letters : null;
    const startTile = config.startTile ? String(config.startTile).toUpperCase() : null;
    const exitTile = config.exitTile ? String(config.exitTile).toUpperCase() : null;
    const isWordMode = config.mode === 'word' || Boolean(letters);
    const cols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, size).split('');

    // Cell states: 0 = empty, 1 = filled stone, 2 = crossed out (X)
    const grid = Array.from({ length: size }, () => new Array(size).fill(0));
    const pathGrid = Array.from({ length: size }, () => new Array(size).fill(false));
    const pathSteps = [];

    if (!isWordMode && initialAnswer && /^[01-]+$/.test(initialAnswer)) {
      const rows = initialAnswer.split('-');
      if (rows.length === size) {
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size && c < rows[r].length; c++) {
            grid[r][c] = rows[r][c] === '1' ? 1 : 0;
          }
        }
      }
    }

    const panel = el('div', 'parchment-card nonogram-card');
    if (config.tabletTitle) {
      panel.appendChild(el('div', 'parchment-title', config.tabletTitle));
    }

    // Toolbar: Fill vs Mark (X) vs Trace Path (word mode) + Clear button
    let paintMode = 1; // 1 = Fill, 2 = Mark X, 3 = Trace Knight Path
    const toolbar = el('div', 'nono-toolbar');
    const modeFillBtn = el('button', 'mini-stone-btn nono-mode-btn is-active', '■ Carve Stone');
    const modeMarkBtn = el('button', 'mini-stone-btn nono-mode-btn', '✕ Mark Trap');
    const modePathBtn = isWordMode ? el('button', 'mini-stone-btn nono-mode-btn', '♞ Trace Path') : null;
    const clearBtn = el('button', 'mini-stone-btn', 'Clear Floor');
    [modeFillBtn, modeMarkBtn, modePathBtn, clearBtn].filter(Boolean).forEach((b) => (b.type = 'button'));

    const syncModeBtns = () => {
      modeFillBtn.classList.toggle('is-active', paintMode === 1);
      modeMarkBtn.classList.toggle('is-active', paintMode === 2);
      if (modePathBtn) modePathBtn.classList.toggle('is-active', paintMode === 3);
    };
    modeFillBtn.addEventListener('click', () => {
      paintMode = 1;
      syncModeBtns();
    });
    modeMarkBtn.addEventListener('click', () => {
      paintMode = 2;
      syncModeBtns();
    });
    if (modePathBtn) {
      modePathBtn.addEventListener('click', () => {
        paintMode = 3;
        syncModeBtns();
      });
    }

    toolbar.appendChild(modeFillBtn);
    toolbar.appendChild(modeMarkBtn);
    if (modePathBtn) toolbar.appendChild(modePathBtn);
    toolbar.appendChild(el('span', 'nono-hint-tip', 'Right-click marks ✕ · Drag to paint'));
    toolbar.appendChild(clearBtn);
    panel.appendChild(toolbar);

    const gridScroll = el('div', 'nono-scroll');
    const board = el('div', 'nono-board');
    board.style.gridTemplateColumns = `auto repeat(${size}, var(--nono-cell, 34px))`;
    board.addEventListener('contextmenu', (e) => e.preventDefault());

    const solvedBanner = el(
      'div',
      'nono-solved-banner',
      isWordMode
        ? '✦ Safe Flagstones Revealed — Abyssal Traps Exposed. Trace the Knight’s path from ♞ to ✦.'
        : '✦ Stone Seal Verified — Every Flagstone & Trap Aligned.'
    );
    solvedBanner.hidden = true;

    board.appendChild(el('div', 'nono-corner', '✦'));

    const colHeaderNodes = [];
    for (let c = 0; c < size; c++) {
      const hdr = el('div', 'nono-col-hdr');
      if (c > 0 && c % 5 === 0) hdr.classList.add('is-block-left');
      const nums = Array.isArray(colHints[c]) ? colHints[c] : [colHints[c] ?? 0];
      nums.forEach((n) => hdr.appendChild(el('span', 'nono-clue-num', String(n))));
      hdr.appendChild(el('span', 'nono-axis-lbl', cols[c]));
      colHeaderNodes.push(hdr);
      board.appendChild(hdr);
    }

    const rowHeaderNodes = [];
    const tileNodes = Array.from({ length: size }, () => new Array(size));
    let isDragging = false;
    let dragTargetState = 0;
    let dragPathTarget = false;
    let isNonogramSolved = false;

    function computeLineRuns(arr) {
      const runs = [];
      let cur = 0;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] === 1) {
          cur += 1;
        } else if (cur > 0) {
          runs.push(cur);
          cur = 0;
        }
      }
      if (cur > 0) runs.push(cur);
      return runs.length > 0 ? runs : [0];
    }

    function normalizeHint(h) {
      const arr = Array.isArray(h) ? h.map(Number) : [Number(h) || 0];
      return arr.length > 0 ? arr : [0];
    }

    function checkNonogramSolved() {
      if (rowHints.length !== size || colHints.length !== size) return false;
      for (let r = 0; r < size; r++) {
        const expected = normalizeHint(rowHints[r]);
        const actual = computeLineRuns(grid[r]);
        if (actual.length !== expected.length || !actual.every((v, idx) => v === expected[idx])) {
          return false;
        }
      }
      for (let c = 0; c < size; c++) {
        const colArr = [];
        for (let r = 0; r < size; r++) colArr.push(grid[r][c]);
        const expected = normalizeHint(colHints[c]);
        const actual = computeLineRuns(colArr);
        if (actual.length !== expected.length || !actual.every((v, idx) => v === expected[idx])) {
          return false;
        }
      }
      return true;
    }

    const endDrag = () => {
      isDragging = false;
      if (!container.isConnected) {
        document.removeEventListener('pointerup', endDrag);
      }
    };
    document.addEventListener('pointerup', endDrag);

    function applyCellVisual(r, c) {
      const btn = tileNodes[r][c];
      const val = grid[r][c];
      btn.classList.toggle('is-filled', !isNonogramSolved && val === 1);
      btn.classList.toggle('is-marked', !isNonogramSolved && val === 2);
      btn.classList.toggle('is-stone', isNonogramSolved && val === 1);
      btn.classList.toggle('is-trap', isNonogramSolved && val !== 1);
      btn.classList.toggle('is-path', pathGrid[r][c]);
      if (!letters) {
        btn.textContent = isNonogramSolved ? (val === 1 ? '' : '▲') : val === 2 ? '✕' : '';
      }
    }

    function updateSolvedState(playEffects) {
      const nextSolved = checkNonogramSolved();
      const justSolved = nextSolved && !isNonogramSolved;
      if (nextSolved === isNonogramSolved) return;
      isNonogramSolved = nextSolved;
      panel.classList.toggle('is-nonogram-solved', isNonogramSolved);
      board.classList.toggle('is-nonogram-solved', isNonogramSolved);
      solvedBanner.hidden = !isNonogramSolved;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          applyCellVisual(r, c);
        }
      }

      if (justSolved && playEffects) {
        if (isWordMode && modePathBtn) {
          paintMode = 3;
          syncModeBtns();
        }
        if (global.DungeonAudio && typeof global.DungeonAudio.playRuneChime === 'function') {
          global.DungeonAudio.playRuneChime(440);
        }
      }
    }

    function setCell(r, c, nextVal) {
      if (grid[r][c] === nextVal) return;
      grid[r][c] = nextVal;
      applyCellVisual(r, c);
      updateSolvedState(true);
    }

    const pathTrailEl = el('div', 'nono-path-trail');
    pathTrailEl.hidden = true;

    function updatePathTrail() {
      if (!isWordMode) return;
      pathTrailEl.hidden = pathSteps.length === 0;
      pathTrailEl.textContent = pathSteps.length
        ? `Traced Stride: ${pathSteps.map((s) => `${s.coord}(${s.ch})`).join(' → ')}  [${pathSteps.map((s) => s.ch).join('')}]`
        : '';
    }

    function setPathCell(r, c, on) {
      if (pathGrid[r][c] === on) return;
      pathGrid[r][c] = on;
      const coord = `${cols[c]}${r + 1}`;
      const ch = letters && letters[r] ? letters[r][c] : '';
      if (on) {
        pathSteps.push({ r, c, coord, ch });
      } else {
        const idx = pathSteps.findIndex((s) => s.r === r && s.c === c);
        if (idx !== -1) pathSteps.splice(idx, 1);
      }
      applyCellVisual(r, c);
      updatePathTrail();
    }

    function highlightCrosshair(activeR, activeC) {
      rowHeaderNodes.forEach((h, idx) => h.classList.toggle('is-hover', idx === activeR));
      colHeaderNodes.forEach((h, idx) => h.classList.toggle('is-hover', idx === activeC));
    }

    board.addEventListener('mouseleave', () => highlightCrosshair(-1, -1));

    for (let r = 0; r < size; r++) {
      const rHdr = el('div', 'nono-row-hdr');
      if (r > 0 && r % 5 === 0) rHdr.classList.add('is-block-top');
      rHdr.appendChild(el('span', 'nono-axis-lbl', String(r + 1)));
      const numsWrap = el('div', 'nono-row-nums');
      const nums = Array.isArray(rowHints[r]) ? rowHints[r] : [rowHints[r] ?? 0];
      nums.forEach((n) => numsWrap.appendChild(el('span', 'nono-clue-num', String(n))));
      rHdr.appendChild(numsWrap);
      rowHeaderNodes.push(rHdr);
      board.appendChild(rHdr);

      for (let c = 0; c < size; c++) {
        const coord = `${cols[c]}${r + 1}`;
        const tile = el('button', 'nono-tile');
        tile.type = 'button';
        const ch = letters && letters[r] ? letters[r][c] : '';
        tile.setAttribute('aria-label', ch ? `${coord} (${ch})` : coord);
        if (c > 0 && c % 5 === 0) tile.classList.add('is-block-left');
        if (r > 0 && r % 5 === 0) tile.classList.add('is-block-top');

        if (coord === startTile) {
          tile.classList.add('is-start');
          tile.appendChild(el('span', 'nono-tile-badge badge-start', '♞'));
        } else if (coord === exitTile) {
          tile.classList.add('is-exit');
          tile.appendChild(el('span', 'nono-tile-badge badge-exit', '✦'));
        }

        if (letters) {
          tile.classList.add('has-letter');
          tile.appendChild(el('span', 'nono-tile-char', ch));
          tile.appendChild(el('span', 'nono-tile-x', '✕'));
          tile.appendChild(el('span', 'nono-tile-trap-icon', '▲'));
        }
        tile.style.setProperty('--flip-delay', `${(r + c) * 20}ms`);

        tile.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          const tool = paintMode === 3 ? 3 : e.button === 2 ? 2 : paintMode;
          if (tool === 3) {
            dragPathTarget = e.button === 2 ? false : !pathGrid[r][c];
            isDragging = true;
            setPathCell(r, c, dragPathTarget);
            global.DungeonAudio.playStoneClick(dragPathTarget ? 320 : 180);
            return;
          }
          const cur = grid[r][c];
          dragTargetState = cur === tool ? 0 : tool;
          isDragging = true;
          setCell(r, c, dragTargetState);
          global.DungeonAudio.playStoneClick(dragTargetState === 1 ? 260 : 155);
        });

        tile.addEventListener('pointerenter', () => {
          highlightCrosshair(r, c);
          if (!isDragging) return;
          if (paintMode === 3) {
            setPathCell(r, c, dragPathTarget);
          } else {
            setCell(r, c, dragTargetState);
          }
        });

        tile.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (paintMode === 3) {
              const nextP = !pathGrid[r][c];
              setPathCell(r, c, nextP);
              global.DungeonAudio.playStoneClick(nextP ? 320 : 180);
              return;
            }
            const cur = grid[r][c];
            const next = cur === paintMode ? 0 : paintMode;
            setCell(r, c, next);
            global.DungeonAudio.playStoneClick(next === 1 ? 260 : 155);
          }
        });

        tileNodes[r][c] = tile;
        board.appendChild(tile);
        applyCellVisual(r, c);
      }
    }

    clearBtn.addEventListener('click', () => {
      isNonogramSolved = false;
      panel.classList.remove('is-nonogram-solved');
      board.classList.remove('is-nonogram-solved');
      solvedBanner.hidden = true;
      pathSteps.length = 0;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          grid[r][c] = 0;
          pathGrid[r][c] = false;
          applyCellVisual(r, c);
        }
      }
      updatePathTrail();
      global.DungeonAudio.playStoneClick(130);
    });

    updateSolvedState(false);

    gridScroll.appendChild(board);
    panel.appendChild(gridScroll);
    panel.appendChild(solvedBanner);
    if (isWordMode) panel.appendChild(pathTrailEl);
    container.appendChild(panel);

    if (isWordMode) {
      const inputWrap = el('div', 'seal-input-wrap centered-seal');
      inputWrap.appendChild(el('label', 'seal-input-label', config.prompt || 'Speak the Banquet Passphrase:'));
      const input = el('input', 'seal-text-input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.placeholder = config.inputPlaceholder || 'Enter the word...';
      if (initialAnswer) input.value = initialAnswer;

      inputWrap.appendChild(input);
      container.appendChild(inputWrap);

      return {
        getAnswer: () => input.value,
      };
    }

    return {
      getAnswer: () => grid.map((row) => row.map((v) => (v === 1 ? '1' : '0')).join('')).join('-'),
    };
  }

  /**
   * PNG tEXt chunk injector (standard CRC32) for Zest-style downloadable image forensics.
   */
  const CRC32_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      t[i] = c >>> 0;
    }
    return t;
  })();

  function crc32Bytes(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makePngTextChunk(keyword, text) {
    const k = String(keyword || '').slice(0, 79);
    const v = String(text || '');
    const dataLen = k.length + 1 + v.length;
    const chunk = new Uint8Array(4 + 4 + dataLen + 4);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, dataLen, false);
    chunk[4] = 116; // 't'
    chunk[5] = 69;  // 'E'
    chunk[6] = 88;  // 'X'
    chunk[7] = 116; // 't'
    for (let i = 0; i < k.length; i++) chunk[8 + i] = k.charCodeAt(i) & 0xff;
    chunk[8 + k.length] = 0;
    for (let i = 0; i < v.length; i++) chunk[9 + k.length + i] = v.charCodeAt(i) & 0xff;
    const crc = crc32Bytes(chunk.subarray(4, 8 + dataLen));
    view.setUint32(8 + dataLen, crc, false);
    return chunk;
  }

  async function injectPngTextMetadata(pngBlob, metadataPairs) {
    const raw = new Uint8Array(await pngBlob.arrayBuffer());
    if (raw.length < 33) return pngBlob;
    const ihdrLen = new DataView(raw.buffer, raw.byteOffset, raw.byteLength).getUint32(8, false);
    const splitAt = 8 + 4 + 4 + ihdrLen + 4;
    const extraChunks = (metadataPairs || []).map(([k, v]) => makePngTextChunk(k, v));
    const totalExtra = extraChunks.reduce((sum, c) => sum + c.length, 0);
    const out = new Uint8Array(raw.length + totalExtra);
    out.set(raw.subarray(0, splitAt), 0);
    let offset = splitAt;
    extraChunks.forEach((c) => {
      out.set(c, offset);
      offset += c.length;
    });
    out.set(raw.subarray(splitAt), offset);
    return new Blob([out], { type: 'image/png' });
  }

  function renderChannelLayer(w, h, drawFn) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    drawFn(ctx, w, h);
    return ctx.getImageData(0, 0, w, h).data;
  }

  /**
   * 11. DARK-FRESCO: Interactive canvas image & PNG download widget.
   */
  function renderDarkFresco(container, config, initialAnswer) {
    const size = 1200;
    const redCfg = config.redLayer || { text: '', stretch: 'vertical', factor: 1 };
    const greenCfg = config.greenLayer || { text: '', stretch: 'horizontal', factor: 1 };
    const metaPairs = Array.isArray(config.metadata) ? config.metadata : [];

    const card = el('div', 'parchment-card fresco-card');
    card.appendChild(el('div', 'parchment-title', config.frameTitle || 'The Unfinished Portrait'));

    const frame = el('div', 'fresco-frame');
    const img = document.createElement('img');
    img.className = 'fresco-img';
    img.alt = config.altText || 'A pitch-dark oil fresco';
    frame.appendChild(img);
    card.appendChild(frame);

    const actionsRow = el('div', 'fresco-actions');
    const downloadBtn = el('a', 'mini-stone-btn fresco-dl-btn', '⬇ Download Fresco (.png)');
    downloadBtn.download = config.filename || 'dark-fresco.png';
    actionsRow.appendChild(downloadBtn);
    actionsRow.appendChild(el('span', 'fresco-meta-note', '1200×1200 Oil Canvas · Inspect carefully'));
    card.appendChild(actionsRow);
    container.appendChild(card);

    // Scarlet (Red text): stretched 1:15 vertically across the canvas
    const redData = renderChannelLayer(size, size, (ctx) => {
      const f = redCfg.factor || 15;
      const src = document.createElement('canvas');
      src.width = 1100;
      src.height = 68;
      const sctx = src.getContext('2d');
      sctx.fillStyle = '#000';
      sctx.fillRect(0, 0, src.width, src.height);
      sctx.fillStyle = '#fff';
      sctx.font = 'bold 42px "Courier New", monospace';
      sctx.textAlign = 'center';
      sctx.textBaseline = 'middle';
      sctx.fillText(redCfg.text, src.width / 2, src.height / 2);
      ctx.drawImage(src, 50, (size - src.height * f) / 2, src.width, src.height * f);
    });

    // Verdigris (Green text): stretched 12:1 horizontally across the canvas
    const greenData = renderChannelLayer(size, size, (ctx) => {
      const f = greenCfg.factor || 12;
      const src = document.createElement('canvas');
      src.width = 96;
      src.height = 240;
      const sctx = src.getContext('2d');
      sctx.fillStyle = '#000';
      sctx.fillRect(0, 0, src.width, src.height);
      sctx.fillStyle = '#fff';
      const parts = String(greenCfg.text).split('\n');
      sctx.font = 'bold 24px "Courier New", monospace';
      sctx.textAlign = 'center';
      sctx.textBaseline = 'middle';
      if (parts.length > 1) {
        sctx.fillText(parts[0], src.width / 2, 82);
        sctx.fillText(parts[1], src.width / 2, 158);
      } else {
        sctx.fillText(parts[0], src.width / 2, src.height / 2);
      }
      ctx.drawImage(src, (size - src.width * f) / 2, (size - src.height) / 2, src.width * f, src.height);
    });

    // Shared dark chiaroscuro portrait across all 3 channels (10..110) so Curves alone fails
    const baseData = renderChannelLayer(size, size, (ctx) => {
      const grad = ctx.createRadialGradient(size * 0.5, size * 0.42, 60, size * 0.5, size * 0.5, size * 0.56);
      grad.addColorStop(0, '#5a5a5a');
      grad.addColorStop(1, '#121212');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Hooded figure silhouette & cloak folds
      ctx.fillStyle = '#787878';
      ctx.beginPath();
      ctx.arc(size * 0.5, size * 0.35, 165, Math.PI, 0);
      ctx.lineTo(size * 0.72, size * 0.9);
      ctx.lineTo(size * 0.28, size * 0.9);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#242424';
      ctx.beginPath();
      ctx.ellipse(size * 0.5, size * 0.37, 92, 118, 0, 0, Math.PI * 2);
      ctx.fill();

      // Heavy painterly strokes across the dynamic range
      ctx.strokeStyle = '#9a9a9a';
      ctx.lineWidth = 10;
      for (let x = 42; x < size; x += 52) {
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x + ((x * 7) % 27) - 13, size - 30);
        ctx.stroke();
      }
      for (let y = 55; y < size; y += 64) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(size - 30, y + ((y * 5) % 23) - 11);
        ctx.stroke();
      }
    });

    const master = document.createElement('canvas');
    master.width = size;
    master.height = size;
    const mctx = master.getContext('2d');
    const outImg = mctx.createImageData(size, size);
    const out = outImg.data;

    for (let i = 0; i < out.length; i += 4) {
      const px = i >> 2;
      const hash = ((px * 2654435761) >>> 0) % 13; // 0..12 deterministic oil-canvas grain
      const grain = hash - 6; // -6..+6 identical across R, G, B (cancels on channel subtract)
      const base = Math.max(8, Math.round((baseData[i] / 255) * 44) + 20 + grain);
      const rSig = redData[i] > 110 ? 2 : 0;
      const gSig = greenData[i] > 110 ? 2 : 0;
      out[i] = base - rSig;
      out[i + 1] = base - gSig;
      out[i + 2] = base;
      out[i + 3] = 255;
    }
    mctx.putImageData(outImg, 0, 0);

    master.toBlob(async (rawBlob) => {
      if (!rawBlob) return;
      const finalBlob = await injectPngTextMetadata(rawBlob, metaPairs);
      const url = URL.createObjectURL(finalBlob);
      img.src = url;
      downloadBtn.href = url;
    }, 'image/png');

    const inputWrap = el('div', 'seal-input-wrap centered-seal');
    inputWrap.appendChild(el('label', 'seal-input-label', config.prompt || 'Speak the True Title:'));
    const input = el('input', 'seal-text-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = config.inputPlaceholder || 'Enter the word...';
    if (initialAnswer) input.value = initialAnswer;

    inputWrap.appendChild(input);
    container.appendChild(inputWrap);

    return {
      getAnswer: () => input.value,
    };
  }

  /* =========================================================
     12. BESTIARY-TOME WIDGET
     ========================================================= */
  function renderBestiaryTome(container, config, initialAnswer) {
    const entries = (config.entries || []).map((entry, idx) => ({
      ...entry,
      originalIndex: idx,
      note: '',
    }));

    const folio = el('div', 'bestiary-folio');

    if (config.tomeTitle || config.tomeSubtitle) {
      const header = el('div', 'bestiary-header');
      if (config.tomeTitle) {
        header.appendChild(el('div', 'bestiary-title', config.tomeTitle));
      }
      if (config.tomeSubtitle) {
        header.appendChild(el('div', 'bestiary-subtitle', config.tomeSubtitle));
      }
      folio.appendChild(header);
    }

    const toolbar = el('div', 'bestiary-toolbar');
    toolbar.appendChild(
      el('span', 'bestiary-toolbar-note', config.toolbarNote || 'Errata ledger — reorder entries or jot margin notes:')
    );
    const resetOrderBtn = el('button', 'mini-stone-btn', 'Reset Order');
    resetOrderBtn.type = 'button';
    toolbar.appendChild(resetOrderBtn);
    folio.appendChild(toolbar);

    const listEl = el('div', 'bestiary-list');
    folio.appendChild(listEl);

    function moveEntry(pos, delta) {
      const target = pos + delta;
      if (target < 0 || target >= entries.length) return;
      const [item] = entries.splice(pos, 1);
      entries.splice(target, 0, item);
      if (global.DungeonAudio && typeof global.DungeonAudio.playStoneClick === 'function') {
        global.DungeonAudio.playStoneClick(delta < 0 ? 210 : 165);
      }
      renderEntries();
    }

    function renderEntries() {
      listEl.innerHTML = '';
      entries.forEach((entry, pos) => {
        const card = el('article', 'bestiary-card');

        const topRow = el('div', 'bestiary-card-top');
        const titleGroup = el('div', 'bestiary-card-heading');
        titleGroup.appendChild(el('h3', 'bestiary-monster-name', entry.name));
        if (entry.meta) {
          titleGroup.appendChild(el('div', 'bestiary-monster-meta', entry.meta));
        }
        topRow.appendChild(titleGroup);

        const controls = el('div', 'bestiary-card-controls');
        if (entry.cr !== undefined && entry.cr !== null) {
          controls.appendChild(el('span', 'bestiary-cr-badge', `CR ${entry.cr}`));
        }

        const noteInput = el('input', 'bestiary-note-input');
        noteInput.type = 'text';
        noteInput.maxLength = 1;
        noteInput.autocomplete = 'off';
        noteInput.spellcheck = false;
        noteInput.placeholder = '?';
        noteInput.setAttribute('aria-label', `Margin letter note for ${entry.name}`);
        noteInput.value = entry.note || '';
        noteInput.addEventListener('input', () => {
          entry.note = noteInput.value.toUpperCase().slice(0, 1);
          noteInput.value = entry.note;
        });
        controls.appendChild(noteInput);

        const upBtn = el('button', 'bestiary-move-btn', '▲');
        upBtn.type = 'button';
        upBtn.title = 'Move entry up';
        upBtn.setAttribute('aria-label', `Move ${entry.name} up`);
        upBtn.disabled = pos === 0;
        upBtn.addEventListener('click', () => moveEntry(pos, -1));

        const downBtn = el('button', 'bestiary-move-btn', '▼');
        downBtn.type = 'button';
        downBtn.title = 'Move entry down';
        downBtn.setAttribute('aria-label', `Move ${entry.name} down`);
        downBtn.disabled = pos === entries.length - 1;
        downBtn.addEventListener('click', () => moveEntry(pos, 1));

        controls.appendChild(upBtn);
        controls.appendChild(downBtn);
        topRow.appendChild(controls);
        card.appendChild(topRow);

        const statsRow = el('div', 'bestiary-stats-row');
        if (entry.ac !== undefined) {
          statsRow.appendChild(el('span', 'bestiary-stat-pill', `AC ${entry.ac}`));
        }
        if (entry.hp !== undefined) {
          statsRow.appendChild(el('span', 'bestiary-stat-pill', `HP ${entry.hp}`));
        }
        if (statsRow.childNodes.length > 0) {
          card.appendChild(statsRow);
        }

        const loreEl = el('p', 'bestiary-lore', entry.text);
        card.appendChild(loreEl);

        listEl.appendChild(card);
      });
    }

    resetOrderBtn.addEventListener('click', () => {
      entries.sort((a, b) => a.originalIndex - b.originalIndex);
      if (global.DungeonAudio && typeof global.DungeonAudio.playStoneClick === 'function') {
        global.DungeonAudio.playStoneClick(150);
      }
      renderEntries();
    });

    renderEntries();
    container.appendChild(folio);

    const inputWrap = el('div', 'seal-input-wrap centered-seal');
    inputWrap.appendChild(el('label', 'seal-input-label', config.prompt || 'Speak the Errata Word:'));
    const input = el('input', 'seal-text-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = config.inputPlaceholder || 'Enter the word...';
    if (initialAnswer) input.value = initialAnswer;

    inputWrap.appendChild(input);
    container.appendChild(inputWrap);

    return {
      getAnswer: () => input.value,
    };
  }

  /* =========================================================
     13. META-CROSSWORD WIDGET
     ========================================================= */
  function renderMetaCrossword(container, config, initialAnswer) {
    const rows = (config.rows || []).map((row) => ({
      roman: row.roman || '',
      length: Number(row.length) || 0,
      offset: Number(row.offset) || 0,
      letters: new Array(Number(row.length) || 0).fill(''),
    }));
    const totalCols = Number(config.totalCols) || 9;
    const rowBits = new Array(rows.length).fill(0);
    const colBits = new Array(totalCols).fill(0);
    let leverPulled = false;

    const apparatus = el('div', 'meta-apparatus');

    const header = el('div', 'meta-header');
    const titleGroup = el('div', 'meta-header-titles');
    titleGroup.appendChild(
      el('div', 'meta-title', config.apparatusTitle || 'Crossword Bit-Sieve')
    );
    titleGroup.appendChild(
      el(
        'div',
        'meta-subtitle',
        config.apparatusSubtitle ||
          'Inscribe each chamber word, toggle the row and column bits, then pull the lever.'
      )
    );
    header.appendChild(titleGroup);

    const clearBtn = el('button', 'mini-stone-btn', 'Clear Grid');
    clearBtn.type = 'button';
    header.appendChild(clearBtn);
    apparatus.appendChild(header);

    const gridScroll = el('div', 'meta-grid-scroll');
    const gridEl = el('div', 'meta-grid');
    gridEl.style.setProperty('--meta-cols', String(totalCols));
    gridScroll.appendChild(gridEl);
    apparatus.appendChild(gridScroll);

    const leverDeck = el('div', 'meta-lever-deck');
    const leverBtn = el('button', 'meta-lever-btn');
    leverBtn.type = 'button';
    const leverHandle = el('span', 'meta-lever-handle', '⟋');
    const leverLabel = el('span', 'meta-lever-label', 'Pull Filter Lever');
    leverBtn.appendChild(leverHandle);
    leverBtn.appendChild(leverLabel);
    leverDeck.appendChild(leverBtn);

    const extractWrap = el('div', 'meta-extract-wrap');
    extractWrap.appendChild(el('span', 'meta-extract-label', 'Filtered Key:'));
    const extractOut = el('div', 'meta-extract-out', '—');
    extractWrap.appendChild(extractOut);
    leverDeck.appendChild(extractWrap);

    apparatus.appendChild(leverDeck);

    // Keep track of row cell inputs for smooth auto-advance / backspace
    const rowInputs = rows.map(() => []);
    const cellGridRefs = rows.map(() => []);
    const rowElRefs = [];
    const rowBitBtns = [];
    const colBitBtns = [];

    function updateFilterVisuals() {
      leverBtn.classList.toggle('is-pulled', leverPulled);
      leverHandle.textContent = leverPulled ? '⟍' : '⟋';
      leverLabel.textContent = leverPulled ? 'Reset Filter Lever' : 'Pull Filter Lever';

      const chunks = [];
      rows.forEach((row, rIdx) => {
        const rOn = rowBits[rIdx] === 1;
        if (rowElRefs[rIdx]) {
          rowElRefs[rIdx].classList.toggle('is-row-dropped', leverPulled && !rOn);
        }

        let rowChars = '';
        for (let i = 0; i < row.length; i++) {
          const c = row.offset + i;
          const cOn = colBits[c] === 1;
          const active = rOn && cOn;
          const cellEl = cellGridRefs[rIdx][i];
          if (cellEl) {
            cellEl.classList.toggle('is-intersect', active);
            cellEl.classList.toggle('is-kept', leverPulled && active);
            cellEl.classList.toggle('is-filtered-out', leverPulled && !active);
          }
          if (leverPulled && active) {
            rowChars += row.letters[i] || '?';
          }
        }
        if (leverPulled && rOn && rowChars.length > 0) {
          chunks.push(rowChars);
        }
      });

      extractOut.textContent = leverPulled ? (chunks.length ? chunks.join(' · ') : '—') : '—';
      extractOut.classList.toggle('is-lit', leverPulled && chunks.length > 0);
    }

    // Column bits header row
    const colBitsRow = el('div', 'meta-grid-row meta-col-bits-row');
    colBitsRow.appendChild(el('span', 'meta-corner-label', 'ROW'));
    colBitsRow.appendChild(el('span', 'meta-corner-bit', 'BIT'));
    for (let c = 0; c < totalCols; c++) {
      const cBtn = el('button', 'meta-bit-btn', '0');
      cBtn.type = 'button';
      cBtn.title = `Column ${c + 1} bit`;
      cBtn.setAttribute('aria-label', `Column ${c + 1} bit`);
      cBtn.addEventListener('click', () => {
        colBits[c] = colBits[c] ? 0 : 1;
        cBtn.textContent = String(colBits[c]);
        cBtn.classList.toggle('is-on', colBits[c] === 1);
        if (global.DungeonAudio) {
          global.DungeonAudio.playStoneClick(colBits[c] ? 240 : 150);
        }
        updateFilterVisuals();
      });
      colBitBtns.push(cBtn);
      colBitsRow.appendChild(cBtn);
    }
    gridEl.appendChild(colBitsRow);

    // Word rows
    rows.forEach((row, rIdx) => {
      const rowEl = el('div', 'meta-grid-row meta-word-row');
      rowElRefs.push(rowEl);

      const badge = el('span', 'meta-row-roman', row.roman);
      badge.title = `Answer from Chamber ${row.roman}`;
      rowEl.appendChild(badge);

      const rBtn = el('button', 'meta-bit-btn', '0');
      rBtn.type = 'button';
      rBtn.title = `Row ${rIdx + 1} (${row.roman}) bit`;
      rBtn.setAttribute('aria-label', `Row ${rIdx + 1} bit`);
      rBtn.addEventListener('click', () => {
        rowBits[rIdx] = rowBits[rIdx] ? 0 : 1;
        rBtn.textContent = String(rowBits[rIdx]);
        rBtn.classList.toggle('is-on', rowBits[rIdx] === 1);
        if (global.DungeonAudio) {
          global.DungeonAudio.playStoneClick(rowBits[rIdx] ? 220 : 140);
        }
        updateFilterVisuals();
      });
      rowBitBtns.push(rBtn);
      rowEl.appendChild(rBtn);

      for (let c = 0; c < totalCols; c++) {
        const idx = c - row.offset;
        if (idx >= 0 && idx < row.length) {
          const inp = el('input', 'meta-grid-input');
          inp.type = 'text';
          inp.maxLength = 1;
          inp.autocomplete = 'off';
          inp.spellcheck = false;
          inp.setAttribute('aria-label', `Chamber ${row.roman} letter ${idx + 1}`);

          inp.addEventListener('input', () => {
            const clean = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (clean.length > 1) {
              // Support paste/fast typing spread across row
              for (let k = 0; k < clean.length && idx + k < row.length; k++) {
                row.letters[idx + k] = clean[k];
                rowInputs[rIdx][idx + k].value = clean[k];
              }
              const nextPos = Math.min(row.length - 1, idx + clean.length);
              rowInputs[rIdx][nextPos].focus();
            } else {
              const ch = clean.slice(0, 1);
              row.letters[idx] = ch;
              inp.value = ch;
              if (ch && idx + 1 < row.length) {
                rowInputs[rIdx][idx + 1].focus();
              }
            }
            if (leverPulled) updateFilterVisuals();
          });

          inp.addEventListener('paste', (e) => {
            const pasted = (e.clipboardData || global.clipboardData)?.getData('text') || '';
            const clean = pasted.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (clean.length > 1) {
              e.preventDefault();
              for (let k = 0; k < clean.length && idx + k < row.length; k++) {
                row.letters[idx + k] = clean[k];
                rowInputs[rIdx][idx + k].value = clean[k];
              }
              const nextPos = Math.min(row.length - 1, idx + clean.length);
              rowInputs[rIdx][nextPos].focus();
              if (leverPulled) updateFilterVisuals();
            }
          });

          inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              leverBtn.click();
              return;
            }
            if (e.key === 'Backspace' && !inp.value && idx > 0) {
              rowInputs[rIdx][idx - 1].focus();
            } else if (e.key === 'ArrowLeft' && idx > 0) {
              e.preventDefault();
              rowInputs[rIdx][idx - 1].focus();
            } else if (e.key === 'ArrowRight' && idx + 1 < row.length) {
              e.preventDefault();
              rowInputs[rIdx][idx + 1].focus();
            }
          });

          rowInputs[rIdx][idx] = inp;
          cellGridRefs[rIdx][idx] = inp;
          rowEl.appendChild(inp);
        } else {
          rowEl.appendChild(el('span', 'meta-grid-spacer'));
        }
      }

      gridEl.appendChild(rowEl);
    });

    leverBtn.addEventListener('click', () => {
      leverPulled = !leverPulled;
      if (global.DungeonAudio && typeof global.DungeonAudio.playIronClank === 'function') {
        global.DungeonAudio.playIronClank();
      }
      updateFilterVisuals();
    });

    clearBtn.addEventListener('click', () => {
      leverPulled = false;
      rowBits.fill(0);
      colBits.fill(0);
      rowBitBtns.forEach((b) => {
        b.textContent = '0';
        b.classList.remove('is-on');
      });
      colBitBtns.forEach((b) => {
        b.textContent = '0';
        b.classList.remove('is-on');
      });
      rows.forEach((row, rIdx) => {
        row.letters.fill('');
        rowInputs[rIdx].forEach((inp) => {
          inp.value = '';
        });
      });
      if (global.DungeonAudio) {
        global.DungeonAudio.playStoneClick(130);
      }
      updateFilterVisuals();
    });

    updateFilterVisuals();
    container.appendChild(apparatus);

    const inputWrap = el('div', 'seal-input-wrap centered-seal');
    inputWrap.appendChild(el('label', 'seal-input-label', config.prompt || 'Speak the Final Phrase:'));
    const input = el('input', 'seal-text-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = config.inputPlaceholder || 'Enter the 3-word phrase...';
    if (initialAnswer) input.value = initialAnswer;

    inputWrap.appendChild(input);
    container.appendChild(inputWrap);

    return {
      getAnswer: () => input.value,
    };
  }

  /* =========================================================
     14. SPECTROGRAM-PIPE WIDGET
     ========================================================= */
  const SPECTRO_FONT_5X7 = {
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    G: ['01111', '10000', '10000', '10111', '10001', '10001', '01110'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
    X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
    ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  };

  function buildSpectrogramWavBytes(text, opts) {
    const sampleRate = 22050;
    const minHz = (opts && opts.minHz) || 1400;
    const maxHz = (opts && opts.maxHz) || 6600;
    const colSec = (opts && opts.colSec) || 0.14;
    const padSec = 0.45;
    const chars = String(text || '')
      .toUpperCase()
      .split('');

    // Build column matrix: each col is an array of 7 rows (0=top/highHz..6=bottom/lowHz)
    const columns = [];
    chars.forEach((ch, idx) => {
      const glyph = SPECTRO_FONT_5X7[ch] || SPECTRO_FONT_5X7[' '];
      for (let c = 0; c < 5; c++) {
        const col = [];
        for (let r = 0; r < 7; r++) {
          col.push(glyph[r][c] === '1' ? 1 : 0);
        }
        columns.push(col);
      }
      if (idx < chars.length - 1) {
        columns.push([0, 0, 0, 0, 0, 0, 0]);
        columns.push([0, 0, 0, 0, 0, 0, 0]);
      }
    });

    const leadSamples = Math.floor(padSec * sampleRate);
    const colSamples = Math.floor(colSec * sampleRate);
    const totalSamples = leadSamples * 2 + columns.length * colSamples;
    const pcm = new Float32Array(totalSamples);

    // Haunting sub-950 Hz dungeon cellar wind & dissonant iron-pipe groan (leaves 1.4-6.6 kHz crisp)
    let rng = 0x51a9c3;
    let lp1 = 0;
    let lp2 = 0;
    const lpAlpha = 0.095; // ~360 Hz smooth wind low-pass
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const masterEnv = Math.min(
        1,
        i / (0.28 * sampleRate),
        (totalSamples - 1 - i) / (0.35 * sampleRate)
      );
      const swell = 0.72 + 0.28 * Math.sin(2 * Math.PI * 0.42 * t + 0.4);
      const moanHz = 216 + 9 * Math.sin(2 * Math.PI * 0.31 * t);

      // Deterministic PRNG -> two-pole low-passed cold cellar draft
      rng = (rng * 1664525 + 1013904223) >>> 0;
      const white = (rng / 0xffffffff) * 2 - 1;
      lp1 += lpAlpha * (white - lp1);
      lp2 += lpAlpha * (lp1 - lp2);

      const drone =
        0.095 * Math.sin(2 * Math.PI * 55 * t) +
        0.07 * Math.sin(2 * Math.PI * 82.4 * t + 0.7) +
        0.048 * Math.sin(2 * Math.PI * 116.5 * t + 1.4) + // eerie tritone pipe resonance
        0.032 * Math.sin(2 * Math.PI * moanHz * t + 2.1) +
        0.34 * lp2 * swell;

      pcm[i] = drone * masterEnv;
    }

    // Eerie wind-like 9-partial shimmer per row, continuous across neighboring lit pixels
    const partialDeltas = [-168, -124, -81, -39, 0, 39, 81, 124, 168];
    const rowCount = 7;
    const fadeSamples = Math.max(1, Math.floor(0.28 * colSamples));

    for (let r = 0; r < rowCount; r++) {
      const centerHz = maxHz - (r / (rowCount - 1)) * (maxHz - minHz);
      // Pre-check if row is ever used
      let hasLit = false;
      for (let c = 0; c < columns.length; c++) {
        if (columns[c][r]) {
          hasLit = true;
          break;
        }
      }
      if (!hasLit) continue;

      partialDeltas.forEach((delta, pIdx) => {
        const freq = centerHz + delta + ((pIdx * 17 + r * 11) % 7) - 3;
        const phaseOffset = ((r * 17 + pIdx * 29) % 37) * 0.17;
        const lfoRate = 2.6 + ((r + pIdx) % 5) * 0.85;
        const weight = (pIdx === 4 ? 0.034 : 0.025) * (0.85 + 0.15 * Math.cos(pIdx));

        for (let colIdx = 0; colIdx < columns.length; colIdx++) {
          if (!columns[colIdx][r]) continue;
          const prevLit = colIdx > 0 && columns[colIdx - 1][r] === 1;
          const nextLit = colIdx < columns.length - 1 && columns[colIdx + 1][r] === 1;
          const startSample = leadSamples + colIdx * colSamples;

          for (let k = 0; k < colSamples; k++) {
            let env = 1;
            if (!prevLit && k < fadeSamples) {
              env = 0.5 * (1 - Math.cos((Math.PI * k) / fadeSamples));
            } else if (!nextLit && k >= colSamples - fadeSamples) {
              const rem = colSamples - 1 - k;
              env = 0.5 * (1 - Math.cos((Math.PI * rem) / fadeSamples));
            }
            const t = (startSample + k) / sampleRate;
            const flutter = 0.78 + 0.22 * Math.sin(2 * Math.PI * lfoRate * t + phaseOffset);
            pcm[startSample + k] +=
              weight * env * flutter * Math.sin(2 * Math.PI * freq * t + phaseOffset);
          }
        }
      });
    }

    // Normalize safely if peak approaches 0.92
    let peak = 0;
    for (let i = 0; i < totalSamples; i++) {
      const a = Math.abs(pcm[i]);
      if (a > peak) peak = a;
    }
    const scale = peak > 0.9 ? 0.9 / peak : 1;

    // Encode 44-byte RIFF/WAVE 16-bit Mono PCM
    const dataSize = totalSamples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeAscii(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeAscii(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(8, 'WAVE');
    writeAscii(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // AudioFormat = PCM
    view.setUint16(22, 1, true); // NumChannels = 1
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeAscii(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < totalSamples; i++) {
      const clamped = Math.max(-1, Math.min(1, pcm[i] * scale));
      view.setInt16(offset, Math.round(clamped * 32767), true);
      offset += 2;
    }

    return new Uint8Array(buffer);
  }

  function renderSpectrogramPipe(container, config, initialAnswer) {
    const wavBytes = buildSpectrogramWavBytes(config.spectrogramText || '', {
      minHz: config.minHz,
      maxHz: config.maxHz,
      colSec: config.colSec,
    });
    const wavBlob = new Blob([wavBytes], { type: 'audio/wav' });
    const wavUrl = URL.createObjectURL(wavBlob);
    const filename = config.downloadName || 'shrieking-pipe.wav';

    const panel = el('div', 'pipe-panel');

    const head = el('div', 'pipe-header');
    head.appendChild(el('div', 'pipe-title', config.pipeTitle || 'Cast-Iron Steam Conduit · Acoustic Sample'));
    head.appendChild(el('span', 'pipe-badge', config.gaugeTag || '22050 Hz · 1.4 – 6.6 kHz'));
    panel.appendChild(head);

    // Visual dungeon pipe & brass gauge card
    const visual = el('div', 'pipe-visual-card');
    visual.innerHTML = `
      <svg viewBox="0 0 360 96" class="pipe-svg" aria-hidden="true">
        <defs>
          <linearGradient id="ironPipeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#4e433a"/>
            <stop offset="50%" stop-color="#261f1a"/>
            <stop offset="100%" stop-color="#14100d"/>
          </linearGradient>
        </defs>
        <rect x="16" y="34" width="328" height="28" rx="4" fill="url(#ironPipeGrad)" stroke="#755a36" stroke-width="1.5"/>
        <rect x="74" y="28" width="14" height="40" rx="2" fill="#3a2f27" stroke="#9b7946" stroke-width="1.2"/>
        <rect x="272" y="28" width="14" height="40" rx="2" fill="#3a2f27" stroke="#9b7946" stroke-width="1.2"/>
        <circle cx="180" cy="48" r="26" fill="#17120e" stroke="#b38a4c" stroke-width="2"/>
        <circle cx="180" cy="48" r="20" fill="none" stroke="#584735" stroke-width="1" stroke-dasharray="2 3"/>
        <path d="M 180 48 L 193 36" stroke="#c84c3c" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="180" cy="48" r="3.5" fill="#d8a85c"/>
        <text x="180" y="88" text-anchor="middle" fill="#b7a487" font-size="10" font-family="monospace">
          SEE WHAT YOU HEAR
        </text>
      </svg>
    `;
    panel.appendChild(visual);

    const audioEl = new Audio(wavUrl);
    audioEl.preload = 'auto';

    const controls = el('div', 'pipe-controls');

    const playBtn = el('button', 'primary-seal-btn pipe-play-btn', '▶ Uncap the Pipe (Play)');
    playBtn.type = 'button';

    const dlLink = el('a', 'mini-stone-btn pipe-download-btn', `⬇ Download ${filename}`);
    dlLink.href = wavUrl;
    dlLink.download = filename;

    const statusLine = el('span', 'pipe-status', 'Valve sealed · examine the wave to catch the spectre');

    function syncPlayUi() {
      const playing = !audioEl.paused && !audioEl.ended;
      playBtn.textContent = playing ? '■ Seal Valve (Stop)' : '▶ Uncap the Pipe (Play)';
      playBtn.classList.toggle('is-playing', playing);
      statusLine.textContent = playing
        ? 'Steam howling through the brass conduit...'
        : 'Valve sealed · examine the wave to catch the spectre';
    }

    function stopPipeAudio() {
      audioEl.pause();
      audioEl.currentTime = 0;
      syncPlayUi();
    }

    playBtn.addEventListener('click', () => {
      if (!audioEl.paused && !audioEl.ended) {
        stopPipeAudio();
        return;
      }
      if (global.DungeonAudio && !global.DungeonAudio.enabled) {
        statusLine.textContent = 'Audio muted — unmute sound in header or download the .wav file';
        return;
      }
      if (global.DungeonAudio && global.DungeonAudio._activeStops && typeof global.DungeonAudio._activeStops.add === 'function') {
        global.DungeonAudio._activeStops.add(stopPipeAudio);
      }
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
      syncPlayUi();
    });

    audioEl.addEventListener('ended', syncPlayUi);
    audioEl.addEventListener('pause', syncPlayUi);

    controls.appendChild(playBtn);
    controls.appendChild(dlLink);
    panel.appendChild(controls);
    panel.appendChild(statusLine);

    container.appendChild(panel);

    const inputWrap = el('div', 'seal-input-wrap centered-seal');
    inputWrap.appendChild(el('label', 'seal-input-label', config.prompt || 'Speak the Pipe Echo:'));
    const input = el('input', 'seal-text-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = config.inputPlaceholder || 'Enter the 5-letter word...';
    if (initialAnswer) input.value = initialAnswer;

    inputWrap.appendChild(input);
    container.appendChild(inputWrap);

    return {
      getAnswer: () => input.value,
    };
  }

  /* =========================================================
     15. SIGIL-LIGHTS WIDGET
     ========================================================= */
  function renderSigilLights(container, config, initialAnswer) {
    const size = 3;
    const baseState = Array.isArray(config.initialState) && config.initialState.length === 9
      ? config.initialState.map((v) => (v ? 1 : 0))
      : new Array(9).fill(0);
    const lit = baseState.slice();
    const engaged = new Array(9).fill(0);

    function toggleNeighbors(board, idx) {
      const r = Math.floor(idx / size);
      const c = idx % size;
      const targets = [
        [r, c],
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];
      targets.forEach(([tr, tc]) => {
        if (tr >= 0 && tr < size && tc >= 0 && tc < size) {
          const ti = tr * size + tc;
          board[ti] = board[ti] ? 0 : 1;
        }
      });
    }

    // Restore solved or partial state if revisiting
    if (typeof initialAnswer === 'string' && /^[01]{9}$/.test(initialAnswer.trim())) {
      const bits = initialAnswer.trim().split('').map(Number);
      bits.forEach((b, idx) => {
        if (b === 1) {
          engaged[idx] = 1;
          toggleNeighbors(lit, idx);
        }
      });
    }

    const panel = el('div', 'lights-panel');

    const head = el('div', 'lights-header');
    const titleGroup = el('div', 'lights-header-titles');
    titleGroup.appendChild(el('div', 'lights-title', config.altarTitle || 'Basalt Altar · Plates I–IX'));
    if (config.altarSubtitle) {
      titleGroup.appendChild(el('div', 'lights-subtitle', config.altarSubtitle));
    }
    head.appendChild(titleGroup);

    const resetBtn = el('button', 'mini-stone-btn', 'Reset Altar');
    resetBtn.type = 'button';
    head.appendChild(resetBtn);
    panel.appendChild(head);

    const gridEl = el('div', 'lights-grid');
    const plateButtons = [];
    const plateSymbols = ['☉', '☽', '🜂', '🜄', '✦', '🜁', '🜃', '⚶', '❖'];

    for (let i = 0; i < 9; i++) {
      const btn = el('button', 'lights-plate');
      btn.type = 'button';
      btn.setAttribute('aria-label', `Plate ${i + 1}`);

      const indexBadge = el('span', 'lights-plate-num', String(i + 1));
      const pressPip = el('span', 'lights-plate-pip', '0');
      const runeCore = el('span', 'lights-plate-glyph', plateSymbols[i] || '✦');

      btn.appendChild(indexBadge);
      btn.appendChild(pressPip);
      btn.appendChild(runeCore);

      btn.addEventListener('click', () => {
        engaged[i] = engaged[i] ? 0 : 1;
        toggleNeighbors(lit, i);
        const litCount = lit.reduce((sum, v) => sum + v, 0);
        if (global.DungeonAudio) {
          if (litCount === 9 && typeof global.DungeonAudio.playRuneChime === 'function') {
            global.DungeonAudio.playRuneChime(523.25);
          } else {
            global.DungeonAudio.playStoneClick(150 + litCount * 18);
          }
        }
        renderBoard();
      });

      plateButtons.push({ btn, pressPip });
      gridEl.appendChild(btn);
    }

    panel.appendChild(gridEl);

    const footer = el('div', 'lights-footer');
    footer.appendChild(el('span', 'lights-mask-label', 'Engaged Plates (1–9):'));
    const maskReadout = el('span', 'lights-mask-value', '000000000');
    footer.appendChild(maskReadout);
    panel.appendChild(footer);

    function renderBoard() {
      let litCount = 0;
      for (let i = 0; i < 9; i++) {
        const isLit = lit[i] === 1;
        const isEngaged = engaged[i] === 1;
        if (isLit) litCount += 1;
        const { btn, pressPip } = plateButtons[i];
        btn.classList.toggle('is-lit', isLit);
        btn.classList.toggle('is-engaged', isEngaged);
        pressPip.textContent = String(engaged[i]);
      }

      const allLit = litCount === 9;
      maskReadout.textContent = engaged.join('');
      maskReadout.classList.toggle('is-complete', allLit);
      panel.classList.toggle('is-complete', allLit);
    }

    resetBtn.addEventListener('click', () => {
      for (let i = 0; i < 9; i++) {
        lit[i] = baseState[i];
        engaged[i] = 0;
      }
      if (global.DungeonAudio) {
        global.DungeonAudio.playStoneClick(130);
      }
      renderBoard();
    });

    renderBoard();
    container.appendChild(panel);

    return {
      getAnswer: () => engaged.join(''),
    };
  }

  const RENDERERS = {
    'riddle-lock': renderRiddleLock,
    'rune-dials': renderRuneDials,
    'lever-gate': renderLeverGate,
    'cipher-wheel': renderCipherWheel,
    'sigil-grid': renderSigilGrid,
    'text-seal': renderTextSeal,
    'wall-knocks': renderWallKnocks,
    'rune-notes': renderRuneNotes,
    'potion-shelf': renderPotionShelf,
    nonogram: renderNonogram,
    'dark-fresco': renderDarkFresco,
    'bestiary-tome': renderBestiaryTome,
    'meta-crossword': renderMetaCrossword,
    'spectrogram-pipe': renderSpectrogramPipe,
    'sigil-lights': renderSigilLights,
  };

  function renderPuzzle(container, puzzleConfig, initialAnswer) {
    if (global.DungeonAudio && typeof global.DungeonAudio.stopAll === 'function') {
      global.DungeonAudio.stopAll();
    }
    container.innerHTML = '';
    const type = puzzleConfig && puzzleConfig.type;
    const renderer = RENDERERS[type];
    if (!renderer) {
      container.appendChild(el('p', 'error-text', `Unknown puzzle mechanism: ${type}`));
      return { getAnswer: () => '' };
    }
    return renderer(container, puzzleConfig, initialAnswer);
  }

  global.DungeonPuzzles = {
    renderPuzzle,
    supportedTypes: Object.keys(RENDERERS),
  };
})(window);
