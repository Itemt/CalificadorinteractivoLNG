class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.autoSaveInterval = null;
  }

  async init() {
    this.bindEvents();
    
    const lastPath = await this.model.checkLastFile();
    if (lastPath) {
      const btnContinue = document.getElementById('btnContinueLast');
      if (btnContinue) {
        btnContinue.style.display = 'block';
        const fileName = lastPath.split('/').pop().split('\\').pop();
        btnContinue.textContent = `🔄 Continuar con: ${fileName}`;
        btnContinue.onclick = async () => {
          const loaded = await this.model.loadLastFile();
          if (loaded) {
            this.view.hideWelcomeScreen();
            this.refreshView();
            this.startAutoSave();
            this.view.showToast('📄 Archivo recuperado');
          } else {
            this.view.showError('No se pudo leer el archivo anterior.');
          }
        };
      }
    }
    
    this.initTour();
  }

  initTour() {
    const steps = [
      {
        target: '#classTabs',
        title: 'Tus Clases',
        text: 'Comienza aquí creando tus clases y pegando tu lista de estudiantes. Cada pestaña es una clase distinta.'
      },
      {
        target: '.header-actions',
        title: 'Calificación Rápida',
        text: 'Califica a toda tu clase de una vez utilizando estos botones de flecha. Llenarán automáticamente las casillas vacías.'
      },
      {
        target: '.period-tabs',
        title: 'Periodos de Tiempo',
        text: 'Avanza en el tiempo escolar. Cada nivel (Inicial, Básico...) representa 3 semanas de historial de notas independiente.'
      },
      {
        target: '.action-row',
        title: 'Exportar y Guardar',
        text: 'Tus datos se autoguardan cada minuto, pero aquí puedes exportar una copia o copiar las notas al portapapeles.'
      }
    ];
    this.tour = new Tour(steps);
    
    const btnTour = document.getElementById('tourToggle');
    if (btnTour) btnTour.onclick = () => {
      this.view.hideWelcomeScreen();
      this.tour.start();
    };

    const btnHome = document.getElementById('homeToggle');
    if (btnHome) btnHome.onclick = async () => {
      if (confirm('¿Estás seguro de volver al inicio? Asegúrate de haber presionado "Guardar BD" si hiciste cambios importantes.')) {
        await this.model.autoSave();
        this.view.welcomeScreen.style.display = 'flex';
        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
      }
    };
  }

  bindEvents() {
    // Welcome Actions
    this.view.bindWelcomeActions(
      this.handleNewFile.bind(this),
      this.handleOpenFile.bind(this)
    );

    // Add Class Modal Actions
    this.view.bindAddClassActions(
      () => this.view.hideAddClassModal(),
      this.handleSaveNewClass.bind(this)
    );

    // Action Row (Header global buttons)
    const btnOpenMain = document.getElementById('btnOpenMain');
    if (btnOpenMain) btnOpenMain.onclick = this.handleOpenFile.bind(this);
    
    document.getElementById('btnExport').onclick = this.handleExportText.bind(this);
    document.getElementById('btnReset').onclick = this.handleResetClass.bind(this);
    
    // Save buttons
    const btnSave = document.querySelector('.btn-db[title="Guardar cambios en el archivo actual"]');
    if (btnSave) btnSave.onclick = () => this.handleSaveFile(false);
    
    const btnSaveAs = document.querySelector('.btn-db[title="Guardar como un archivo nuevo"]');
    if (btnSaveAs) btnSaveAs.onclick = () => this.handleSaveFile(true);

    // Fast-fill header buttons (P⬇, A⬇, S⬇)
    document.querySelectorAll('.h-btn').forEach(btn => {
      btn.onclick = () => {
        // Find dimension based on parent header
        const dimTh = btn.closest('.col-dim');
        let dim = null;
        if (dimTh.innerHTML.includes('Conceptos')) dim = 'conceptos';
        else if (dimTh.innerHTML.includes('Práctica')) dim = 'practica';
        else if (dimTh.innerHTML.includes('Comportamiento')) dim = 'comportamiento';
        
        const lvl = btn.textContent.charAt(0); // Extract 'P', 'A', 'S'
        if (dim && CONFIG.LEVELS.includes(lvl)) {
          this.handleFillAll(dim, lvl);
        }
      };
    });
  }

  refreshView() {
    this.view.renderTabs(
      this.model.appData.classes,
      this.model.currentClass,
      this.model.currentPeriod,
      this.handleClassSelect.bind(this),
      () => this.view.showAddClassModal(),
      this.handlePeriodSelect.bind(this)
    );

    this.view.renderTable(
      this.model.getStudents(),
      this.model.getGrades(),
      this.model,
      this.handleSessionSelect.bind(this)
    );

    this.view.updateStats(this.model.getStats());
  }

  async handleNewFile() {
    this.model.newFile();
    const success = await this.model.saveFile(true);
    if (success) {
      this.view.hideWelcomeScreen();
      this.refreshView();
      this.startAutoSave();
      this.view.showToast('📄 Base de datos creada');
      
      if (!localStorage.getItem('calificador_tour_seen')) {
        setTimeout(() => this.tour.start(), 500);
      }
    } else {
      this.view.showError('Creación de archivo cancelada.');
    }
  }

  async handleOpenFile() {
    try {
      const success = await this.model.openFile();
      if (success) {
        this.view.hideWelcomeScreen();
        this.view.showToast('📂 Archivo cargado con éxito');
        this.refreshView();
        this.startAutoSave();
        
        if (!localStorage.getItem('calificador_tour_seen')) {
          setTimeout(() => this.tour.start(), 500);
        }
      } else {
        this.view.showError('Apertura cancelada.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        this.view.showError('Apertura cancelada.');
      } else {
        this.view.showError('Error al abrir: ' + err.message);
      }
    }
  }

  async handleSaveFile(isSaveAs) {
    try {
      const success = await this.model.saveFile(isSaveAs);
      if (success) {
        this.view.showToast('💾 Cambios guardados correctamente');
        if (isSaveAs) this.startAutoSave();
      } else {
        this.view.showError('Guardado cancelado.');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        this.view.showError('Guardado cancelado.');
      } else {
        this.view.showError('Error al guardar: ' + err.message);
      }
    }
  }

  handleClassSelect(classId) {
    this.model.setCurrentClass(classId);
    this.refreshView();
  }

  handlePeriodSelect(period) {
    this.model.setCurrentPeriod(period);
    this.refreshView();
  }

  handleSaveNewClass() {
    const data = this.view.getNewClassData();
    if (!data.name || !data.studentsStr) {
      this.view.showError("Ingresa el nombre de la clase y al menos un estudiante.");
      return;
    }
    
    const students = data.studentsStr.split('\n').map(s => s.trim()).filter(Boolean);
    this.model.addClass(data.name, students);
    
    this.view.hideAddClassModal();
    this.view.showToast(`✅ Clase ${data.name} agregada`);
    this.refreshView();
    
    if (this.model.currentFileHandle) this.handleSaveFile(false);
  }

  handleSessionSelect(idx, dim, sessionIdx, lvl) {
    const newGrade = this.model.updateSession(idx, dim, sessionIdx, lvl);
    this.view.updateRow(idx, newGrade, this.model, this.handleSessionSelect.bind(this));
    this.view.updateStats(this.model.getStats());

    if (this.model.overallLevel(newGrade) === 'S') {
      this.view.launchConfetti();
    }
    
    if (this.model.currentFileHandle) {
      this.model.saveFile(false).catch(console.error); // Silent auto-save
    }
  }

  handleFillAll(dim, lvl) {
    if (!this.model.currentClass) return;
    if (!confirm(`¿Asignar ${CONFIG.LEVEL_LABEL[lvl]} a la primera sesión vacía de todos los estudiantes?`)) return;
    
    const filledCount = this.model.fillAllDimension(dim, lvl);
    if (filledCount > 0) {
      this.refreshView();
      this.view.showToast(`✅ Se asignó ${CONFIG.LEVEL_LABEL[lvl]} a ${filledCount} estudiantes`);
      if (this.model.currentFileHandle) this.handleSaveFile(false);
    } else {
      this.view.showToast(`ℹ️ No hay sesiones vacías`);
    }
  }

  handleExportText() {
    const txt = this.model.exportTextData();
    if (!txt) return;

    navigator.clipboard.writeText(txt)
      .then(() => this.view.showToast('✅ ¡Copiado al portapapeles!'))
      .catch(() => this.view.showToast('❌ No se pudo copiar'));
  }

  handleResetClass() {
    if (!this.model.currentClass) return;
    const clsName = this.model.getCurrentClassData().name;
    const periodName = CONFIG.PERIODS.find(p => p.id === this.model.currentPeriod).label;
    
    if (!confirm(`¿Reiniciar todas las calificaciones del periodo "${periodName}" para la clase ${clsName}?`)) return;
    
    this.model.resetCurrentClass();
    this.refreshView();
    this.view.showToast('🔄 Clase reiniciada');
    if (this.model.currentFileHandle) this.handleSaveFile(false);
  }

  startAutoSave() {
    if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
    this.autoSaveInterval = setInterval(async () => {
      await this.model.autoSave();
      const indicator = document.getElementById('autoSaveIndicator');
      if (indicator) {
        indicator.style.opacity = '1';
        setTimeout(() => indicator.style.opacity = '0', 2000);
      }
    }, 60000);
  }
}
