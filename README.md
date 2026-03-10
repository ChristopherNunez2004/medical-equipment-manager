# 🏥 Sistema de Mantenimiento Predictivo
### Hospital Civil Nuevo de Guadalajara "Dr. Juan I. Menchaca"

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white"/>
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/IA-Groq_LLaMA_3.3-00A67E?style=for-the-badge"/>
</p>

<p align="center">
  Proyecto escolar de <strong>Ingeniería Biomédica</strong> — aplicación web modular para la gestión, seguimiento y mantenimiento predictivo de equipos médicos hospitalarios.
</p>

---

## 📋 Tabla de contenidos

- [Descripción](#-descripción)
- [Módulos](#-módulos)
- [Tecnologías](#-tecnologías)
- [Instalación y uso](#-instalación-y-uso)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Capturas de pantalla](#-capturas-de-pantalla)
- [Normativa](#-normativa-aplicada)
- [Autores](#-autores)

---

## 📌 Descripción

Este sistema web permite a los departamentos de **Ingeniería Clínica** gestionar de manera integral el parque tecnológico del hospital. Cubre desde el inventario de equipos hasta el análisis predictivo con inteligencia artificial, pasando por el cumplimiento normativo ante COFEPRIS.

El sistema opera completamente en el navegador usando `localStorage` para persistencia de datos, con un servidor Python ligero que actúa como proxy para las funciones de IA.

---

## 🧩 Módulos

### 🔧 Ingeniería Clínica
El núcleo del sistema. Gestión completa del ciclo de vida del equipo médico:

| Sección | Descripción |
|---|---|
| **Dashboard** | Resumen ejecutivo: equipos totales, mantenimientos, órdenes abiertas y equipos fuera de servicio |
| **Inventario** | Alta, edición y baja de equipos con campos de tipo, marca, modelo, N° de serie, área, estado y proveedor |
| **Calendario** | Vista mensual y semanal de mantenimientos programados. Navegación por mes, alertas automáticas y lista de próximos eventos |
| **Órdenes de trabajo** | Creación y seguimiento de órdenes (Preventivo / Correctivo / Predictivo) con asignación de técnico y control de estado |
| **Ajustes** | Gestión de usuarios del sistema |

---

### 🤖 Bio-Inteligencia Artificial (`ia.html`)

Módulo de análisis inteligente basado en los datos reales del inventario:

- **Score de Riesgo (0–100)** — calculado localmente sin IA, basado en:
  - Estado del equipo (Fuera de servicio, En operación, etc.)
  - Días transcurridos desde el último mantenimiento
  - Eventos de mantenimiento vencidos
  - Frecuencia de mantenimiento registrada
  - Si el equipo es crítico o tiene proveedor activo

  | Rango | Nivel |
  |---|---|
  | 0 – 24 | 🟢 Bajo |
  | 25 – 49 | 🟡 Medio |
  | 50 – 74 | 🟠 Alto |
  | 75 – 100 | 🔴 Crítico |

- **Chatbot IA** — conectado a **Groq (LLaMA 3.3 70B)**, recibe el contexto completo del inventario y responde preguntas en lenguaje natural sobre el estado del parque tecnológico. Incluye 5 preguntas rápidas predefinidas.

---

### 📋 Políticas Públicas (`politicas.html`)

Módulo de cumplimiento normativo con 5 secciones:

1. **Cumplimiento** — tabla de % cumplimiento NOM-241, estado COFEPRIS y proveedor por equipo
2. **Alertas** — tarjetas ordenadas por urgencia (días vencidos o restantes)
3. **Impacto** — KPIs: disponibilidad del parque, tasa de resolución de órdenes, distribución por área
4. **Reporte PDF** — generación de reporte oficial con header del hospital, tablas e indicadores
5. **Normativa** — referencia rápida a NOM-241, NOM-197, ISO 13485, COFEPRIS y Ley General de Salud Art. 391

---

## 🛠 Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Persistencia | `localStorage` (navegador) |
| Servidor | Python 3 (`http.server`) |
| IA / Chatbot | [Groq API](https://console.groq.com) — LLaMA 3.3 70B Versatile (gratuito) |
| PDF | jsPDF (generación en cliente) |

---

## 🚀 Instalación y uso

### Requisitos
- Python 3.x instalado
- Cuenta gratuita en [console.groq.com](https://console.groq.com) para obtener una API Key

### Pasos

**1. Clona o descarga el repositorio**
```bash
git clone https://github.com/tu-usuario/mantenimiento-predictivo-hcg.git
cd mantenimiento-predictivo-hcg
```

**2. Configura tu API Key de Groq**

Abre `server.py` y reemplaza la línea:
```python
API_KEY = "PEGA_AQUI_TU_API_KEY_DE_GROQ"  # empieza con gsk_...
```

**3. Inicia el servidor**
```bash
python server.py
```

**4. Abre en tu navegador**
```
http://localhost:3000/index.html
```

> ⚠️ **Importante:** abre siempre desde `http://localhost:3000` y no directamente el archivo `.html`, para que los estilos y el proxy de IA funcionen correctamente.

---

### Credenciales de prueba

Al iniciar por primera vez puedes registrarte desde la pantalla de login. Los datos se guardan localmente en el navegador.

---

## 📁 Estructura del proyecto

```
📦 mantenimiento-predictivo-hcg/
├── index.html          # App principal (Dashboard, Inventario, Calendario, Órdenes, Ajustes)
├── script.js           # Lógica principal de la aplicación
├── styles.css          # Estilos globales
├── ia.html             # Módulo Bio-IA (scores de riesgo + chatbot)
├── politicas.html      # Módulo Políticas Públicas (normativa + reportes)
├── register.html       # Pantalla de registro de usuarios
├── register.js         # Lógica de registro
├── server.py           # Servidor Python (proxy para API de Groq)
├── check_models.py     # Script auxiliar para listar modelos Groq disponibles
└── logo.png            # Logotipo del hospital
```

---

## 📸 Capturas de pantalla

> Puedes agregar aquí capturas del sistema usando la sintaxis:
> `![descripcion](ruta/imagen.png)`

---

## 📜 Normativa aplicada

| Norma | Descripción |
|---|---|
| **NOM-241-SSA1-2012** | Buenas prácticas de fabricación para establecimientos dedicados a la fabricación de dispositivos médicos |
| **NOM-197-SSA1-2000** | Requisitos mínimos de infraestructura y equipamiento de hospitales |
| **COFEPRIS** | Comisión Federal para la Protección contra Riesgos Sanitarios |
| **ISO 13485:2016** | Sistemas de gestión de la calidad para dispositivos médicos |
| **Ley General de Salud — Art. 391** | Obligaciones en materia de equipamiento médico |

---

## 👥 Autores

Proyecto desarrollado para la materia de **Ingeniería Biomédica** —
Departamento de Ingeniería Clínica, Hospital Civil Nuevo de Guadalajara.

---

## 📄 Licencia

Este proyecto es de uso académico. Todos los derechos reservados a sus autores.
