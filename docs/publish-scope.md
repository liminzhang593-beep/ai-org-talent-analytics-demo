# Publication Scope

This document explains what should be included in the public GitHub copy and what should stay out.

## Include

### Core Application Code

- `frontend/src/`
- `frontend/public/`
- `frontend/package.json`
- `ai_org_talent/ai_org_talent_gen/*.py`
- `requirements.txt`

Why: these files show the working product implementation: frontend interaction, backend APIs, data parsing, analysis flow, LLM configuration pattern, and HR analytics logic.

Value: they demonstrate end-to-end product execution rather than a static concept.

### Method and Configuration Assets

- `industry_templates.json`
- `prompt_templates.json`
- `llm_configs.example.json`

Why: these show the domain model behind the demo, including industry templates, capability-model thinking, and prompt configuration.

Value: they make the project visibly different from a generic dashboard or model wrapper.

### Documentation and Example Data

- `README.md`
- `docs/`
- `examples/sample_org_talent_data.csv`

Why: public viewers need a clean explanation and safe sample data to understand and run the demo.

Value: this improves credibility, repeatability, and portfolio value.

## Exclude

### Security-Sensitive Runtime Files

- `llm_configs.json`
- `payloads/`
- `uploads/`
- `*.log`
- `*.out`
- `*debug*.txt`

Why: these may contain API keys, authorization headers, model prompts, model responses, uploaded spreadsheets, or business data.

Risk: credential leakage, data leakage, and accidental exposure of private work context.

### Local and Generated Files

- `.git/`
- `.cursor/`
- `.vscode/`
- `node_modules/`
- `__pycache__/`
- `.DS_Store`
- duplicate or historical scratch directories

Why: these do not explain the project and make the repository harder to review.

Value of exclusion: the public copy stays smaller, clearer, and more professional.

### Empty or Placeholder Files

Do not include files that are only placeholders or abandoned early ideas.

Examples removed from this public copy:

- empty architecture placeholder files
- unrelated AI news GUI experiment
- old local start script with machine-specific behavior
- duplicate nested frontend folder

Why: empty and unrelated files weaken the signal of the repository.

Value of exclusion: the repository tells one coherent story: HR AI organization and talent analytics.
