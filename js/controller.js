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
        // lastPath puede ser ruta de archivo o 'browser_session:nombre'
        let fileName;
        if (lastPath.startsWith('browser_session:')) {
          fileName = lastPath.replace('browser_session:', '');
        } else {
          fileName = lastPath.split('/').pop().split('\\').pop();
        }
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
    
    this.initTour(!lastPath);
  }

  initTour(showWelcomeTour = false) {
    // Pasos en la pantalla de bienvenida (solo cuando la bienvenida está visible)
    this.welcomeSteps = [
      {
        target: '.welcome-card',
        title: '🎓 Bienvenido al Calificador LNG',
        text: 'Esta es tu pantalla de inicio. Desde aquí puedes crear una nueva base de datos o abrir una que ya tengas guardada.'
      },
      {
        target: '#btnNewFile',
        title: '📄 Crear Archivo Nuevo',
        text: 'Haz clic aquí para crear tu primera base de datos. Se guardará como un archivo .csv en tu computadora donde elijas.'
      },
      {
        target: '#btnOpenFile',
        title: '📂 Abrir Base de Datos',
        text: 'Si ya tienes un archivo guardado de una clase anterior, úsalo aquí para continuar donde lo dejaste.'
      }
    ];

    // Pasos dentro de la app
    this.appSteps = [
      {
        target: '#classTabs',
        title: '🏫 Tus Materias',
        text: 'Aquí aparecen todas tus materias. Usa "Agregar Materia" para crear una nueva y define cuántas clases tendrá por nivel. Haz clic en el ✏️ de cualquier materia para editarla o cambiar su número de clases en cualquier momento.'
      },
      {
        target: '.header-actions',
        title: '⚡ Calificación Rápida',
        text: 'Estos botones P/A/S llenan automáticamente la primera casilla vacía de toda la clase de golpe. ¡Muy útil!'
      },
      {
        target: '.period-tabs',
        title: '📊 Niveles de Desempeño',
        text: 'Inicial, Básico, Alto y Superior son los cuatro niveles de evaluación. Cada uno guarda su propio historial de notas de forma independiente.'
      },
      {
        target: '.student-extras',
        title: '📋 Asistencia y Puntos',
        text: 'Los botones numerados registran la asistencia por clase (verde = presente, rojo = ausente). El número de botones refleja las clases configuradas para esta materia. Los botones ＋ y − acumulan puntos positivos o negativos en el nivel actual. La etiqueta "Asistencia" y los botones mantienen espacio para que no se encimen.'
      },
      {
        target: '#gradingTable',
        title: '🌟 Destacados por puntos',
        text: 'La fila completa del estudiante con más puntos positivos se resalta en verde (empates: varios a la vez). La del peor puntaje negativo en rojo. En modo claro los colores son un poco más suaves para que se lea bien el texto.'
      },
      {
        target: '.action-row',
        title: '💾 Guardar y Exportar',
        text: 'Tus datos se autoguardan cada minuto. Aquí puedes guardar manualmente, exportar a CSV o copiar el resumen al portapapeles.'
      }
    ];

    // Botón Tour Guiado (visible en la app): siempre ejecuta el tour de la app
    const btnTour = document.getElementById('tourToggle');
    if (btnTour) btnTour.onclick = () => {
      const appTour = new Tour(this.appSteps);
      appTour.start();
    };

    const btnHome = document.getElementById('homeToggle');
    if (btnHome) btnHome.onclick = async () => {
      if (confirm('¿Estás seguro de volver al inicio? Asegúrate de haber presionado "Guardar BD" si hiciste cambios importantes.')) {
        await this.model.autoSave();
        this.view.welcomeScreen.style.display = 'flex';
        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
      }
    };

    // Muestra el tour de bienvenida si no hay archivo guardado para continuar
    if (showWelcomeTour) {
      const welcomeTour = new Tour(this.welcomeSteps);
      setTimeout(() => welcomeTour.start(), 500);
    }
  }

  startAppTour() {
    const appTour = new Tour(this.appSteps);
    setTimeout(() => appTour.start(), 700);
  }

  bindEvents() {
    // Callback para pedir nombre de archivo en Firefox (evita prompt() nativo)
    this.model.onRequestFilename = (defaultName, note) =>
      this.view.showSaveNameModal(defaultName, note);

    // Rename class callback (siempre activo)
    this.view.onRenameClass = (id, newName, numSesiones) => {
      if (this.model.renameClass(id, newName, numSesiones)) {
        this.refreshView();
        this.view.showToast('✅ Materia actualizada');
        this.model.autoSave();
      }
    };

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
        const dim = btn.dataset.dim;
        const lvl = btn.dataset.lvl;
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

    const numSesiones = this.model.getCurrentClassData()?.numSesiones || 3;
    this.view.renderTable(
      this.model.getStudents(),
      this.model.getGrades(),
      this.model,
      this.handleSessionSelect.bind(this),
      this.handleAttendance.bind(this),
      this.handlePoints.bind(this),
      numSesiones
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
      this.startAppTour();
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
    this.model.addClass(data.name, students, data.numSesiones);
    
    this.view.hideAddClassModal();
    this.view.showToast(`✅ Materia ${data.name} agregada`);
    this.refreshView();
    
    if (this.model.currentFileHandle) this.handleSaveFile(false);
  }

  handleSessionSelect(idx, dim, sessionIdx, lvl) {
    const newGrade = this.model.updateSession(idx, dim, sessionIdx, lvl);
    this.view.updateRow(idx, newGrade, this.model,
      this.handleSessionSelect.bind(this),
      this.handleAttendance.bind(this),
      this.handlePoints.bind(this)
    );
    this.view.updateStats(this.model.getStats());

    if (this.model.overallLevel(newGrade) === 'S') {
      this.view.launchConfetti();
    }
    
    if (this.model.currentFileHandle) {
      this.model.saveFile(false).catch(() => {});
    }
  }

  handleAttendance(idx, sessionIdx) {
    const newGrade = this.model.updateAttendance(idx, sessionIdx);
    this.view.updateRow(idx, newGrade, this.model,
      this.handleSessionSelect.bind(this),
      this.handleAttendance.bind(this),
      this.handlePoints.bind(this)
    );
    if (this.model.currentFileHandle) {
      this.model.saveFile(false).catch(() => {});
    }
  }

  handlePoints(idx, delta) {
    const newGrade = this.model.updatePoints(idx, delta);
    this.view.updateRow(idx, newGrade, this.model,
      this.handleSessionSelect.bind(this),
      this.handleAttendance.bind(this),
      this.handlePoints.bind(this)
    );
    if (this.model.currentFileHandle) {
      this.model.saveFile(false).catch(() => {});
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
