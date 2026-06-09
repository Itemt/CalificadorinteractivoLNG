class View {
  constructor() {
    this.themeToggleBtn = document.getElementById('themeToggle');
    this.tableBody = document.getElementById('tableBody');
    this.classTabsContainer = document.getElementById('classTabs');
    this.periodTabs = document.querySelectorAll('.period-tab');
    this.welcomeScreen = document.getElementById('welcomeScreen');
    this.addClassModal = document.getElementById('addClassModal');
    
    this.btnGDrive = document.getElementById('btnGDrive');
    this.gdriveSyncIndicator = document.getElementById('gdriveSyncIndicator');
    
    if (!window.electronAPI && this.btnGDrive) {
      this.btnGDrive.style.display = 'none';
    }

    // Google Drive Config Modal
    this.gdriveConfigModal = document.getElementById('gdriveConfigModal');
    this.gdriveClientId = document.getElementById('gdriveClientId');
    this.gdriveClientSecret = document.getElementById('gdriveClientSecret');
    this.btnSaveGDriveConfig = document.getElementById('btnSaveGDriveConfig');
    this.btnCancelGDriveConfig = document.getElementById('btnCancelGDriveConfig');

    if (this.btnCancelGDriveConfig) {
      this.btnCancelGDriveConfig.onclick = () => this.hideGDriveConfigModal();
    }
    
    // Rename Class Modal
    this.renameClassModal = document.getElementById('renameClassModal');
    this.renameClassIdInput = document.getElementById('renameClassId');
    this.renameClassNameInput = document.getElementById('renameClassNameInput');
    this.renameClassSessionsInput = document.getElementById('renameClassSessions');
    this.btnConfirmRename = document.getElementById('btnConfirmRename');
    this.btnCancelRename = document.getElementById('btnCancelRename');

    if (this.btnCancelRename) this.btnCancelRename.onclick = () => this.hideRenameModal();
    if (this.btnConfirmRename) this.btnConfirmRename.onclick = () => {
      const id = this.renameClassIdInput.value;
      const newName = this.renameClassNameInput.value.trim();
      const numSesiones = parseInt(this.renameClassSessionsInput?.value) || 3;
      
      const stInputs = document.querySelectorAll('.rename-student-input');
      const newStudentsList = Array.from(stInputs).map(inp => inp.value.trim()).filter(Boolean);

      if (newName && this.onRenameClass) {
        this.onRenameClass(id, newName, numSesiones, newStudentsList.length > 0 ? newStudentsList : null);
        this.hideRenameModal();
      }
    };
    
    if (this.renameClassNameInput) {
      this.renameClassNameInput.onkeydown = (e) => {
        if (e.key === 'Enter') this.btnConfirmRename.click();
        if (e.key === 'Escape') this.hideRenameModal();
      };
    }

    // Modal observaciones (por estudiante / nivel)
    this.obsModal = document.getElementById('obsModal');
    this.obsModalText = document.getElementById('obsModalText');
    this.obsModalStudent = document.getElementById('obsModalStudent');
    this.btnCancelObs = document.getElementById('btnCancelObs');
    this.btnSaveObs = document.getElementById('btnSaveObs');
    this._obsResolve = null;
    if (this.btnCancelObs) this.btnCancelObs.onclick = () => this._finishObsModal(null);
    if (this.btnSaveObs) this.btnSaveObs.onclick = () => this._finishObsModal(this.obsModalText.value);
    if (this.obsModalText) {
      this.obsModalText.onkeydown = (e) => {
        if (e.key === 'Escape') this._finishObsModal(null);
      };
    }

    // Custom Date Picker Modal
    this.datePickerModal = document.getElementById('datePickerModal');
    this.calendarMonthYear = document.getElementById('calendarMonthYear');
    this.calendarDaysGrid = document.getElementById('calendarDaysGrid');
    this.btnPrevMonth = document.getElementById('btnPrevMonth');
    this.btnNextMonth = document.getElementById('btnNextMonth');
    this.btnClearDate = document.getElementById('btnClearDate');
    this.btnTodayDate = document.getElementById('btnTodayDate');
    this.btnCancelDate = document.getElementById('btnCancelDate');
    this.btnCloseCalendarModal = document.getElementById('btnCloseCalendarModal');
    this._datePickerResolve = null;

    // Cancellation controls
    this.chkNoClass = document.getElementById('chkNoClass');
    this.noClassReasonContainer = document.getElementById('noClassReasonContainer');
    this.txtNoClassReason = document.getElementById('txtNoClassReason');

    this.pickerYear = null;
    this.pickerMonth = null;
    this.pickerSelectedDate = null;

    if (this.btnPrevMonth) this.btnPrevMonth.onclick = () => this.changePickerMonth(-1);
    if (this.btnNextMonth) this.btnNextMonth.onclick = () => this.changePickerMonth(1);
    if (this.btnClearDate) this.btnClearDate.onclick = () => this.finishDatePicker("");
    if (this.btnTodayDate) {
      this.btnTodayDate.onclick = () => {
        if (this.chkNoClass && this.chkNoClass.checked) {
          const reason = this.txtNoClassReason.value.trim();
          const finalVal = `NC:${this.pickerSelectedDate || this.getTodayStr()}:${reason}`;
          this.finishDatePicker(finalVal);
        } else {
          this.finishDatePicker(this.getTodayStr());
        }
      };
    }
    if (this.btnCancelDate) this.btnCancelDate.onclick = () => this.finishDatePicker(null);
    if (this.btnCloseCalendarModal) this.btnCloseCalendarModal.onclick = () => this.finishDatePicker(null);
    
    if (this.chkNoClass) {
      this.chkNoClass.onchange = () => {
        const isChecked = this.chkNoClass.checked;
        this.noClassReasonContainer.style.display = isChecked ? 'block' : 'none';
        this.updateDatePickerSaveButton();
        if (isChecked) {
          setTimeout(() => this.txtNoClassReason.focus(), 50);
        }
      };
    }
    if (this.txtNoClassReason) {
      this.txtNoClassReason.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.btnTodayDate.click();
        }
      };
    }

    if (this.datePickerModal) {
      this.datePickerModal.onclick = (e) => {
        if (e.target === this.datePickerModal) {
          this.finishDatePicker(null);
        }
      };
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.datePickerModal && this.datePickerModal.style.display === 'flex') {
        this.finishDatePicker(null);
      }
    });

    this.setupTheme();
  }

  showRenameModal(id, currentName, currentNumSesiones = 3, students = []) {
    if (!this.renameClassModal) return;
    this.renameClassIdInput.value = id;
    this.renameClassNameInput.value = currentName;
    if (this.renameClassSessionsInput) this.renameClassSessionsInput.value = currentNumSesiones;
    
    const container = document.getElementById('renameStudentsContainer');
    if (container) {
      container.innerHTML = '';
      students.forEach(st => this.addRenameStudentInput(container, st));
      const btnAdd = document.getElementById('btnAddStudentRename');
      if (btnAdd) {
        btnAdd.onclick = () => this.addRenameStudentInput(container, '');
      }
    }

    this.renameClassModal.style.display = 'flex';
    setTimeout(() => this.renameClassNameInput.focus(), 100);
  }

  addRenameStudentInput(container, val) {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.gap = '5px';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = val;
    input.className = 'rename-student-input';
    input.style.flex = '1';
    input.style.padding = '4px';
    input.style.fontSize = '0.9rem';
    input.placeholder = 'Nombre del estudiante';
    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.textContent = '✗';
    btnDel.style.cursor = 'pointer';
    btnDel.style.background = 'none';
    btnDel.style.border = 'none';
    btnDel.style.color = 'var(--red, #ef4444)';
    btnDel.onclick = () => wrap.remove();
    wrap.appendChild(input);
    wrap.appendChild(btnDel);
    container.appendChild(wrap);
  }

  _finishObsModal(result) {
    if (!this.obsModal) return;
    this.obsModal.style.display = 'none';
    if (this._obsResolve) {
      const r = this._obsResolve;
      this._obsResolve = null;
      r(result);
    }
  }

  showObsModal(studentName, sessionIndex, currentText, dateStr = '') {
    return new Promise((resolve) => {
      if (!this.obsModal || !this.obsModalText) {
        resolve(null);
        return;
      }
      this._obsResolve = resolve;
      
      const formattedDate = this.formatDate(dateStr);
      const dateSuffix = formattedDate ? ` - Fecha: ${formattedDate}` : '';
      if (this.obsModalStudent) this.obsModalStudent.innerHTML = `<strong>${studentName}</strong> (Clase ${sessionIndex}${dateSuffix})`;
      this.obsModalText.value = currentText || '';
      this.obsModal.style.display = 'flex';
      setTimeout(() => {
        this.obsModalText.focus();
        this.obsModalText.selectionStart = this.obsModalText.value.length;
      }, 80);
    });
  }

  parseClassDate(dateStr) {
    if (!dateStr) return { isNoClass: false, date: '', reason: '' };
    if (dateStr.startsWith('NC:')) {
      const parts = dateStr.split(':');
      const date = parts[1] || '';
      const reason = parts.slice(2).join(':') || '';
      return { isNoClass: true, date, reason };
    }
    return { isNoClass: false, date: dateStr, reason: '' };
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const parsed = this.parseClassDate(dateStr);
    if (parsed.isNoClass) {
      const datePart = parsed.date ? this.formatDate(parsed.date) : '';
      const reasonPart = parsed.reason ? ` - ${parsed.reason}` : '';
      return `❌ Sin clase${datePart ? ' (' + datePart + ')' : ''}${reasonPart}`;
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  renderClassDates(numSesiones, currentPeriod, clsData, onDateChange) {
    const bar = document.getElementById('classDatesBar');
    const container = document.getElementById('classDatesInputs');
    if (!bar || !container) return;

    if (!clsData) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';
    container.innerHTML = '';

    const dates = (clsData.fechas && clsData.fechas[currentPeriod]) || [];

    for (let si = 0; si < numSesiones; si++) {
      const dateVal = dates[si] || '';
      const parsed = this.parseClassDate(dateVal);
      
      const group = document.createElement('div');
      group.className = 'date-input-group clickable';
      if (parsed.isNoClass) {
        group.classList.add('no-class');
      }
      group.setAttribute('tabindex', '0');
      
      const label = document.createElement('label');
      label.textContent = `C${si + 1}:`;
      label.style.cursor = 'pointer';
      
      const valueSpan = document.createElement('span');
      if (dateVal) {
        valueSpan.textContent = this.formatDate(dateVal);
        valueSpan.className = 'class-date-value';
        if (parsed.isNoClass) {
          valueSpan.classList.add('no-class-text');
        }
      } else {
        valueSpan.textContent = 'dd/mm/yyyy';
        valueSpan.className = 'class-date-value empty';
      }
      
      const iconSpan = document.createElement('span');
      iconSpan.textContent = parsed.isNoClass ? ' ❌' : ' 📅';
      iconSpan.className = 'calendar-icon-indicator';

      group.appendChild(label);
      group.appendChild(valueSpan);
      group.appendChild(iconSpan);
      
      const triggerSelect = async () => {
        const chosenDate = await this.showDatePickerModal(dateVal);
        if (chosenDate !== null) {
          onDateChange(si, chosenDate);
        }
      };

      group.onclick = triggerSelect;
      group.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerSelect();
        }
      };

      container.appendChild(group);
    }
  }

  renderClassObservation(currentPeriod, clsData, onObsChange, onObsSave) {
    const bar = document.getElementById('classObsBar');
    const container = document.getElementById('classObsInputs');
    if (!bar || !container) return;

    if (!clsData) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';

    const numSesiones = clsData.numSesiones || 3;
    const dates = (clsData.fechas && clsData.fechas[currentPeriod]) || [];
    const obsList = (clsData.observaciones && clsData.observaciones[currentPeriod]) || [];

    // Rebuild textareas only if the count changed to prevent losing focus/cursor
    if (container.children.length !== numSesiones) {
      container.innerHTML = '';
      for (let si = 0; si < numSesiones; si++) {
        const group = document.createElement('div');
        group.className = 'class-obs-group';

        const header = document.createElement('div');
        header.className = 'class-obs-group-header';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'class-obs-group-title';
        titleSpan.textContent = `Clase ${si + 1}`;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'class-obs-group-date';

        header.appendChild(titleSpan);
        header.appendChild(dateSpan);

        const textarea = document.createElement('textarea');
        textarea.className = 'class-obs-textarea';
        textarea.placeholder = `Notas de la clase ${si + 1}...`;

        textarea.oninput = () => {
          onObsChange(si, textarea.value);
        };

        textarea.onblur = () => {
          onObsSave();
        };

        group.appendChild(header);
        group.appendChild(textarea);
        container.appendChild(group);
      }
    }

    // Update dynamic contents focus-safely
    for (let si = 0; si < numSesiones; si++) {
      const group = container.children[si];
      if (!group) continue;

      const dateVal = dates[si] || '';
      const parsedDate = this.parseClassDate(dateVal);
      const obsVal = obsList[si] || '';

      group.classList.toggle('no-class', parsedDate.isNoClass);

      const dateSpan = group.querySelector('.class-obs-group-date');
      if (dateSpan) {
        if (dateVal) {
          dateSpan.textContent = this.formatDate(dateVal);
        } else {
          dateSpan.textContent = 'Sin fecha';
        }
      }

      const textarea = group.querySelector('.class-obs-textarea');
      if (textarea && document.activeElement !== textarea) {
        textarea.value = obsVal;
      }
    }
  }

  getTodayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
  }

  showDatePickerModal(currentDateStr) {
    return new Promise((resolve) => {
      this._datePickerResolve = resolve;
      
      const parsed = this.parseClassDate(currentDateStr);
      if (parsed.isNoClass) {
        if (this.chkNoClass) this.chkNoClass.checked = true;
        if (this.noClassReasonContainer) this.noClassReasonContainer.style.display = 'block';
        if (this.txtNoClassReason) this.txtNoClassReason.value = parsed.reason;
        this.pickerSelectedDate = parsed.date;
      } else {
        if (this.chkNoClass) this.chkNoClass.checked = false;
        if (this.noClassReasonContainer) this.noClassReasonContainer.style.display = 'none';
        if (this.txtNoClassReason) this.txtNoClassReason.value = '';
        this.pickerSelectedDate = currentDateStr || '';
      }

      this.updateDatePickerSaveButton();
      
      let activeDateStr = this.pickerSelectedDate || this.getTodayStr();
      let parts = activeDateStr.split('-');
      if (parts.length === 3) {
        this.pickerYear = parseInt(parts[0]);
        this.pickerMonth = parseInt(parts[1]) - 1;
      } else {
        const d = new Date();
        this.pickerYear = d.getFullYear();
        this.pickerMonth = d.getMonth();
      }
      
      this.renderCalendarGrid();
      
      if (this.datePickerModal) {
        this.datePickerModal.style.display = 'flex';
      }
    });
  }

  renderCalendarGrid() {
    if (!this.calendarMonthYear || !this.calendarDaysGrid) return;
    
    const monthNames = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio", 
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    this.calendarMonthYear.textContent = `${monthNames[this.pickerMonth]} ${this.pickerYear}`;
    
    this.calendarDaysGrid.innerHTML = '';
    
    const firstDay = new Date(this.pickerYear, this.pickerMonth, 1).getDay();
    const totalDays = new Date(this.pickerYear, this.pickerMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day empty';
      this.calendarDaysGrid.appendChild(cell);
    }
    
    const todayStr = this.getTodayStr();
    
    for (let day = 1; day <= totalDays; day++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'calendar-day';
      btn.textContent = day;
      
      const mStr = String(this.pickerMonth + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const cellDateStr = `${this.pickerYear}-${mStr}-${dStr}`;
      
      if (cellDateStr === todayStr) {
        btn.classList.add('today');
      }
      
      if (cellDateStr === this.pickerSelectedDate) {
        btn.classList.add('selected');
      }
      
      btn.onclick = () => {
        if (this.chkNoClass && this.chkNoClass.checked) {
          this.pickerSelectedDate = cellDateStr;
          this.renderCalendarGrid();
        } else {
          this.finishDatePicker(cellDateStr);
        }
      };
      
      this.calendarDaysGrid.appendChild(btn);
    }
  }

  changePickerMonth(delta) {
    this.pickerMonth += delta;
    if (this.pickerMonth < 0) {
      this.pickerMonth = 11;
      this.pickerYear -= 1;
    } else if (this.pickerMonth > 11) {
      this.pickerMonth = 0;
      this.pickerYear += 1;
    }
    this.renderCalendarGrid();
  }

  updateDatePickerSaveButton() {
    if (this.btnTodayDate) {
      if (this.chkNoClass && this.chkNoClass.checked) {
        this.btnTodayDate.textContent = '💾 Guardar';
      } else {
        this.btnTodayDate.textContent = '📅 Hoy';
      }
    }
  }

  finishDatePicker(val) {
    if (this._datePickerResolve) {
      this._datePickerResolve(val);
      this._datePickerResolve = null;
    }
    if (this.datePickerModal) {
      this.datePickerModal.style.display = 'none';
    }
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
    document.getElementById('newClassSessions').value = '3';
    this.addClassModal.style.display = 'flex';
  }

  hideAddClassModal() {
    this.addClassModal.style.display = 'none';
  }

  getNewClassData() {
    return {
      name: document.getElementById('newClassName').value.trim(),
      studentsStr: document.getElementById('newClassStudents').value.trim(),
      numSesiones: parseInt(document.getElementById('newClassSessions').value) || 3
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

  renderTabs(classes, currentClass, currentPeriod, onClassSelect, onAddClassClick, onPeriodSelect, onClassReorder) {
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
      editBtn.title = 'Editar materia';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        this.showRenameModal(cls.id, cls.name, cls.numSesiones || 3, cls.students || []);
      };
      btn.appendChild(editBtn);

      btn.onclick = () => onClassSelect(cls.id);

      // --- HTML5 Drag and Drop logic ---
      btn.setAttribute('draggable', 'true');

      btn.ondragstart = (e) => {
        this.draggedClassId = cls.id;
        btn.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      };

      btn.ondragend = (e) => {
        btn.classList.remove('dragging');
        this.draggedClassId = null;
        this.classTabsContainer.querySelectorAll('.class-tab').forEach(t => t.classList.remove('drag-over'));
      };

      btn.ondragover = (e) => {
        e.preventDefault();
        if (this.draggedClassId && this.draggedClassId !== cls.id) {
          btn.classList.add('drag-over');
        }
      };

      btn.ondragleave = (e) => {
        btn.classList.remove('drag-over');
      };

      btn.ondrop = (e) => {
        e.preventDefault();
        btn.classList.remove('drag-over');
        if (this.draggedClassId && this.draggedClassId !== cls.id && onClassReorder) {
          onClassReorder(this.draggedClassId, cls.id);
        }
      };
      // ---------------------------------

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

  renderTable(students, grades, model, onSessionSelect, onAttendance, onPoints, onOpenObservaciones, numSesiones = 3) {
    this.tableBody.innerHTML = '';
    this.numSesiones = numSesiones; // guardado para updateRow
    this.currentGrades = grades;   // guardado para refrescar highlights de puntos
    if (!students || students.length === 0) return;

    students.forEach((name, idx) => {
      const tr = document.createElement('tr');
      tr.id = `row-${idx}`;

      const tdName = document.createElement('td');
      tdName.className = 'col-student';
      tdName.id = `student-cell-${idx}`;
      tdName.innerHTML = this.buildStudentCellHtml(idx, name, grades[idx], numSesiones, model);
      tr.appendChild(tdName);

      CONFIG.DIMS.forEach(dim => {
        const td = document.createElement('td');
        td.className = 'col-dim-cell';
        td.id = `dim-${idx}-${dim}`;
        td.innerHTML = this.buildDimCellHtml(idx, dim, grades[idx], model, numSesiones);
        tr.appendChild(td);
      });

      const tdTotal = document.createElement('td');
      tdTotal.id = `total-${idx}`;
      tdTotal.innerHTML = this.buildTotalHtml(grades[idx], model, idx);
      tr.appendChild(tdTotal);

      this.tableBody.appendChild(tr);
      this.applyRowHighlight(tr, grades[idx], model);
    });

    this.attachGradeListeners(this.tableBody, onSessionSelect);
    this.attachStudentListeners(this.tableBody, onAttendance, onPoints, onOpenObservaciones);
    this.applyPointsHighlights(grades);
  }

  updateRow(idx, grade, model, onSessionSelect, onAttendance, onPoints, onOpenObservaciones) {
    const numSesiones = this.numSesiones || 3;

    // Mantener currentGrades sincronizado para highlights de puntos
    if (this.currentGrades) this.currentGrades[idx] = grade;

    const tdName = document.getElementById(`student-cell-${idx}`);
    if (tdName) {
      const nameEl = tdName.querySelector('.student-name');
      const name = nameEl ? nameEl.textContent : '';
      tdName.innerHTML = this.buildStudentCellHtml(idx, name, grade, numSesiones, model);
      this.attachStudentListeners(tdName, onAttendance, onPoints, onOpenObservaciones);
    }

    CONFIG.DIMS.forEach(dim => {
      const td = document.getElementById(`dim-${idx}-${dim}`);
      td.innerHTML = this.buildDimCellHtml(idx, dim, grade, model, numSesiones);
    });
    
    document.getElementById(`total-${idx}`).innerHTML = this.buildTotalHtml(grade, model, idx);
    const tr = document.getElementById(`row-${idx}`);
    this.applyRowHighlight(tr, grade, model);

    this.attachGradeListeners(tr, onSessionSelect);
    if (this.currentGrades) this.applyPointsHighlights(this.currentGrades);
  }

  buildStudentCellHtml(idx, name, grade, numSesiones = 3, model = null) {
    const att = grade.asistencia || [];
    const pts = grade.puntos || 0;
    
    // Get class dates
    let clsFechas = [];
    if (model) {
      const cls = model.getCurrentClassData();
      const period = model.currentPeriod;
      if (cls && cls.fechas && cls.fechas[period]) {
        clsFechas = cls.fechas[period];
      }
    }
    
    // Asistencia
    const attBtns = Array.from({ length: numSesiones }, (_, i) => att[i] ?? null).map((a, si) => {
      const parsedDate = this.parseClassDate(clsFechas[si] || '');
      const absent = a === 'A';
      
      if (parsedDate.isNoClass) {
        const tip = `Clase ${si + 1} (Sin clase${parsedDate.reason ? ': ' + parsedDate.reason : ''})`;
        return `<button class="att-btn" data-idx="${idx}" data-si="${si}" title="${tip}" disabled style="opacity: 0.4; cursor: not-allowed;">
          <span class="att-icon">❌</span><span class="att-num">C${si + 1}</span>
        </button>`;
      }
      
      const cls    = absent ? 'att-btn att-absent' : 'att-btn att-present';
      const icon   = absent ? '✗' : '✓';
      const dateStr = (clsFechas && clsFechas[si]) ? ` (${this.formatDate(clsFechas[si])})` : '';
      const tip    = absent
        ? `Clase ${si + 1}${dateStr}: Faltó — clic para marcar Presente`
        : `Clase ${si + 1}${dateStr}: Presente — clic para marcar Ausente`;
      return `<button class="${cls}" data-idx="${idx}" data-si="${si}" title="${tip}">
        <span class="att-icon">${icon}</span><span class="att-num">C${si + 1}</span>
      </button>`;
    }).join('');

    // Observaciones (por sesión)
    const obsArr = grade.observaciones || Array(numSesiones).fill(null);
    const obsBtns = Array.from({ length: numSesiones }, (_, i) => obsArr[i] ?? null).map((o, si) => {
      const parsedDate = this.parseClassDate(clsFechas[si] || '');
      const absent = att[si] === 'A';
      
      if (parsedDate.isNoClass) {
        const tip = `Clase ${si + 1} (Sin clase)`;
        return `<button type="button" class="btn-obs" data-idx="${idx}" data-si="${si}" title="${tip}" disabled style="opacity: 0.3; cursor: not-allowed;">Obs C${si + 1}</button>`;
      }
      
      const disabledAttr = absent ? 'disabled' : '';
      const opacityStyle = absent ? 'style="opacity: 0.5;"' : '';
      const isFilled = o && String(o).trim() !== '';
      const cls = isFilled ? 'btn-obs btn-obs-filled' : 'btn-obs';
      const dateStr = (clsFechas && clsFechas[si]) ? ` (${this.formatDate(clsFechas[si])})` : '';
      const tip = absent 
        ? `Clase ${si + 1}${dateStr}: Ausente (sin observaciones)` 
        : (isFilled ? `Clase ${si + 1}${dateStr}: Editar observación` : `Clase ${si + 1}${dateStr}: Agregar observación`);
      return `<button type="button" class="${cls}" data-idx="${idx}" data-si="${si}" title="${tip}" ${disabledAttr} ${opacityStyle}>Obs C${si + 1}</button>`;
    }).join('');

    const ptsClass = pts > 0 ? 'pts-pos' : pts < 0 ? 'pts-neg' : 'pts-zero';
    const ptsLabel = pts > 0 ? `+${pts}` : `${pts}`;

    return `
      <span class="student-name">${name}</span>
      <div class="student-extras">
        <div class="extra-row">
          <span class="extra-lbl">📋 Asistencia</span>
          <div class="att-dots">${attBtns}</div>
        </div>
        <div class="extra-row">
          <span class="extra-lbl">⭐ Puntos</span>
          <div class="pts-wrap">
            <button class="pts-btn pts-minus" data-idx="${idx}" data-delta="-1" title="Punto negativo">−</button>
            <span class="pts-val ${ptsClass}">${ptsLabel}</span>
            <button class="pts-btn pts-plus" data-idx="${idx}" data-delta="1" title="Punto positivo">+</button>
          </div>
        </div>
        <div class="extra-row">
          <span class="extra-lbl">📝 Obs.</span>
          <div class="att-dots">${obsBtns}</div>
        </div>
      </div>`;
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

  attachStudentListeners(container, onAttendance, onPoints, onOpenObservaciones) {
    container.querySelectorAll('.att-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        onAttendance(parseInt(e.currentTarget.dataset.idx), parseInt(e.currentTarget.dataset.si));
      };
    });
    container.querySelectorAll('.pts-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        onPoints(parseInt(e.currentTarget.dataset.idx), parseInt(e.currentTarget.dataset.delta));
      };
    });
    container.querySelectorAll('.btn-obs').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (onOpenObservaciones) {
          onOpenObservaciones(parseInt(e.currentTarget.dataset.idx), parseInt(e.currentTarget.dataset.si));
        }
      };
    });
  }

  buildDimCellHtml(idx, dim, grade, model, numSesiones = 3) {
    const sessions = grade[dim] || [];
    const att = grade.asistencia || [];
    // Padding dinámico: el array de datos puede tener menos slots que numSesiones
    const activeSessions = Array.from({ length: numSesiones }, (_, i) => sessions[i] ?? null);
    const eff  = model.effectiveForDim(activeSessions);
    const code = activeSessions.map(g => g || '·').join('');

    // Get class dates
    let clsFechas = [];
    if (model) {
      const cls = model.getCurrentClassData();
      const period = model.currentPeriod;
      if (cls && cls.fechas && cls.fechas[period]) {
        clsFechas = cls.fechas[period];
      }
    }

    const rows = activeSessions.map((g, si) => {
      const parsedDate = this.parseClassDate(clsFechas[si] || '');
      
      if (parsedDate.isNoClass) {
        const dotTitle = `Clase ${si + 1} (Sin clase${parsedDate.reason ? ': ' + parsedDate.reason : ''})`;
        const buttons = CONFIG.LEVELS.map(lvl => {
          return `<button class="grade-btn" data-idx="${idx}" data-dim="${dim}" data-si="${si}" data-lvl="${lvl}" title="${CONFIG.LEVEL_LABEL[lvl]}" disabled>${lvl}</button>`;
        }).join('');
        return `<div class="session-row" style="opacity: 0.3; cursor: not-allowed;">
          <span class="session-dot dot-noclass" title="${dotTitle}">❌</span>
          <div class="session-btns">${buttons}</div>
        </div>`;
      }
      
      const absent = att[si] === 'A';
      const disabledAttr = absent ? 'disabled' : '';
      const sessionRowOp = absent ? 'opacity: 0.5;' : '';
      const buttons = CONFIG.LEVELS.map(lvl => {
        const isSelected = g === lvl;
        const selCls = isSelected ? `sel-${lvl.toLowerCase()}` : '';
        return `<button class="grade-btn ${selCls}" data-idx="${idx}" data-dim="${dim}" data-si="${si}" data-lvl="${lvl}" title="${CONFIG.LEVEL_LABEL[lvl]}" ${disabledAttr}>${lvl}</button>`;
      }).join('');

      const dotColor = g ? `dot-${g.toLowerCase()}` : '';
      const dateStr = (clsFechas && clsFechas[si]) ? ` (${this.formatDate(clsFechas[si])})` : '';
      return `<div class="session-row" style="${sessionRowOp}">
        <span class="session-dot ${dotColor}" title="Clase ${si + 1}${dateStr}: ${g ? CONFIG.LEVEL_LABEL[g] : 'Sin calificar'}">${si + 1}</span>
        <div class="session-btns">${buttons}</div>
      </div>`;
    }).join('');

    // El badge de calificación efectiva solo aparece cuando TODAS las sesiones están calificadas (o canceladas)
    const allFilled = activeSessions.every((g, si) => {
      const parsedDate = this.parseClassDate(clsFechas[si] || '');
      return parsedDate.isNoClass || (g !== null && g !== '');
    });
    const codeHtml = (eff && allFilled)
      ? `<div class="dim-code"><span class="dim-code-letters">${code}</span><span class="dim-eff-badge eff-${eff.toLowerCase()}">${CONFIG.LEVEL_EMOJI[eff]} ${CONFIG.LEVEL_LABEL[eff]}</span></div>`
      : `<div class="dim-code dim-code-empty"><span class="dim-code-letters">${code}</span></div>`;

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

  applyPointsHighlights(grades) {
    if (!grades || grades.length === 0) return;

    const points = grades.map(g => g?.puntos || 0);
    const maxPts = Math.max(...points);
    const minPts = Math.min(...points);

    grades.forEach((g, idx) => {
      const row = document.getElementById(`row-${idx}`);
      const cell = document.getElementById(`student-cell-${idx}`);
      if (!row || !cell) return;
      const pts = g?.puntos || 0;

      const isLeader  = maxPts > 0 && pts === maxPts;
      const isTrailer = minPts < 0 && pts === minPts;

      row.classList.toggle('pts-leader', isLeader);
      row.classList.toggle('pts-trailer', isTrailer);
      cell.classList.toggle('pts-leader-cell', isLeader);
      cell.classList.toggle('pts-trailer-cell', isTrailer);
    });
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

    if (this.confettiFrame) cancelAnimationFrame(this.confettiFrame);

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

    const draw = () => {
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
      if (!allOff) this.confettiFrame = requestAnimationFrame(draw);
      else { ctx.clearRect(0, 0, canvas.width, canvas.height); this.confettiFrame = null; }
    };
    draw();
  }

  updateGDriveUI(state, text) {
    if (!this.btnGDrive) return;

    this.btnGDrive.classList.remove('gdrive-connected', 'gdrive-syncing', 'gdrive-error');
    
    if (this.gdriveSyncIndicator) {
      this.gdriveSyncIndicator.style.opacity = '0';
    }

    if (state === 'connected') {
      this.btnGDrive.classList.add('gdrive-connected');
      this.btnGDrive.textContent = text || '☁️ Drive Conectado (Desvincular)';
      this.btnGDrive.title = 'Google Drive conectado. Haz clic para desvincular.';
    } else if (state === 'syncing') {
      this.btnGDrive.classList.add('gdrive-syncing');
      this.btnGDrive.textContent = text || '☁️ Sincronizando...';
      this.btnGDrive.title = 'Sincronizando base de datos con Google Drive...';
      if (this.gdriveSyncIndicator) {
        this.gdriveSyncIndicator.style.opacity = '1';
        this.gdriveSyncIndicator.textContent = '☁️ Sincronizando Drive...';
      }
    } else if (state === 'error') {
      this.btnGDrive.classList.add('gdrive-error');
      this.btnGDrive.textContent = text || '⚠️ Error Sync (Reintentar/Desvincular)';
      this.btnGDrive.title = 'Error en la sincronización. Haz clic para reintentar o desvincular.';
    } else {
      this.btnGDrive.textContent = text || '☁️ Conectar Drive';
      this.btnGDrive.title = 'Vincular la aplicación con Google Drive para respaldos automáticos.';
    }
  }

  showGDriveConfigModal(clientId, clientSecret) {
    if (!this.gdriveConfigModal) return;
    if (this.gdriveClientId) this.gdriveClientId.value = clientId || '';
    if (this.gdriveClientSecret) this.gdriveClientSecret.value = clientSecret || '';
    this.gdriveConfigModal.style.display = 'flex';
  }

  hideGDriveConfigModal() {
    if (this.gdriveConfigModal) {
      this.gdriveConfigModal.style.display = 'none';
    }
  }
}
