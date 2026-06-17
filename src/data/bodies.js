// Portfolio content for every scannable body. Structure mirrors build_context.md:
// planets are sections, moons are entries within a section. Moon `name` keys
// must match the moon names in planetConfigs.js (LANG, EXP_1, PROJ_1, ...).
//
// NOTE: ACADEMY was trimmed to a single education entry (EDU_1). The EDU_2 moon
// still defined in planetConfigs.js should be removed so it has no empty body.
export const BODIES = {
  HELIOS: {
    name: "Sarthak Sukhral",
    tagline: "AI/ML Engineer & Researcher",
  },

  GENESIS: {
    heading: "About",
    bio: "I’m a student developer and researcher creating projects that actually contribute positively to the broader techspace. This is my portfolio website, inspired by Mass Effect’s galaxy map and No Man’s Sky. Fly around, explore, and learn more about me.",
    location: "Gurgaon, India",
    status: "Final-year B.Tech @ PEC Chandigarh",
    scanRadius: 35,
  },

  SYNTHEX: {
    heading: "Skills",
    scanRadius: 35,
    moons: [
      {
        name: "LANG",
        label: "Languages",
        items: ["Python", "C++", "Go", "JavaScript"],
      },
      {
        name: "AIML",
        label: "AI / ML",
        items: [
          "PyTorch & TensorFlow",
          "Computer Vision / CNNs",
          "Scikit-learn",
          "LLM Fine-Tuning",
          "RAG",
          "Agentic AI",
        ],
      },
      {
        name: "WEB",
        label: "Web & Backend",
        items: ["FastAPI", "PostgreSQL", "Redis & Celery", "React"],
      },
      {
        name: "TOOLS",
        label: "Tools & Infra",
        items: ["Docker", "GitHub Actions CI/CD", "ChromaDB", "ROCm / ONNX"],
      },
    ],
  },

  EXPEDITION: {
    heading: "Experience",
    scanRadius: 35,
    moons: [
      {
        name: "EXP_1",
        label: "National Physical Laboratory (NPL)",
        role: "Research Intern",
        duration: "Jan 2026 – May 2026",
        description:
          "Built a real-time digital twin for a 0.5 HP induction motor, fusing VFD electrical signals (Modbus RS-485), 1 kHz vibration (MPU-6050), and thermal data into a live React dashboard with bidirectional motor control over HTTPS. Trained a stacked CNN/LSTM/Transformer ensemble on the CWRU bearing dataset for four-class fault detection (97.1% accuracy, 0.971 F1), exported to ONNX for real-time edge inference on a Raspberry Pi 4.",
      },
    ],
  },

  CODEX: {
    heading: "Projects",
    scanRadius: 40,
    moons: [
      {
        name: "PROJ_1",
        label: "CodeLens",
        tech: "FastAPI · PostgreSQL · Redis · Celery · ChromaDB · Docker",
        description:
          "AI-powered real-time code review agent: a webhook-driven pipeline doing GitHub diff ingestion, tree-sitter AST parsing, ChromaDB RAG retrieval, LLM review generation, and live SSE streaming to the browser. Redis-backed Celery workers decouple webhook response from LLM latency; SHA-256 content-addressable caching cuts redundant LLM calls by 40%.",
        link: "https://github.com/sarthwa8",
      },
      {
        name: "PROJ_2",
        label: "NeuroAccess",
        tech: "PyTorch · FastAPI · ROCm",
        description:
          "Brain-tumor clinical decision support. Contributed an SSC-based 3D convolution decomposition (trainable parameters down to 1.7M) and a radiomics class-overlap mitigation strategy for 3-class survival classification on BraTS 2020 — state-of-the-art accuracy vs. published baselines. Deployed as a browser-based tool with sub-2s end-to-end inference on AMD Instinct GPU via ROCm.",
        link: "https://github.com/sarthwa8/NeuroAccess",
      },
      {
        name: "PROJ_3",
        label: "GraminGPT",
        tech: "FastAPI · Docker · Whisper · OpenStreetMap",
        description:
          "Vernacular healthcare AI backend. A high-concurrency FastAPI service running an OpenAI Whisper voice pipeline for vernacular speech (sub-300ms latency), wired to the OpenStreetMap API for location-aware hospital routing. Fully containerised via Docker for reproducible deployment.",
        link: "https://github.com/sarthwa8/GraminGPT-backend",
      },
      {
        name: "PROJ_4",
        label: "VLM Hallucination Analysis",
        tech: "Qwen2.5-VL-7B · QLoRA · Hugging Face",
        description:
          "A failure-mode study of QLoRA fine-tuning (LoRA rank 16, 4-bit) on Qwen2.5-VL-7B over 400 structured radiology reports across 4 evaluation tasks. Found fine-tuning increased hallucinations by 133% on classification (p=0.003) and 42.9% on clinical reasoning (p=0.04); traced the root cause to synthetic-data contamination and built an 8-type / 26-subtype clinical hallucination taxonomy with a 4-point severity scale.",
        link: "https://github.com/sarthwa8",
      },
      {
        name: "PROJ_5",
        label: "HeteroGNN — Glioblastoma Survival",
        tech: "PyTorch Geometric · GATv2",
        description:
          "A heterogeneous GNN with GATv2 cross-modal attention addressing the modality-dilution problem in multimodal survival analysis. Each patient is modelled as a graph with 3 node types (clinical, shape, intensity) extracted from BraTS 2020 (N=235). 5-fold cross-validation reached C-Index 0.62, beating Cox Proportional Hazards (0.58) and early-fusion MLP baselines.",
        link: "https://github.com/sarthwa8",
      },
    ],
  },

  ACADEMY: {
    heading: "Education",
    scanRadius: 35,
    moons: [
      {
        name: "EDU_1",
        label: "Punjab Engineering College",
        degree: "B.Tech",
        field: "Electronics & Communication Engineering",
        period: "2023 – 2027",
        detail: "Chandigarh, India.",
      },
    ],
  },

  NOVARA: {
    heading: "Contact",
    scanRadius: 35,
    email: "sarthakvs10@gmail.com",
    linkedin: "https://www.linkedin.com/in/sarthak-sukhral-a82131263",
    github: "https://github.com/sarthwa8",
    twitter: "",
    resume: "",
  },

  ASTEROIDS: [
    {
      label: "97.1% Fault Detection",
      detail:
        "Trained a stacked CNN/LSTM/Transformer ensemble on the CWRU bearing dataset achieving 97.1% accuracy (0.971 F1) on four-class fault detection, deployed for real-time edge inference on a Raspberry Pi 4 at NPL.",
    },
    {
      label: "SOTA on BraTS 2020",
      detail:
        "Achieved state-of-the-art 3-class survival-classification accuracy against published baselines on BraTS 2020 with NeuroAccess, using an SSC-based 3D convolution decomposition (1.7M parameters).",
    },
    {
      label: "GoFr Summer of Code",
      detail:
        "Selected as a contributor to GoFr Summer of Code, shipping production Go features and bug fixes to the open-source GoFr framework (Jun–Aug 2025).",
    },
    {
      label: "VLM Hallucination Taxonomy",
      detail:
        "Original research building an 8-type, 26-subtype clinical hallucination taxonomy for fine-tuned vision-language models, quantifying a 133% rise in classification hallucinations induced by QLoRA fine-tuning.",
    },
  ],

  COMET: {
    heading: "Currently Exploring in my research:",
    items: [
      "Vision-Language Models & hallucination evaluation",
      "Agentic Systems and Monitoring",
      "Edge AI & ONNX deployment",
      "Label-grounded fine-tuning",
    ],
  },
};
