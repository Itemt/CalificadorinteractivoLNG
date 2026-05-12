class View {
  constructor() {
    this.themeToggleBtn = document.getElementById('themeToggle');
    this.tableBody = document.getElementById('tableBody');
    this.classTabsContainer = document.getElementById('classTabs');
    this.periodTabs = document.querySelectorAll('.period-tab');
    this.welcomeScreen = document.getElementById('welcomeScreen');
    this.addClassModal = document.getElementById('addClassModal');
    
    // Rename Class Modal
    this.renameClassModal = document.getElementById('renameClassModal');
    this.renameClassIdInput = document.getElementById('renameClassId');
    this.renameClassNameInput = document.getElementById('renameClassNameInput');
    this.btnConfirmRename = document.getElementById('btnConfirmRename');
    this.btnCancelRename = document.getElementById('btnCancelRename');

    if (this.btnCancelRename) this.btnCancelRename.onclick = () => this.hideRenameModal();
    if (this.btnConfirmRename) this.btnConfirmRename.onclick = () => {
      const id = this.renameClassIdInput.value;
      const newName = this.renameClassNameInput.value.trim();
      if (newName && this.onRenameClass) {
        this.onRenameClass(id, newName);
        this.hideRenameModal();
      }
    };
    
    if (this.renameClassNameInput) {
      this.renameClassNameInput.onkeydown = (e) => {
        if (e.key === 'Enter') this.btnConfirmRename.click();
        if (e.key === 'Escape') this.hideRenameModal();
      };
    }

    this.setupTheme();
  }

  showRenameModal(id, currentName) {
    if (!this.renameClassModal) return;
    this.renameClassIdInput.value = id;
    this.renameClassNameInput.value = currentName;
    this.renameClassModal.style.display = 'flex';
    setTimeout(() => this.renameClassNameInput.focus(), 100);
  }

  hideRenameModal() {
    if (this.renameClassModal) this.renameClassModal.style.display = 'none';
  }

  setupTheme() {
    let currentTheme = localStorage.getItem('calificador_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    this.welcomeThemeToggle = document.getElementById('welcomeThemeToggle');

    const updateIcon = () => {
      const label = currentTheme === 'light' ? '🌙 Modo Oscuro' : '☀️ Modo Claro';
      if (this.themeToggleBtn) this.themeToggleBtn.textContent = label;
      if (this.welcomeThemeToggle) this.welcomeThemeToggle.textContent = label;
    };
    updateIcon();

    const toggleTheme = () => {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('calificador_theme', currentTheme);
      updateIcon();
    };

    if (this.themeToggleBtn) this.themeToggleBtn.addEventListener('click', toggleTheme);
    if (this.welcomeThemeToggle) this.welcomeThemeToggle.addEventListener('click', toggleTheme);
  }

  hideWelcomeScreen() {
    this.welcomeScreen.style.display = 'none';
  }

  showAddClassModal() {
    document.getElementById('newClassName').value = '';
    document.getElementById('newClassStudents').value = '';
    this.addClassModal.style.display = 'flex';
  }

  hideAddClassModal() {
    this.addClassModal.style.display = 'none';
  }

  getNewClassData() {
    return {
      name: document.getElementById('newClassName').value.trim(),
      studentsStr: document.getElementById('newClassStudents').value.trim()
    };
  }

  bindAddClassActions(onCancel, onSave) {
    document.getElementById('btnCancelAddClass').onclick = onCancel;
    document.getElementById('btnSaveNewClass').onclick = onSave;
  }

  bindWelcomeActions(onNew, onOpen) {
    const btnNew = document.getElementById('btnNewFile');
    if (btnNew) btnNew.onclick = onNew;
    const btnOpen = document.getElementById('btnOpenFile');
    if (btnOpen) btnOpen.onclick = onOpen;
  }

  renderTabs(classes, currentClass, currentPeriod, onClassSelect, onAddClassClick, onPeriodSelect) {
    this.classTabsContainer.innerHTML = '';
    
    Object.values(classes).forEach(cls => {
      const btn = document.createElement('button');
      btn.className = `tab class-tab ${cls.id === currentClass ? 'active' : ''}`;
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = `🏫 ${cls.name}`;
      btn.appendChild(nameSpan);

      const editBtn = document.createElement('span');
      editBtn.className = 'edit-class-btn';
      editBtn.innerHTML = ' ✏️';
      editBtn.title = 'Renombrar materia';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        this.showRenameModal(cls.id, cls.name);
      };
      btn.appendChild(editBtn);

      btn.onclick = () => onClassSelect(cls.id);
      this.classTabsContainer.appendChild(btn);
    });
    
    const addBtn = document.createElement('button');
    addBtn.className = 'tab class-tab tab-add';
    addBtn.textContent = '➕ Agregar Materia';
    addBtn.onclick = onAddClassClick;
    this.classTabsContainer.appendChild(addBtn);

    this.periodTabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === currentPeriod);
      btn.onclick = () => onPeriodSelect(btn.dataset.period);
    });
  }

  renderTable(students, grades, model, onSessionSelect) {
    this.tableBody.innerHTML = '';
    if (!students || students.length === 0) return;

    students.forEach((name, idx) => {
      const tr = document.createElement('tr');
      tr.id = `row-${idx}`;

      const tdName = document.createElement('td');
      tdName.className = 'col-student';
      tdName.textContent = name;
      tr.appendChild(tdName);

      CONFIG.DIMS.forEach(dim => {
        const td = document.createElement('td');
        td.className = 'col-dim-cell';
        td.id = `dim-${idx}-${dim}`;
        td.innerHTML = this.buildDimCellHtml(idx, dim, grades[idx][dim], model);
        tr.appendChild(td);
      });

      const tdTotal = document.createElement('td');
      tdTotal.id = `total-${idx}`;
      tdTotal.innerHTML = this.buildTotalHtml(grades[idx], model, idx);
      tr.appendChild(tdTotal);

      this.tableBody.appendChild(tr);
      this.applyRowHighlight(tr, grades[idx], model);
    });

    // Attach grade button listeners
    this.attachGradeListeners(this.tableBody, onSessionSelect);
  }

  updateRow(idx, grade, model, onSessionSelect) {
    CONFIG.DIMS.forEach(dim => {
      const td = document.getElementById(`dim-${idx}-${dim}`);
      td.innerHTML = this.buildDimCellHtml(idx, dim, grade[dim], model);
    });
    
    document.getElementById(`total-${idx}`).innerHTML = this.buildTotalHtml(grade, model, idx);
    const tr = document.getElementById(`row-${idx}`);
    this.applyRowHighlight(tr, grade, model);

    // Reattach listeners just for this row
    this.attachGradeListeners(tr, onSessionSelect);
  }

  attachGradeListeners(container, onSessionSelect) {
    container.querySelectorAll('.grade-btn').forEach(btn => {
      btn.onclick = (e) => {
        const idx = e.target.dataset.idx;
        const dim = e.target.dataset.dim;
        const si = e.target.dataset.si;
        const lvl = e.target.dataset.lvl;
        onSessionSelect(parseInt(idx), dim, parseInt(si), lvl);
      };
    });
  }

  buildDimCellHtml(idx, dim, sessions, model) {
    const eff = model.effectiveForDim(sessions);
    const code = sessions.map(g => g || '·').join('');

    const rows = sessions.map((g, si) => {
      const buttons = CONFIG.LEVELS.map(lvl => {
        const isSelected = g === lvl;
        const selCls = isSelected ? `sel-${lvl.toLowerCase()}` : '';
        return `<button class="grade-btn ${selCls}" data-idx="${idx}" data-dim="${dim}" data-si="${si}" data-lvl="${lvl}" title="${CONFIG.LEVEL_LABEL[lvl]}">${lvl}</button>`;
      }).join('');

      const dotColor = g ? `dot-${g.toLowerCase()}` : '';
      return `<div class="session-row">
        <span class="session-dot ${dotColor}" title="Clase ${si + 1}: ${g ? CONFIG.LEVEL_LABEL[g] : 'Sin calificar'}">${si + 1}</span>
        <div class="session-btns">${buttons}</div>
      </div>`;
    }).join('');

    const codeHtml = eff
      ? `<div class="dim-code"><span class="dim-code-letters">${code}</span><span class="dim-eff-badge eff-${eff.toLowerCase()}">${CONFIG.LEVEL_EMOJI[eff]} ${CONFIG.LEVEL_LABEL[eff]}</span></div>`
      : `<div class="dim-code dim-code-empty"><span class="dim-code-letters">· · ·</span></div>`;

    return `<div class="dim-cell-inner">${rows}${codeHtml}</div>`;
  }

  buildTotalHtml(grade, model, studentIdx) {
    const overall = model.overallLevel(grade);
    const consolidated = (studentIdx !== undefined) ? model.getStudentConsolidated(studentIdx) : null;

    const periodBlock = overall
      ? `<div class="total-period total-${overall.toLowerCase()}">
          <span class="total-label">Periodo</span>
          <span class="total-emoji">${CONFIG.LEVEL_EMOJI[overall]}</span>
          <span class="total-word">${CONFIG.LEVEL_LABEL[overall]}</span>
        </div>`
      : `<div class="total-period total-empty-wrap"><span class="total-label">Periodo</span><span class="total-word">Sin calificar</span></div>`;

    const consBlock = consolidated
      ? `<div class="total-consol total-${consolidated.toLowerCase()}">
          <span class="total-label">📋 Trimestre</span>
          <span class="total-emoji">${CONFIG.LEVEL_EMOJI[consolidated]}</span>
          <span class="total-word">${CONFIG.LEVEL_LABEL[consolidated]}</span>
        </div>`
      : `<div class="total-consol total-empty-wrap"><span class="total-label">📋 Trimestre</span><span class="total-word">—</span></div>`;

    return `<div class="total-wrap-v2">${periodBlock}${consBlock}</div>`;
  }

  applyRowHighlight(tr, grade, model) {
    const overall = model.overallLevel(grade);
    tr.classList.toggle('row-superior', overall === 'S');
    tr.classList.toggle('row-alto', overall === 'A');
    tr.classList.toggle('row-proceso', overall === 'P');
  }

  updateStats(stats) {
    document.getElementById('countS').textContent = stats.countS;
    document.getElementById('countA').textContent = stats.countA;
    document.getElementById('countP').textContent = stats.countP;
    document.getElementById('countTotal').textContent = stats.total;
  }

  showSaveNameModal(defaultName, note = '') {
    return new Promise((resolve) => {
      const modal      = document.getElementById('saveNameModal');
      const input      = document.getElementById('saveNameInput');
      const noteEl     = document.getElementById('saveNameModalNote');
      const btnOk      = document.getElementById('btnConfirmSaveName');
      const btnPicker  = document.getElementById('btnPickerSaveName');
      const btnCancel  = document.getElementById('btnCancelSaveName');

      input.value             = defaultName;
      noteEl.innerHTML        = note;
      noteEl.style.color      = '';
      btnOk.textContent       = '⬇️ Solo descargar';
      btnPicker.style.display = 'inline-flex';

      modal.style.display = 'flex';
      setTimeout(() => { input.select(); input.focus(); }, 100);

      const done = (val) => {
        modal.style.display  = 'none';
        btnOk.onclick        = null;
        btnPicker.onclick    = null;
        btnCancel.onclick    = null;
        input.onkeydown      = null;
        resolve(val);
      };

      btnOk.onclick = () => { const n = input.value.trim(); if (n) done({ type: 'download', name: n }); };

      btnPicker.onclick = async () => {
        const fname = (input.value.trim() || defaultName).replace(/\.csv$/i, '') + '.csv';
        try {
          if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
              types: [{ description: 'Base de Datos CSV', accept: { 'text/csv': ['.csv'] } }],
              suggestedName: fname
            });
            done({ type: 'handle', handle });
          } else if (window.showDirectoryPicker) {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            done({ type: 'dirHandle', dirHandle, name: fname });
          } else {
            noteEl.style.color = 'var(--orange, #f59e0b)';
            noteEl.innerHTML =
              '⚠️ <strong>Firefox no permite elegir la ubicación desde archivos locales.</strong><br>' +
              'Opciones:<br>' +
              '&nbsp;&nbsp;• Usa <strong>Chrome</strong> o <strong>Edge</strong> para abrir este archivo<br>' +
              '&nbsp;&nbsp;• Usa la aplicación <strong>.exe</strong> para elegir la carpeta<br>' +
              '&nbsp;&nbsp;• Haz clic en <em>⬇️ Solo descargar</em> para guardar en Descargas';
          }
        } catch (e) {
          if (e.name !== 'AbortError') {
            noteEl.style.color = 'var(--orange, #f59e0b)';
            noteEl.innerHTML =
              '⚠️ No se pudo abrir el explorador de archivos.<br>' +
              'Usa Chrome, Edge o la aplicación .exe. También puedes hacer clic en <em>⬇️ Solo descargar</em>.';
          }
        }
      };

      btnCancel.onclick = () => done(null);
      input.onkeydown   = (e) => {
        if (e.key === 'Enter')  btnOk.click();
        if (e.key === 'Escape') done(null);
      };
    });
  }

  showToast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { 
      t = document.createElement('div'); 
      t.className = 'toast'; 
      document.body.appendChild(t); 
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }

  showError(msg) {
    const m = document.getElementById('errorModal');
    if (m) {
      document.getElementById('errorModalMsg').textContent = msg;
      m.style.display = 'flex';
    }
  }

  launchConfetti() {
    const canvas = document.getElementById('confetti');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#ffd700', '#ff6b9d', '#4fc3f7', '#7c4dff', '#00e676', '#ff9800'];
    const pieces = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 4 + 2,
      drift: (Math.random() - 0.5) * 2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2
    }));

    let frame;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allOff = true;
      pieces.forEach(p => {
        if (p.y < canvas.height + 10) allOff = false;
        p.y += p.speed; p.x += p.drift; p.rot += p.rotSpeed;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.globalAlpha = 0.9;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.4);
        ctx.restore();
      });
      if (!allOff) frame = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (frame) cancelAnimationFrame(frame);
    draw();
  }
}
