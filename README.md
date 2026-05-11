# 🎓 Calificador Interactivo LNG

Una aplicación de escritorio rápida, 100% offline y amigable diseñada para facilitar la labor docente al momento de calificar y administrar las notas de múltiples clases. Construida con tecnologías web (HTML, CSS, JS) y empaquetada con **Electron** para ofrecer instaladores nativos en Windows y macOS.

## ✨ Características Principales

- **Multi-Plataforma:** Instaladores nativos para Windows (`.exe`) y Mac (`.dmg`).
- **100% Offline y Seguro:** Toda la información se guarda localmente en archivos planos `.csv` en la computadora del profesor. No requiere conexión a internet y los datos nunca se suben a la nube.
- **Autoguardado y Backups:** Sistema inteligente de autoguardado cada 60 segundos y un sistema de copias de seguridad ocultas que mantiene las 5 versiones más recientes para evitar pérdida de datos.
- **Metodología Avanzada:**
  - **4 Periodos de Tiempo:** Inicial, Básico, Alto, Superior.
  - **3 Componentes Pedagógicos:** Cognitivo (Conceptos), Praxiológico (Práctica) y Axiológico (Comportamiento).
  - Historial independiente de 3 sesiones de clase por componente.
- **Tour Guiado:** Sistema de Onboarding paso a paso integrado para facilitar el aprendizaje a usuarios no técnicos.

## 📦 Descarga e Instalación

Para instalar el Calificador Interactivo, dirígete a la pestaña de [**Releases**](../../releases/latest) de este repositorio.

### 🛡️ Nota importante para usuarios de Windows (Microsoft Edge / SmartScreen)
Al ser un software nuevo e independiente, es posible que **Microsoft Edge** o **Windows Defender SmartScreen** muestren una advertencia indicando que "el archivo no se descarga habitualmente" o que "Windows protegió su PC". **Esto es un falso positivo normal** que ocurre con aplicaciones que aún no han pagado un certificado digital comercial.
* **En Edge:** Haz clic en los tres puntos (...) junto a la descarga > *Mantener* > *Mostrar más* > *Mantener de todos modos*.
* **En Windows:** Haz clic en *Más información* y luego en *Ejecutar de todas formas*.

1. **Si usas Windows:** Descarga el archivo que termina en `Setup.exe` y ejecútalo (siguiendo las instrucciones de arriba si te sale la advertencia).
2. **Si usas Mac:** Descarga el archivo que termina en `.dmg`, ábrelo y arrastra el ícono a tu carpeta de Aplicaciones.

---

## 🛠️ Para Desarrolladores

Si deseas clonar el código fuente, probarlo localmente o contribuir al proyecto:

### Requisitos Previos
- Node.js (v16 o superior)
- Git

### Instalación Local

1. Clona el repositorio:
   \`\`\`bash
   git clone https://github.com/Itemt/CalificadorinteractivoLNG.git
   cd CalificadorinteractivoLNG
   \`\`\`

2. Instala las dependencias:
   \`\`\`bash
   npm install
   \`\`\`

3. Ejecuta la aplicación en modo desarrollo:
   \`\`\`bash
   npm start
   \`\`\`

### Compilación y Empaquetado

Este proyecto utiliza \`electron-builder\` y está integrado con **GitHub Actions** para compilarse y publicarse automáticamente al crear un "Tag" en Git. 

Si deseas compilar la aplicación localmente (requiere configuración según tu Sistema Operativo):
\`\`\`bash
npm run dist
\`\`\`

## 🚀 Tecnologías
- Vanilla JavaScript (ES6+)
- HTML5 & CSS3 (Variables, Flexbox, CSS Grid)
- [Electron.js](https://www.electronjs.org/) (Framework de Aplicaciones de Escritorio)

## 📄 Licencia
Distribuido bajo la Licencia ISC.
