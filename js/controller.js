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
    this.initUpdater();
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
        text: 'Los botones numerados registran la asistencia por clase (verde = presente, rojo = ausente). Los botones ＋ y − son puntos por nivel. El botón «Notas» abre observaciones opcionales (por ejemplo si quedó en Alto o En proceso); no ensancha la tabla y se guardan en el CSV.'
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
    this.view.onRenameClass = (id, newName, numSesiones, newStudentsList) => {
      if (this.model.renameClass(id, newName, numSesiones, newStudentsList)) {
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
      this.handlePeriodSelect.bind(this),
      this.handleClassReorder.bind(this)
    );

    const clsData = this.model.getCurrentClassData();
    const numSesiones = clsData?.numSesiones || 3;

    this.view.renderClassDates(
      numSesiones,
      this.model.currentPeriod,
      clsData,
      this.handleClassDateChange.bind(this)
    );

    this.view.renderClassObservation(
      this.model.currentPeriod,
      clsData,
      this.handleClassObsChange.bind(this),
      this.handleClassObsSave.bind(this)
    );

    this.view.renderTable(
      this.model.getStudents(),
      this.model.getGrades(),
      this.model,
      this.handleSessionSelect.bind(this),
      this.handleAttendance.bind(this),
      this.handlePoints.bind(this),
      this.handleObservaciones.bind(this),
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

  handleClassReorder(draggedId, targetId) {
    this.model.reorderClasses(draggedId, targetId);
    this.refreshView();
    if (this.model.currentFileHandle) {
      this.model.saveFile(false).catch(() => {});
    } else {
      this.model.autoSave();
    }
  }

  handleClassObsChange(sessionIdx, text) {
    this.model.updateClassObservation(sessionIdx, text);
  }

  handleClassObsSave() {
    if (this.model.currentFileHandle) {
      this.model.saveFile(false).catch(() => {});
    } else {
      this.model.autoSave();
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

  handleClassDateChange(sessionIdx, dateStr) {
    this.model.updateClassDate(sessionIdx, dateStr);
    this.refreshView();
    if (this.model.currentFileHandle) {
      this.model.saveFile(false).catch(() => {});
    }
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
      this.handlePoints.bind(this),
      this.handleObservaciones.bind(this)
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
      this.handlePoints.bind(this),
      this.handleObservaciones.bind(this)
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
      this.handlePoints.bind(this),
      this.handleObservaciones.bind(this)
    );
    if (this.model.currentFileHandle) {
      this.model.saveFile(false).catch(() => {});
    }
  }

  async handleObservaciones(idx, si) {
    const students = this.model.getStudents();
    const name = students[idx];
    if (name == null) return;
    const grades = this.model.getGrades();
    const obsArr = grades[idx].observaciones || [];
    const cur = String(obsArr[si] || '');
    const cls = this.model.getCurrentClassData();
    const period = this.model.currentPeriod;
    const dateStr = (cls && cls.fechas && cls.fechas[period] && cls.fechas[period][si]) || '';
    const result = await this.view.showObsModal(name, si + 1, cur, dateStr);
    if (result === null) return;
    const trimmed = String(result).trim();
    const prev = cur.trim();
    const newGrade = this.model.updateObservaciones(idx, si, result);
    this.view.updateRow(idx, newGrade, this.model,
      this.handleSessionSelect.bind(this),
      this.handleAttendance.bind(this),
      this.handlePoints.bind(this),
      this.handleObservaciones.bind(this)
    );
    if (this.model.currentFileHandle) {
      this.model.saveFile(false).catch(() => {});
    }
    if (trimmed !== prev) {
      this.view.showToast('📝 Observación guardada');
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

  initUpdater() {
    if (!window.electronAPI) return;

    // Modales y botones de actualización
    const updateModal = document.getElementById('updateModal');
    const updateModalTitle = document.getElementById('updateModalTitle');
    const updateModalMsg = document.getElementById('updateModalMsg');
    const updateProgressContainer = document.getElementById('updateProgressContainer');
    const updateProgressBar = document.getElementById('updateProgressBar');
    const updateProgressPercent = document.getElementById('updateProgressPercent');
    const updateProgressSpeed = document.getElementById('updateProgressSpeed');
    const btnCancelUpdate = document.getElementById('btnCancelUpdate');
    const btnDownloadUpdate = document.getElementById('btnDownloadUpdate');
    const updateModalActions = document.getElementById('updateModalActions');

    // Modal y botones de Acerca de
    const aboutModal = document.getElementById('aboutModal');
    const aboutToggle = document.getElementById('aboutToggle');
    const btnCloseAboutModal = document.getElementById('btnCloseAboutModal');
    const btnCloseAbout = document.getElementById('btnCloseAbout');
    const btnCheckUpdatesManual = document.getElementById('btnCheckUpdatesManual');

    if (!updateModal) return;

    let updateInfo = null;
    let isDownloaded = false;
    let isManualCheck = false;

    // Control del modal Acerca de
    if (aboutToggle && aboutModal) {
      aboutToggle.onclick = () => {
        aboutModal.style.display = 'flex';
      };
    }

    const closeAbout = () => {
      if (aboutModal) aboutModal.style.display = 'none';
    };

    const closeUpdateModal = () => {
      if (updateModal) updateModal.style.display = 'none';
    };

    if (btnCloseAboutModal) btnCloseAboutModal.onclick = closeAbout;
    if (btnCloseAbout) btnCloseAbout.onclick = closeAbout;

    // Cerrar modal Acerca de al hacer clic fuera del contenido del modal
    if (aboutModal) {
      aboutModal.onclick = (e) => {
        if (e.target === aboutModal) {
          closeAbout();
        }
      };
    }

    // Cerrar modal de actualización al hacer clic fuera del contenido
    if (updateModal) {
      updateModal.onclick = (e) => {
        if (e.target === updateModal) {
          closeUpdateModal();
        }
      };
    }

    // Escuchar eventos de actualización desde el proceso principal
    window.electronAPI.onUpdateAvailable((info) => {
      updateInfo = info;
      isDownloaded = false;

      // Si es una comprobación manual, cerramos el modal de Acerca de para enfocar el de actualización
      if (isManualCheck) {
        closeAbout();
        isManualCheck = false;
        if (btnCheckUpdatesManual) {
          btnCheckUpdatesManual.disabled = false;
          btnCheckUpdatesManual.textContent = '🔍 Buscar Actualizaciones';
        }
      }

      updateModalTitle.textContent = '✨ Actualización Disponible';
      updateModalMsg.innerHTML = `Una nueva versión <strong>v${info.version}</strong> está disponible.<br><br>¿Deseas descargarla e instalarla ahora?`;
      updateProgressContainer.style.display = 'none';
      btnDownloadUpdate.textContent = 'Descargar';
      btnDownloadUpdate.style.display = 'block';
      btnDownloadUpdate.disabled = false;
      btnCancelUpdate.textContent = 'Ignorar';
      updateModalActions.style.display = 'flex';
      updateModal.style.display = 'flex';
    });

    window.electronAPI.onUpdateNotAvailable((info) => {
      if (isManualCheck) {
        isManualCheck = false;
        if (btnCheckUpdatesManual) {
          btnCheckUpdatesManual.disabled = false;
          btnCheckUpdatesManual.textContent = '🔍 Buscar Actualizaciones';
        }
        this.view.showToast('✅ Ya tienes la versión más reciente.');
      }
    });

    window.electronAPI.onDownloadProgress((progress) => {
      updateProgressContainer.style.display = 'block';
      btnDownloadUpdate.style.display = 'none'; // ocultar botón de descargar durante el progreso
      btnCancelUpdate.textContent = 'Descargar en segundo plano';
      const percent = Math.round(progress.percent || 0);
      updateProgressBar.style.width = `${percent}%`;
      updateProgressPercent.textContent = `${percent}%`;
      
      const speed = progress.bytesPerSecond;
      let speedText = '';
      if (speed > 1024 * 1024) {
        speedText = `${(speed / (1024 * 1024)).toFixed(2)} MB/s`;
      } else if (speed > 1024) {
        speedText = `${(speed / 1024).toFixed(2)} KB/s`;
      } else {
        speedText = `${speed} B/s`;
      }
      updateProgressSpeed.textContent = speedText;
    });

    window.electronAPI.onUpdateDownloaded((info) => {
      isDownloaded = true;
      updateModalTitle.textContent = '🎉 Descarga Completa';
      updateModalMsg.innerHTML = `La versión <strong>v${info.version}</strong> se descargó correctamente.<br><br>Haz clic en "Reiniciar y Actualizar" para aplicar la actualización.`;
      updateProgressContainer.style.display = 'none';
      btnDownloadUpdate.textContent = 'Reiniciar y Actualizar';
      btnDownloadUpdate.style.display = 'block';
      btnDownloadUpdate.disabled = false;
      btnCancelUpdate.textContent = 'Más tarde';
      updateModalActions.style.display = 'flex';
      updateModal.style.display = 'flex';
    });

    window.electronAPI.onUpdateError((errorMsg) => {
      console.error('Error de actualización:', errorMsg);

      if (isManualCheck) {
        isManualCheck = false;
        if (btnCheckUpdatesManual) {
          btnCheckUpdatesManual.disabled = false;
          btnCheckUpdatesManual.textContent = '🔍 Buscar Actualizaciones';
        }
        this.view.showToast('❌ Error al buscar actualizaciones.');
      }

      if (updateModal.style.display === 'flex' && !isDownloaded) {
        updateModalTitle.textContent = '⚠️ Error de Actualización';
        updateModalMsg.innerHTML = `No se pudo descargar la actualización.<br><br><span style="font-size:0.85rem;color:var(--a-color);">${errorMsg}</span>`;
        updateProgressContainer.style.display = 'none';
        btnDownloadUpdate.style.display = 'none';
        btnCancelUpdate.textContent = 'Cerrar';
      }
    });

    // Vincular acciones de los botones de actualización
    const btnIgnoreUpdateClose = document.getElementById('btnIgnoreUpdateClose');
    btnCancelUpdate.onclick = closeUpdateModal;
    if (btnIgnoreUpdateClose) {
      btnIgnoreUpdateClose.onclick = closeUpdateModal;
    }

    btnDownloadUpdate.onclick = async () => {
      if (isDownloaded) {
        window.electronAPI.quitAndInstall();
      } else {
        btnDownloadUpdate.disabled = true;
        btnDownloadUpdate.textContent = 'Iniciando descarga...';
        await window.electronAPI.downloadUpdate();
      }
    };

    // Búsqueda manual de actualizaciones
    if (btnCheckUpdatesManual) {
      btnCheckUpdatesManual.onclick = async () => {
        isManualCheck = true;
        btnCheckUpdatesManual.disabled = true;
        btnCheckUpdatesManual.textContent = '🔍 Buscando actualizaciones...';
        try {
          await window.electronAPI.checkForUpdates();
        } catch (err) {
          console.error(err);
          if (isManualCheck) {
            isManualCheck = false;
            btnCheckUpdatesManual.disabled = false;
            btnCheckUpdatesManual.textContent = '🔍 Buscar Actualizaciones';
            this.view.showToast('❌ Error al conectar con el servidor.');
          }
        }
      };
    }
  }
}
