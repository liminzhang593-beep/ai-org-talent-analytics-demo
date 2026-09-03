# Case Study: AI Org & Talent Analytics Demo

## Context

Organization and talent reviews often depend on scattered spreadsheets, disconnected reports, subjective notes, and one-off analysis. HR and business leaders need to understand where capability gaps, workload risks, succession risks, and organization structure issues may appear, but the review process is usually slow and difficult to repeat.

This demo explores how an AI-assisted product can bring fragmented HR, organization, and talent data into one analysis workspace, then turn that data into reports, charts, conversational analysis, and practical management recommendations.

The core idea is not to generate generic management advice. The product is designed to work with an enterprise's own capability standards, talent development models, organization management logic, and training criteria, so the output can better match the company's actual management context.

## Product Goal

The goal is to make organization and talent analysis easier to run, explain, and reuse:

- Bring together structured team, role, capability, performance, learning, and organization-related data.
- Support both report-style data import and future system integration patterns.
- Ask natural-language questions about the dataset.
- Generate analysis summaries, individual development suggestions, and organization-level improvement recommendations.
- Visualize organization and talent patterns through charts.
- Connect analysis outputs with enterprise-specific talent standards and management models.
- Keep model providers configurable instead of hard-coding a single LLM service.

## User Workflow

1. A user opens the web interface and chooses a function: smart QA, one-click analysis, or chart display.
2. The user uploads a report-style dataset or selects data prepared from a system integration flow.
3. The backend parses the data and prepares it for analysis.
4. The product applies enterprise-specific capability standards, talent development rules, and organization management models.
5. The user asks a business question, such as how to assess capability gaps, identify development priorities, or evaluate organization risks.
6. The system combines structured data, prompt templates, management models, and the selected model configuration to generate a response.
7. The user can review AI-generated insights or switch to chart views for ChatBI-style visual exploration.

## What The Demo Shows

### HR Domain Modeling

The project is not only a generic chatbot wrapper. It includes HR-specific concepts such as organization structure, capability assessment, talent matching, development suggestions, and industry templates. More importantly, it is designed to absorb enterprise-specific management models, so analysis can align with how a company actually defines capability, performance, growth paths, and organization effectiveness.

### AI Product Thinking

The demo separates product workflow, prompt templates, model configuration, and user interaction. This makes it easier to test different use cases, connect different model providers, and adapt the analysis logic to different enterprise management standards without redesigning the whole product each time.

### Data-To-Insight Flow

The core workflow connects data ingestion, backend parsing, enterprise model matching, AI analysis, and frontend presentation. This demonstrates an end-to-end pattern for turning fragmented operational HR data into explainable, company-specific management insight.

### Management Decision Support

The product direction is to support organization and talent management decisions, not just display data. Example outputs may include individual growth suggestions, team capability gaps, organization structure diagnosis, succession and pipeline risks, and development actions that match the company's own standards.

### ChatBI Interaction

The frontend supports interactive analysis patterns such as one-click analysis, smart QA, and chart exploration. This shows how HR users can move between dashboard-style reporting and conversational questioning without needing to manually rebuild analysis each time.

### Full-Stack Implementation

The prototype uses a FastAPI backend and a React frontend. It includes API routes, data utilities, prompt configuration, LLM configuration examples, and UI pages for analysis, QA, charts, and configuration.

## Architecture Summary

```text
User Interface
  -> React pages for data import, smart QA, one-click analysis, chart views, and configuration
  -> API calls to the backend

Backend Service
  -> FastAPI routes
  -> data ingestion, parsing, and analysis utilities
  -> enterprise capability and development model matching
  -> prompt templates and capability model logic
  -> configurable LLM provider layer

Public Demo Assets
  -> sanitized sample data
  -> masked screenshots
  -> example LLM configuration without real credentials
```

## Public-Safe Version

This repository is a sanitized public copy. It intentionally excludes:

- Real uploaded organization or employee spreadsheets.
- API keys and real LLM configuration files.
- Model-call logs, payload captures, and debug output.
- Local editor files, build caches, and machine-specific runtime files.

Screenshots use masked views where file names, model selections, and person-level analysis details could expose private context.

## Professional Impact

This project is one example of the professional direction described in my portfolio: using AI to connect fragmented HR and organization data with enterprise-specific management models.

In this case, the product demonstrates:

- A product workflow for bringing scattered HR and talent data into one analysis space.
- A way to connect analysis with capability standards, talent development models, and organization management rules.
- AI interaction patterns such as data interpretation, one-click analysis, smart Q&A, ChatBI-style exploration, and management recommendation generation.
- A public-safe prototype that shows how this idea can become a usable and extensible product experience.

The case is therefore less about a standalone technical feature and more about how AI can be productized for real HR digitalization and organization management scenarios.

## 专业影响力说明

这个项目是我专业主页里那条主线的一个具体案例：用 AI 把分散的 HR 与组织人才数据，和企业自身的管理模型连接起来。

在这个案例里，重点展示的是：

- 如何把分散的人力、组织和人才数据汇聚到一个分析空间。
- 如何让分析不止停留在报表层面，而是结合企业自己的能力标准、人才培养模型和组织管理规则。
- 如何用 AI 支持数据解读、报表分析、一键分析、智能问答、ChatBI 互动和管理建议生成。
- 如何把这些想法做成一个可演示、可扩展、并且经过脱敏处理的产品原型。

所以，这里的项目说明主要讲“这个产品如何体现专业方向”；完整的个人能力定位，则放在 portfolio 主页中统一呈现。
