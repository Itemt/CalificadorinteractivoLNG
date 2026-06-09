class Model {
  constructor() {
    this.appData = this.createEmptyData();
    this.currentFileHandle = null;
    this.currentPeriod = localStorage.getItem('calificador_currentPeriod') || 'inicial';
    this.currentClass = null;
  }

  createEmptyData() {
    return {
      classes: {},
      grades: {
        inicial: {},
        basico: {},
        alto: {},
        superior: {}
      }
    };
  }

  emptyGrade() {
    return {
      conceptos: [null, null, null],
      practica: [null, null, null],
      comportamiento: [null, null, null],
      autoevaluacion: [null, null, null],
      asistencia: [null, null, null], // null = presente, 'A' = ausente
      puntos: 0,
      observaciones: [null, null, null] // notas libres por sesión
    };
  }

  setCurrentPeriod(periodId) {
    this.currentPeriod = periodId;
    localStorage.setItem('calificador_currentPeriod', periodId);
  }

  setCurrentClass(clsId) {
    this.currentClass = clsId;
  }

  getCurrentClassData() {
    if (!this.currentClass || !this.appData.classes[this.currentClass]) return null;
    return this.appData.classes[this.currentClass];
  }

  getStudents() {
    const cls = this.getCurrentClassData();
    return cls ? cls.students : [];
  }

  getGrades() {
    if (!this.currentClass) return [];
    return this.appData.grades[this.currentPeriod][this.currentClass];
  }

  addClass(name, students, numSesiones = 3) {
    const id = 'class_' + Date.now();
    this.appData.classes[id] = {
      id,
      name,
      students,
      numSesiones,
      fechas: {
        inicial: [],
        basico: [],
        alto: [],
        superior: []
      },
      observaciones: {
        inicial: [],
        basico: [],
        alto: [],
        superior: []
      }
    };
    
    CONFIG.PERIODS.forEach(p => {
      this.appData.grades[p.id][id] = students.map(() => this.emptyGrade());
    });
    
    this.currentClass = id;
    return id;
  }

  resetCurrentClass() {
    const students = this.getStudents();
    this.appData.grades[this.currentPeriod][this.currentClass] = students.map(() => this.emptyGrade());
  }

  effectiveForDim(sessions) {
    const filled = sessions.filter(Boolean);
    if (filled.length === 0) return null;
    if (filled.includes('P')) return 'P';
    if (filled.includes('A')) return 'A';
    return 'S';
  }

  // Valoración por periodo (la peor nota prevalece — calcula con las sesiones ya registradas)
  overallLevel(grade) {
    const effs = CONFIG.DIMS.map(d => this.effectiveForDim(grade[d] || [])).filter(Boolean);
    if (effs.length === 0) return null;
    if (effs.includes('P')) return 'P';
    if (effs.includes('A')) return 'A';
    return 'S';
  }

  // Consolidado del trimestre: S=todos S; A=al menos uno A; P=2+ en P
  trimesterConsolidated(gradesAllPeriods) {
    // gradesAllPeriods: array of grade objects (one per period)
    const effs = [];
    gradesAllPeriods.forEach(grade => {
      if (!grade) return;
      CONFIG.DIMS.forEach(d => {
        const e = this.effectiveForDim(grade[d]);
        if (e) effs.push(e);
      });
    });
    if (effs.length === 0) return null;
    const countP = effs.filter(e => e === 'P').length;
    if (countP >= 2) return 'P';
    if (effs.includes('A')) return 'A';
    if (effs.every(e => e === 'S')) return 'S';
    return 'A'; // has some S, no A, less than 2 P
  }

  // Consolidado por estudiante usando todos los periodos actuales
  getStudentConsolidated(studentIdx) {
    if (!this.currentClass) return null;
    const gradesAllPeriods = CONFIG.PERIODS.map(p => {
      const pg = this.appData.grades[p.id][this.currentClass];
      return pg ? pg[studentIdx] : null;
    });
    return this.trimesterConsolidated(gradesAllPeriods);
  }

  updateSession(studentIdx, dim, sessionIdx, lvl) {
    const grades = this.getGrades();
    const arr = grades[studentIdx][dim];
    // Expandir array si el índice está fuera del rango actual
    while (arr.length <= sessionIdx) arr.push(null);
    arr[sessionIdx] = (arr[sessionIdx] === lvl) ? null : lvl;
    return grades[studentIdx];
  }

  updateAttendance(studentIdx, sessionIdx) {
    const grades = this.getGrades();
    const att = grades[studentIdx].asistencia || [];
    while (att.length <= sessionIdx) att.push(null);
    att[sessionIdx] = att[sessionIdx] === 'A' ? null : 'A';
    grades[studentIdx].asistencia = att;
    return grades[studentIdx];
  }

  updatePoints(studentIdx, delta) {
    const grades = this.getGrades();
    grades[studentIdx].puntos = (grades[studentIdx].puntos || 0) + delta;
    return grades[studentIdx];
  }

  updateObservaciones(studentIdx, sessionIdx, text) {
    const grades = this.getGrades();
    if (!grades[studentIdx].observaciones || typeof grades[studentIdx].observaciones === 'string') {
      grades[studentIdx].observaciones = [null, null, null];
    }
    const val = String(text || '').trim();
    grades[studentIdx].observaciones[sessionIdx] = val ? val : null;
    return grades[studentIdx];
  }

  updateClassDate(sessionIdx, dateStr) {
    if (!this.currentClass) return;
    const cls = this.getCurrentClassData();
    if (!cls) return;
    
    if (!cls.fechas) {
      cls.fechas = {
        inicial: [],
        basico: [],
        alto: [],
        superior: []
      };
    }
    
    if (!cls.fechas[this.currentPeriod]) {
      cls.fechas[this.currentPeriod] = [];
    }
    
    while (cls.fechas[this.currentPeriod].length <= sessionIdx) {
      cls.fechas[this.currentPeriod].push('');
    }
    
    cls.fechas[this.currentPeriod][sessionIdx] = dateStr;
    return cls.fechas[this.currentPeriod];
  }

  fillAllDimension(dim, lvl) {
    let filledCount = 0;
    const students = this.getStudents();
    const grades = this.getGrades();
    const cls = this.getCurrentClassData();
    const numSesiones = cls?.numSesiones || 3;
    const dates = (cls && cls.fechas && cls.fechas[this.currentPeriod]) || [];
    
    // 1. Encontrar la sesión "objetivo" global de la clase
    // Es la primera columna donde al menos un estudiante presente aún no tiene nota
    let targetIdx = -1;
    for (let i = 0; i < numSesiones; i++) {
      const dateStr = dates[i] || '';
      if (dateStr.startsWith('NC:')) {
        continue; // Ignorar clases canceladas
      }
      let needsGrading = false;
      for (let idx = 0; idx < students.length; idx++) {
        const sessions = grades[idx][dim] || [];
        const asistencia = grades[idx].asistencia || [];
        if (!sessions[i] && asistencia[i] !== 'A') {
          needsGrading = true;
          break;
        }
      }
      if (needsGrading) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx === -1) return 0; // Todo está lleno o todos faltaron a lo que queda
    
    // 2. Llenar SOLO en targetIdx para los estudiantes presentes
    students.forEach((name, idx) => {
      const sessions = grades[idx][dim];
      const asistencia = grades[idx].asistencia || [];
      
      if (!sessions[targetIdx] && asistencia[targetIdx] !== 'A') {
        while (sessions.length <= targetIdx) sessions.push(null);
        sessions[targetIdx] = lvl;
        filledCount++;
      }
    });

    return filledCount;
  }

  // --- CSV LOGIC ---

  generateCSV() {
    // Encabezado descriptivo — las columnas de sesión varían por clase según NumSesiones
    const lines = ['ClaseId,NombreClase,NumSesiones,Periodo,Estudiante,[Conceptos x N],[Practica x N],[Comportamiento x N],[Autoevaluacion x N],[Asistencia x N],[Fechas x N],Puntos,[Observaciones x N],[ObservacionesClase x N]'];
    
    const pad = (arr, n) => Array.from({ length: n }, (_, i) => arr[i] || '');
    const padQuoted = (arr, n) => Array.from({ length: n }, (_, i) => arr[i] ? `"${String(arr[i]).replace(/"/g, '""')}"` : '');

    Object.values(this.appData.classes).forEach(cls => {
      const n = cls.numSesiones || 3;
      CONFIG.PERIODS.forEach(period => {
        const periodId = period.id;
        const gradesForPeriod = this.appData.grades[periodId][cls.id];
        if (!gradesForPeriod) return;

        const datesArr = (cls.fechas && cls.fechas[periodId]) ? cls.fechas[periodId] : [];
        const classObsArr = (cls.observaciones && cls.observaciones[periodId]) ? cls.observaciones[periodId] : [];

        cls.students.forEach((studentName, idx) => {
          const g = gradesForPeriod[idx];
          if (!g) return;
          
          const cleanName      = studentName.replace(/"/g, '""');
          const cleanClassName = cls.name.replace(/"/g, '""');
          let obsArr = g.observaciones;
          if (!Array.isArray(obsArr)) obsArr = [obsArr];

          const row = [
            cls.id,
            `"${cleanClassName}"`,
            n,
            periodId,
            `"${cleanName}"`,
            ...pad(g.conceptos        || [], n),
            ...pad(g.practica         || [], n),
            ...pad(g.comportamiento   || [], n),
            ...pad(g.autoevaluacion   || [], n),
            ...pad(g.asistencia       || [], n),
            ...padQuoted(datesArr     || [], n),
            g.puntos || 0,
            ...padQuoted(obsArr, n),
            ...padQuoted(classObsArr  || [], n)
          ];
          lines.push(row.join(','));
        });
      });
    });
    return lines.join('\n');
  }

  parseCSVRow(text) {
    let p = '', row = [''], d = 0, l;
    for (let i = 0; i < text.length; i++) {
      l = text[i];
      if (l === '"') {
        if (d === 0) d = 1;
        else if (text[i+1] === '"') { row[row.length-1] += '"'; i++; }
        else d = 0;
      } else if (l === ',' && d === 0) {
        row.push('');
      } else {
        row[row.length-1] += l;
      }
    }
    return row.map(c => c.trim());
  }

  parseCSV(csvStr) {
    const lines = csvStr.split('\n').filter(l => l.trim().length > 0);
    if (lines.length <= 1) return this.createEmptyData(); // Only header or empty
    
    const hasFechas = lines[0].includes('[Fechas x N]');
    const dataLines = lines.slice(1);
    const newAppData = this.createEmptyData();
    const PERIOD_IDS = new Set(['inicial', 'basico', 'alto', 'superior']);

    dataLines.forEach(line => {
      const cols = this.parseCSVRow(line);
      if (cols.length < 13) return; // invalid row

      // Detectar formato: si cols[2] es un ID de periodo → formato antiguo (sin NumSesiones)
      const isOldFormat = PERIOD_IDS.has(cols[2]);
      const offset = isOldFormat ? 0 : 1; // columnas desplazadas por NumSesiones

      const classId     = cols[0];
      const className   = cols[1];
      const numSesiones = isOldFormat ? 3 : (parseInt(cols[2]) || 3);
      const period      = cols[2 + offset];
      const studentName = cols[3 + offset];

      // Columnas de sesión: base=4+offset, luego 5 (o 6 si tiene fechas) bloques de numSesiones
      const base = 4 + offset;
      const slice = (start) => Array.from({ length: numSesiones }, (_, i) => cols[start + i] || null);

      const cArr  = slice(base);
      const pArr  = slice(base + numSesiones);
      const bArr  = slice(base + numSesiones * 2);
      const aeArr = slice(base + numSesiones * 3);
      const attArr= slice(base + numSesiones * 4);
      
      let fArr = [];
      let ptsIdx;
      if (hasFechas) {
        fArr = slice(base + numSesiones * 5);
        ptsIdx = base + numSesiones * 6;
      } else {
        ptsIdx = base + numSesiones * 5;
      }

      if (cols.length <= ptsIdx) return;

      const ptsRaw = cols[ptsIdx];
      let observaciones = Array.from({ length: numSesiones }, () => null);

      if (cols.length >= ptsIdx + 1 + numSesiones) {
        // Formato nuevo [Observaciones x N]
        observaciones = slice(ptsIdx + 1).map(v => v ? v.replace(/""/g, '"') : null);
      } else if (cols.length > ptsIdx + 1) {
        // Formato antiguo (1 columna de observaciones)
        const oldObs = (cols[ptsIdx + 1] || '').replace(/""/g, '"');
        observaciones[0] = oldObs || null;
      }

      let classObsArr = [];
      if (cols.length >= ptsIdx + 1 + numSesiones * 2) {
        // Formato nuevo con observaciones por sesión
        classObsArr = slice(ptsIdx + 1 + numSesiones).map(v => v ? v.replace(/""/g, '"') : '');
      } else if (cols.length > ptsIdx + 1 + numSesiones) {
        // Formato v1.6.0 intermedio (una sola columna de observaciones)
        const singleObs = (cols[ptsIdx + 1 + numSesiones] || '').replace(/""/g, '"');
        classObsArr = Array.from({ length: numSesiones }, (_, i) => i === 0 ? singleObs : '');
      }

      if (!newAppData.classes[classId]) {
        newAppData.classes[classId] = {
          id: classId,
          name: className,
          students: [],
          numSesiones,
          fechas: {
            inicial: [],
            basico: [],
            alto: [],
            superior: []
          },
          observaciones: {
            inicial: [],
            basico: [],
            alto: [],
            superior: []
          }
        };
        CONFIG.PERIODS.forEach(p => {
          newAppData.grades[p.id][classId] = [];
        });
      } else {
        if (!newAppData.classes[classId].numSesiones) {
          newAppData.classes[classId].numSesiones = numSesiones;
        }
        if (!newAppData.classes[classId].fechas) {
          newAppData.classes[classId].fechas = {
            inicial: [],
            basico: [],
            alto: [],
            superior: []
          };
        }
        if (!newAppData.classes[classId].observaciones) {
          newAppData.classes[classId].observaciones = {
            inicial: [],
            basico: [],
            alto: [],
            superior: []
          };
        }
      }
      
      const cls = newAppData.classes[classId];
      if (hasFechas && period) {
        cls.fechas[period] = fArr.map(v => v || '');
      }
      if (classObsArr.length > 0 && period) {
        cls.observaciones[period] = classObsArr;
      }

      let studentIdx = cls.students.indexOf(studentName);
      
      if (studentIdx === -1) {
        cls.students.push(studentName);
        studentIdx = cls.students.length - 1;
        CONFIG.PERIODS.forEach(p => {
          newAppData.grades[p.id][classId].push(this.emptyGrade());
        });
      }
      
      if (newAppData.grades[period] && newAppData.grades[period][classId]) {
        newAppData.grades[period][classId][studentIdx] = {
          conceptos:       cArr.map(v => v || null),
          practica:        pArr.map(v => v || null),
          comportamiento:  bArr.map(v => v || null),
          autoevaluacion:  aeArr.map(v => v || null),
          asistencia:      attArr.map(v => v || null),
          puntos: parseInt(ptsRaw, 10) || 0,
          observaciones
        };
      }
    });

    return newAppData;
  }

  async openFile() {
    let contents = '';
    let filePath = null;

    if (window.electronAPI) {
      const { filePath: fp, canceled } = await window.electronAPI.showOpenFilePicker({
        properties: ['openFile'],
        filters: [{ name: 'Base de Datos CSV', extensions: ['csv'] }]
      });
      if (canceled) return false;
      contents = await window.electronAPI.readFile(fp);
      filePath = fp;
    } else {
      if (!window.showOpenFilePicker) throw new Error("Tu navegador no soporta esta función.");
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'Base de Datos CSV', accept: {'text/csv': ['.csv']} }],
      });
      filePath = fileHandle;
      const file = await fileHandle.getFile();
      contents = await file.text();
    }
    
    try {
      this.appData = this.parseCSV(contents);
      this.currentClass = Object.keys(this.appData.classes)[0] || null;
      this.currentFileHandle = filePath;
      this.setLastFile(filePath);
      return true;
    } catch (e) {
      throw new Error("Formato de CSV inválido o corrupto.");
    }
  }

  async saveFile(isSaveAs = false) {
    const csvStr = this.generateCSV();
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const defaultName = `Mi_Calificador_${pad(d.getDate())}_${pad(d.getMonth()+1)}_${d.getFullYear()}.csv`;
    
    if (window.electronAPI) {
      // === MODO ELECTRON ===
      if (isSaveAs || !this.currentFileHandle) {
        const { filePath, canceled } = await window.electronAPI.showSaveFilePicker({
          defaultPath: defaultName,
          filters: [{ name: 'Base de Datos CSV', extensions: ['csv'] }]
        });
        if (canceled) return false;
        this.currentFileHandle = filePath;
      }
      await window.electronAPI.writeFile(this.currentFileHandle, csvStr);
      this.setLastFile(this.currentFileHandle);

    } else if (window.showSaveFilePicker) {
      // === MODO CHROME/EDGE (File System Access API) ===
      if (typeof this.currentFileHandle === 'string' && !isSaveAs) {
        // browser_session sin picker: guardar solo en localStorage
        localStorage.setItem('calificador_session_data', csvStr);
        localStorage.setItem('calificador_session_name', this.sessionName || defaultName);
        return true;
      }

      if (isSaveAs || !this.currentFileHandle) {
        try {
          this.currentFileHandle = await window.showSaveFilePicker({
            types: [{ description: 'Base de Datos CSV', accept: {'text/csv': ['.csv']} }],
            suggestedName: defaultName
          });
          this.sessionName = this.currentFileHandle.name;
        } catch (err) {
          // Si el usuario cancela el picker y hay sesión activa, guardar en localStorage
          if (typeof this.currentFileHandle === 'string') {
            localStorage.setItem('calificador_session_data', csvStr);
            localStorage.setItem('calificador_session_name', this.sessionName || defaultName);
            return true;
          }
          return false;
        }
      }
      
      const writable = await this.currentFileHandle.createWritable();
      await writable.write(csvStr);
      await writable.close();
      
      // Sincronizar con localStorage para el botón "Continuar"
      localStorage.setItem('calificador_session_data', csvStr);
      localStorage.setItem('calificador_session_name', this.sessionName || defaultName);

    } else {
      // === MODO BROWSER SIN showSaveFilePicker (Firefox, etc.) ===

      // Si ya tenemos un FileSystemFileHandle real (de un directoryPicker previo), escribir directo
      if (!isSaveAs && this.currentFileHandle && typeof this.currentFileHandle !== 'string' && this.currentFileHandle.createWritable) {
        try {
          const writable = await this.currentFileHandle.createWritable();
          await writable.write(csvStr);
          await writable.close();
          localStorage.setItem('calificador_session_data', csvStr);
          localStorage.setItem('calificador_session_name', this.sessionName || defaultName);
          return true;
        } catch(e) { /* permiso expiró, abrir diálogo */ }
      }

      // Solo localStorage si hay sesión activa y no es SaveAs
      if (!isSaveAs && typeof this.currentFileHandle === 'string') {
        localStorage.setItem('calificador_session_data', csvStr);
        localStorage.setItem('calificador_session_name', this.sessionName || defaultName);
        return true;
      }

      // Necesitamos elegir ubicación — mostrar modal
      if (!this.onRequestFilename) return false;
      const result = await this.onRequestFilename(defaultName);
      if (!result) return false;

      if (result.type === 'handle') {
        // showSaveFilePicker (si Firefox lo soporta en el futuro)
        this.currentFileHandle = result.handle;
        this.sessionName = result.handle.name;
        const writable = await this.currentFileHandle.createWritable();
        await writable.write(csvStr);
        await writable.close();
        localStorage.setItem('calificador_session_data', csvStr);
        localStorage.setItem('calificador_session_name', this.sessionName);
        return true;
      }

      if (result.type === 'dirHandle') {
        // showDirectoryPicker (Firefox 111+)
        const fileHandle = await result.dirHandle.getFileHandle(result.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(csvStr);
        await writable.close();
        this.currentFileHandle = fileHandle;
        this.sessionName = result.name;
        localStorage.setItem('calificador_session_data', csvStr);
        localStorage.setItem('calificador_session_name', result.name);
        return true;
      }

      // Descarga directa (fallback)
      const nombre = result.name || defaultName;
      this.sessionName = nombre.endsWith('.csv') ? nombre : nombre + '.csv';
      this.currentFileHandle = 'browser_session';
      this._browserDownload(csvStr, this.sessionName);
      localStorage.setItem('calificador_session_data', csvStr);
      localStorage.setItem('calificador_session_name', this.sessionName);
    }
    return true;
  }

  _browserDownload(csvStr, filename) {
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  setLastFile(filePath) {
    if (typeof filePath === 'string' && filePath !== 'browser_session') {
      localStorage.setItem('calificador_lastFile', filePath);
    }
  }

  async checkLastFile() {
    // Modo browser sin Electron: verificar sesión en localStorage
    if (!window.electronAPI) {
      const data = localStorage.getItem('calificador_session_data');
      const name = localStorage.getItem('calificador_session_name');
      return (data && data.length > 10) ? ('browser_session:' + (name || 'Sesión guardada')) : false;
    }
    const lastFile = localStorage.getItem('calificador_lastFile');
    if (!lastFile) return false;
    const exists = await window.electronAPI.checkExists(lastFile);
    if (!exists) {
      localStorage.removeItem('calificador_lastFile');
      return false;
    }
    return lastFile;
  }

  async loadLastFile() {
    // Modo browser sin Electron
    if (!window.electronAPI) {
      const data = localStorage.getItem('calificador_session_data');
      const name = localStorage.getItem('calificador_session_name');
      if (!data) return false;
      try {
        this.appData = this.parseCSV(data);
        this.currentClass = Object.keys(this.appData.classes)[0] || null;
        this.currentFileHandle = 'browser_session';
        this.sessionName = name || 'Mi_Calificador.csv';
        return this.sessionName;
      } catch(e) { return false; }
    }
    const lastFile = localStorage.getItem('calificador_lastFile');
    if (!lastFile) return false;
    const exists = await window.electronAPI.checkExists(lastFile);
    if (!exists) {
      localStorage.removeItem('calificador_lastFile');
      return false;
    }
    try {
      const contents = await window.electronAPI.readFile(lastFile);
      this.appData = this.parseCSV(contents);
      this.currentClass = Object.keys(this.appData.classes)[0] || null;
      this.currentFileHandle = lastFile;
      return lastFile;
    } catch (e) { return false; }
  }

  async autoSave() {
    if (Object.keys(this.appData.classes).length === 0) return;
    const csvStr = this.generateCSV();

    if (window.electronAPI && typeof this.currentFileHandle === 'string') {
      try { await window.electronAPI.writeFile(this.currentFileHandle, csvStr); } catch(e) {}
      await window.electronAPI.saveBackup(csvStr);
    } else if (this.currentFileHandle && typeof this.currentFileHandle !== 'string' && this.currentFileHandle.createWritable) {
      // Chrome/Edge FileSystemHandle
      try {
        const writable = await this.currentFileHandle.createWritable();
        await writable.write(csvStr);
        await writable.close();
      } catch(e) {}
      localStorage.setItem('calificador_session_data', csvStr);
      localStorage.setItem('calificador_session_name', this.sessionName || 'Mi_Calificador.csv');
    } else {
      // Modo browser (Firefox o Chrome sin archivo real vinculado)
      localStorage.setItem('calificador_session_data', csvStr);
      localStorage.setItem('calificador_session_name', this.sessionName || 'Mi_Calificador.csv');
    }
  }

  newFile() {
    this.appData = this.createEmptyData();
    this.currentFileHandle = null;
    this.currentClass = null;
  }

  renameClass(id, newName, numSesiones, newStudentsList = null) {
    const cls = this.appData.classes[id];
    if (cls) {
      cls.name = newName;
      if (numSesiones && numSesiones >= 1) {
        cls.numSesiones = numSesiones;
      }
      if (newStudentsList && Array.isArray(newStudentsList)) {
        this.updateClassStudentsMap(id, newStudentsList);
      }
      return true;
    }
    return false;
  }

  updateClassStudentsMap(classId, newStudents) {
    const cls = this.appData.classes[classId];
    if (!cls) return;

    // Preservar estado en base al nombre original
    const oldStudents = cls.students || [];
    const oldGradesMap = {};
    CONFIG.PERIODS.forEach(p => {
      oldGradesMap[p.id] = {};
      const cg = this.appData.grades[p.id][classId];
      if (cg) {
        oldStudents.forEach((stName, idx) => {
          oldGradesMap[p.id][stName] = cg[idx];
        });
      }
    });

    cls.students = newStudents;
    CONFIG.PERIODS.forEach(p => {
      this.appData.grades[p.id][classId] = newStudents.map(stName => {
        return oldGradesMap[p.id][stName] || this.emptyGrade();
      });
    });
  }

  getStats() {
    let countS = 0, countA = 0, countP = 0;
    const grades = this.getGrades();
    if (!grades) return { countS, countA, countP, total: 0 };

    grades.forEach(g => {
      const t = this.overallLevel(g);
      if (t === 'S') countS++;
      else if (t === 'A') countA++;
      else if (t === 'P') countP++;
    });
    
    return { countS, countA, countP, total: this.getStudents().length };
  }

  exportTextData() {
    if (!this.currentClass) return null;
    const clsData = this.getCurrentClassData();
    if (!clsData) return null;
    const className = clsData.name.toUpperCase();
    const periodName = CONFIG.PERIODS.find(p => p.id === this.currentPeriod).label.toUpperCase();
    
    const sep = '─'.repeat(85);
    const lines = [`REPORTE: ${className} — PERIODO ${periodName}\n${sep}`];
    lines.push(`${'ESTUDIANTE'.padEnd(34)} CONCEPTOS  PRÁCTICA   COMPORTAM  TOTAL        ASIST.  PTS`);
    lines.push(sep);

    const students = this.getStudents();
    const grades = this.getGrades();
    const dates = (clsData && clsData.fechas && clsData.fechas[this.currentPeriod]) || [];

    students.forEach((name, idx) => {
      const g = grades[idx];
      const fmtDim = d => {
        const s = g[d];
        const code = s.map((x, si) => {
          const dVal = dates[si] || '';
          if (dVal.startsWith('NC:')) return 'x';
          return x || '·';
        }).join('');
        const eff = this.effectiveForDim(s) || '·';
        return `${code}(${eff})`.padEnd(11);
      };
      const overall = this.overallLevel(g);
      const overallStr = (overall ? CONFIG.LEVEL_LABEL[overall] : '—').padEnd(13);

      // Asistencia: mostrar qué clases faltó (respeta numSesiones de la clase)
      const numSes = this.getCurrentClassData()?.numSesiones || 3;
      const att = (g.asistencia || []).slice(0, numSes);
      const faltas = att.map((a, i) => a === 'A' ? `F.C${i+1}` : null).filter(Boolean);
      const attStr = faltas.length === 0 ? '✓ todas' : faltas.join(' ');

      // Puntos
      const pts = g.puntos || 0;
      const ptsStr = pts > 0 ? `+${pts}` : `${pts}`;

      lines.push(`${name.substring(0, 33).padEnd(34)} ${fmtDim('conceptos')}${fmtDim('practica')}${fmtDim('comportamiento')}${overallStr}${attStr.padEnd(8)}  ${ptsStr}`);
      
      const obsArr = Array.isArray(g.observaciones) ? g.observaciones : [g.observaciones];
      const obsLines = [];

      obsArr.forEach((obsVal, si) => {
        if (obsVal && String(obsVal).trim()) {
          const dateStr = dates[si] ? ` (${this.formatDate(dates[si])})` : '';
          const cleanObs = String(obsVal).replace(/\s+/g, ' ').trim();
          obsLines.push(`      Clase ${si + 1}${dateStr}: ${cleanObs}`);
        }
      });

      if (obsLines.length > 0) {
        lines.push(`   · Observaciones:`);
        obsLines.forEach(l => lines.push(l));
      }
    });

    lines.push(sep);
    // Resumen de ausencias
    const totalAusencias = grades.reduce((sum, g) => sum + (g.asistencia||[]).filter(a => a === 'A').length, 0);
    if (totalAusencias > 0) {
      lines.push(`Ausencias registradas: ${totalAusencias}`);
    }

    return lines.join('\n');
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

  updateClassObservation(sessionIdx, text) {
    if (!this.currentClass) return;
    const cls = this.getCurrentClassData();
    if (!cls) return;
    
    if (!cls.observaciones) {
      cls.observaciones = {
        inicial: [],
        basico: [],
        alto: [],
        superior: []
      };
    }
    
    if (!cls.observaciones[this.currentPeriod]) {
      cls.observaciones[this.currentPeriod] = [];
    }
    
    while (cls.observaciones[this.currentPeriod].length <= sessionIdx) {
      cls.observaciones[this.currentPeriod].push('');
    }
    
    cls.observaciones[this.currentPeriod][sessionIdx] = text;
  }

  reorderClasses(draggedId, targetId) {
    const classIds = Object.keys(this.appData.classes);
    const draggedIdx = classIds.indexOf(draggedId);
    const targetIdx = classIds.indexOf(targetId);
    if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return;

    classIds.splice(draggedIdx, 1);
    classIds.splice(targetIdx, 0, draggedId);

    const newClasses = {};
    classIds.forEach(id => {
      newClasses[id] = this.appData.classes[id];
    });
    this.appData.classes = newClasses;
  }

  getGDriveCredentials() {
    const defaultClientId = (typeof GDRIVE_CREDS !== 'undefined' && GDRIVE_CREDS.GOOGLE_CLIENT_ID) || CONFIG.GOOGLE_CLIENT_ID || '';
    const defaultClientSecret = (typeof GDRIVE_CREDS !== 'undefined' && GDRIVE_CREDS.GOOGLE_CLIENT_SECRET) || CONFIG.GOOGLE_CLIENT_SECRET || '';
    
    const clientId = defaultClientId || localStorage.getItem('calificador_gdrive_client_id') || '';
    const clientSecret = defaultClientSecret || localStorage.getItem('calificador_gdrive_client_secret') || '';
    return { clientId, clientSecret };
  }

  saveGDriveCredentials(clientId, clientSecret) {
    if (clientId) localStorage.setItem('calificador_gdrive_client_id', clientId.trim());
    if (clientSecret) localStorage.setItem('calificador_gdrive_client_secret', clientSecret.trim());
  }

  async exchangeOAuthCode(code) {
    const creds = this.getGDriveCredentials();
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error('Las credenciales de Google Drive no están configuradas.');
    }
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: 'http://localhost:8585',
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al intercambiar el código: ${errorText}`);
    }

    const data = await response.json();
    localStorage.setItem('calificador_gdrive_access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('calificador_gdrive_refresh_token', data.refresh_token);
    }
    const expiry = Date.now() + (data.expires_in * 1000);
    localStorage.setItem('calificador_gdrive_token_expiry', expiry);
    return true;
  }

  async refreshGoogleToken() {
    const refreshToken = localStorage.getItem('calificador_gdrive_refresh_token');
    if (!refreshToken) {
      throw new Error('No hay token de actualización disponible. Por favor, vuelve a conectar Google Drive.');
    }
    const creds = this.getGDriveCredentials();
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error('Las credenciales de Google Drive no están configuradas.');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al renovar el token: ${errorText}`);
    }

    const data = await response.json();
    localStorage.setItem('calificador_gdrive_access_token', data.access_token);
    const expiry = Date.now() + (data.expires_in * 1000);
    localStorage.setItem('calificador_gdrive_token_expiry', expiry);
    return data.access_token;
  }

  async getValidGoogleToken() {
    const accessToken = localStorage.getItem('calificador_gdrive_access_token');
    const expiry = localStorage.getItem('calificador_gdrive_token_expiry');
    
    if (!accessToken || !expiry) {
      return null;
    }

    if (Date.now() + 300000 > parseInt(expiry, 10)) {
      try {
        return await this.refreshGoogleToken();
      } catch (err) {
        console.error('Error auto-refreshing token:', err);
        this.disconnectGoogleDrive();
        return null;
      }
    }
    return accessToken;
  }

  disconnectGoogleDrive() {
    localStorage.removeItem('calificador_gdrive_access_token');
    localStorage.removeItem('calificador_gdrive_refresh_token');
    localStorage.removeItem('calificador_gdrive_token_expiry');
  }

  isGoogleDriveConnected() {
    return !!localStorage.getItem('calificador_gdrive_refresh_token');
  }

  getGDriveFileName() {
    if (window.electronAPI && typeof this.currentFileHandle === 'string') {
      const parts = this.currentFileHandle.split(/[/\\]/);
      return parts[parts.length - 1];
    }
    return this.sessionName || 'Mi_Calificador.csv';
  }

  getGDriveFileId() {
    const key = this.currentFileHandle ? (typeof this.currentFileHandle === 'string' ? this.currentFileHandle : this.currentFileHandle.name) : 'default';
    try {
      const map = JSON.parse(localStorage.getItem('calificador_gdrive_file_ids') || '{}');
      return map[key] || null;
    } catch (e) {
      return null;
    }
  }

  setGDriveFileId(fileId) {
    const key = this.currentFileHandle ? (typeof this.currentFileHandle === 'string' ? this.currentFileHandle : this.currentFileHandle.name) : 'default';
    try {
      const map = JSON.parse(localStorage.getItem('calificador_gdrive_file_ids') || '{}');
      if (fileId) {
        map[key] = fileId;
      } else {
        delete map[key];
      }
      localStorage.setItem('calificador_gdrive_file_ids', JSON.stringify(map));
    } catch (e) {
      console.error(e);
    }
  }

  async uploadToGoogleDrive(csvStr) {
    const token = await this.getValidGoogleToken();
    if (!token) {
      throw new Error('Google Drive no está vinculado.');
    }

    const filename = this.getGDriveFileName();
    const fileId = this.getGDriveFileId();

    if (fileId) {
      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/csv; charset=UTF-8'
        },
        body: csvStr
      });

      if (response.status === 404) {
        this.setGDriveFileId(null);
        return await this.uploadToGoogleDrive(csvStr);
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error al actualizar en Google Drive: ${errText}`);
      }

      const fileInfo = await response.json();
      return fileInfo.id;
    } else {
      const boundary = 'gdrive_upload_boundary_calificador';
      const metadata = {
        name: filename,
        mimeType: 'text/csv'
      };

      const body = [
        `\r\n--${boundary}\r\n`,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        JSON.stringify(metadata),
        `\r\n--${boundary}\r\n`,
        'Content-Type: text/csv; charset=UTF-8\r\n\r\n',
        csvStr,
        `\r\n--${boundary}--\r\n`
      ].join('');

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: body
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error al crear archivo en Google Drive: ${errText}`);
      }

      const fileInfo = await response.json();
      this.setGDriveFileId(fileInfo.id);
      return fileInfo.id;
    }
  }
}
