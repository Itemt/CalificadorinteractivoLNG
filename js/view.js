class View {
  constructor() {
    this.themeToggleBtn = document.getElementById('themeToggle');
    this.tableBody = document.getElementById('tableBody');
    this.classTabsContainer = document.getElementById('classTabs');
    this.periodTabs = document.querySelectorAll('.period-tab');
    this.welcomeScreen = document.getElementById('welcomeScreen');
    this.addClassModal = document.getElementById('addClassModal');
    
    this.setupTheme();
  }

  setupTheme() {
    let currentTheme = localStorage.getItem('calificador_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    this.themeToggleBtn.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    
    this.themeToggleBtn.addEventListener('click', () => {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('calificador_theme', currentTheme);
      this.themeToggleBtn.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    });
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
    document.querySelector('.btn-cancel').onclick = onCancel;
    document.querySelector('.btn-save').onclick = onSave;
  }

  bindWelcomeActions(onNew, onOpen) {
    const btnNew = document.getElementById('btnNewFile');
    if (btnNew) btnNew.onclick = onNew;
    const btnOpen = document.getElementById('btnOpenFile');
    if (btnOpen) btnOpen.onclick = onOpen;
  }

  bindActionRow(onSave, onSaveAs, onExport, onReset, onFillAll) {
    // Controller handles this via document.getElementById
  }

  renderTabs(classes, currentClass, currentPeriod, onClassSelect, onAddClassClick, onPeriodSelect) {
    this.classTabsContainer.innerHTML = '';
    
    Object.values(classes).forEach(cls => {
      const btn = document.createElement('button');
      btn.className = `tab class-tab ${cls.id === currentClass ? 'active' : ''}`;
      btn.textContent = `🏫 ${cls.name}`;
      btn.onclick = () => onClassSelect(cls.id);
      this.classTabsContainer.appendChild(btn);
    });
    
    const addBtn = document.createElement('button');
    addBtn.className = 'tab class-tab tab-add';
    addBtn.textContent = '➕ Agregar Clase';
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
      tdTotal.innerHTML = this.buildTotalHtml(grades[idx], model);
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
    
    document.getElementById(`total-${idx}`).innerHTML = this.buildTotalHtml(grade, model);
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

      const dotColor = g ? `dot-${g.toLowerCase()}` : 'dot-empty';
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

  buildTotalHtml(grade, model) {
    const overall = model.overallLevel(grade);
    const code = CONFIG.DIMS.map(d => model.effectiveForDim(grade[d]) || '·').join('');

    if (!overall) {
      return `<div class="total-wrap total-empty-wrap">
        <span class="total-code">· · ·</span>
        <span class="total-word">Sin calificar</span>
      </div>`;
    }

    return `<div class="total-wrap total-${overall.toLowerCase()}">
      <span class="total-emoji">${CONFIG.LEVEL_EMOJI[overall]}</span>
      <span class="total-word">${CONFIG.LEVEL_LABEL[overall]}</span>
      <span class="total-code">${code}</span>
    </div>`;
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
