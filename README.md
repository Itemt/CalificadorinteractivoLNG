# 🎓 Calificador Interactivo LNG

Una aplicación de escritorio rápida, **100% offline** y amigable, diseñada para facilitar la labor docente al momento de calificar y administrar las notas de múltiples materias y clases. Construida con tecnologías web (HTML, CSS, JS) y empaquetada con **Electron** para ofrecer instaladores nativos en Windows y macOS.

---

## ✨ Características Principales

- **Multi-Plataforma:** Instaladores nativos para Windows (`.exe`) y Mac (`.dmg`).
- **100% Offline y Seguro:** Toda la información se guarda localmente en archivos `.csv` en la computadora del profesor. Los datos nunca se suben a la nube.
- **Autoguardado Inteligente:** Sistema de autoguardado cada 60 segundos con copias de seguridad rotativas que mantiene las 5 versiones más recientes.
- **Metodología Pedagógica Completa:**
  - 📅 **4 Periodos de Tiempo:** Inicial, Básico, Nivel Alto, Superior.
  - 🧠 **4 Componentes de Evaluación por periodo:**
    - 📚 **C. Cognitivo** (Conceptos)
    - 🛠️ **C. Praxiológico** (Práctica)
    - 🤝 **C. Axiológico** (Comportamiento)
    - 🙋 **Autoevaluación**
  - Historial independiente de **3 sesiones de clase** por componente.
- **Consolidado del Trimestre:** Cada estudiante tiene una valoración automática del trimestre completo visible en todo momento:
  - ⭐ **Superior:** Todos los componentes en Superior.
  - 🔥 **Alto:** Al menos un componente en Alto.
  - 🌱 **En Proceso:** 2 o más componentes en En Proceso.
- **Múltiples Materias:** Gestiona diferentes grupos o materias desde una sola pantalla con pestañas.
- **Calificación Rápida:** Botones de relleno automático (P/A/S) para asignar un nivel a toda la clase de un solo clic.
- **Tour Guiado:** Onboarding paso a paso integrado que inicia desde la pantalla de bienvenida hasta la interfaz de calificación.
- **Modo Oscuro / Claro:** Disponible desde la pantalla de inicio.

---

## 📦 Descarga e Instalación

Para instalar el Calificador Interactivo, dirígete a la pestaña de [**Releases**](../../releases/latest) de este repositorio.

### 🛡️ Nota importante para usuarios de Windows (Microsoft Edge / SmartScreen)

Al ser un software nuevo e independiente, es posible que **Microsoft Edge** o **Windows Defender SmartScreen** muestren una advertencia. **Esto es un falso positivo normal** para apps que aún no cuentan con un certificado digital comercial.

* **En Edge:** Haz clic en los tres puntos `...` junto a la descarga > *Mantener* > *Mostrar más* > *Mantener de todos modos*.
* **En Windows (al instalar):** Haz clic en *Más información* y luego en *Ejecutar de todas formas*.

### Pasos de instalación

1. **Windows:** Descarga el archivo `Calificador Interactivo Setup X.X.X.exe` y ejecútalo. El instalador te guiará paso a paso y creará un acceso directo en el Escritorio y el Menú de Inicio.
2. **Mac:** Descarga el archivo `.dmg`, ábrelo y arrastra el ícono a tu carpeta de Aplicaciones.

---

## 🚀 Cómo Usar (Guía Rápida)

1. **Abre la app** → Se mostrará la pantalla de bienvenida con un tour guiado automático.
2. **Crear Archivo Nuevo** → Elige dónde guardar tu base de datos `.csv`.
3. **Agregar Materia** → Ingresa el nombre de la materia/clase y pega la lista de estudiantes (un nombre por línea).
4. **Califica** → Haz clic en los botones `P`, `A` o `S` de cada sesión. El sistema calcula automáticamente la valoración por periodo y el consolidado del trimestre.
5. **Guardar** → Usa *Guardar BD* para guardar. El autoguardado también lo hace cada 60 segundos.
6. **Exportar** → Usa *Copiar a portapapeles* para pegar el reporte de notas en un chat o correo.

---

## 🛠️ Para Desarrolladores

### Requisitos Previos
- Node.js (v16 o superior)
- Git

### Instalación Local

```bash
git clone https://github.com/Itemt/CalificadorinteractivoLNG.git
cd CalificadorinteractivoLNG
npm install
npm start
```

### Compilación de Instaladores

```bash
# Mac (genera .dmg)
npm run dist -- --mac --publish never

# Windows (genera Setup.exe para x64 e ia32)
npm run dist -- --win --publish never
```

Los instaladores quedan en la carpeta `/dist`.

Para publicar una nueva versión en GitHub Releases automáticamente, crea un tag:

```bash
git tag v1.X.X
git push origin v1.X.X
```

GitHub Actions compilará y publicará los instaladores automáticamente.

---

## 🚀 Tecnologías

- Vanilla JavaScript (ES6+)
- HTML5 & CSS3 (Variables, Flexbox, Grid)
- [Electron.js](https://www.electronjs.org/) — Framework de escritorio multiplataforma
- [electron-builder](https://www.electron.build/) — Empaquetado y distribución

## 📄 Licencia

Distribuido bajo la Licencia ISC.
