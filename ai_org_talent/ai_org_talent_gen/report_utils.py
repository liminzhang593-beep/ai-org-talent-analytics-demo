import os
from datetime import datetime
import markdown2
from fpdf import FPDF

def generate_markdown_report(result: dict, chart_paths: list, save_path: str):
    """生成Markdown报告"""
    ai = result['ai_insights']
    lines = [
        "# 🚀 AI人才分析报告",
        f"**分析时间：** {result['analysis_date']}",
        f"**团队人数：** <span style='color:#1890ff'>{result['staff_count']}</span>",
        "---",
        "## 🌟 团队总览",
        f"- 平均分：**{ai['team_overview']['average_score']}**",
        f"- 最高分：**{ai['team_overview']['highest_score']}**",
        f"- 最低分：**{ai['team_overview']['lowest_score']}**",
        f"- 分数区间：**{ai['team_overview']['score_range']}**",
        "",
        "## 📊 维度分析",
        f"- 优势维度：**{ai['dimension_analysis']['strength']['dimension']}**（{ai['dimension_analysis']['strength']['score']}）",
        f"- 薄弱维度：**{ai['dimension_analysis']['weakness']['dimension']}**（{ai['dimension_analysis']['weakness']['score']}）",
        "",
        "### 各维度均分",
        "| 维度 | 均分 |",
        "|------|------|",
    ]
    for k, v in ai['dimension_analysis']['averages'].items():
        lines.append(f"| {k} | {v} |")
    lines.append("\n## 💡 团队建议")
    for rec in ai['recommendations']:
        lines.append(f"- {rec}")
    lines.append("\n## 👥 分层明细")
    lines.append("| 姓名 | 岗位 | 分层 | 总分 | 建议 |")
    lines.append("|------|------|------|------|------|")
    for staff in result['results']:
        lines.append(f"| {staff['姓名']} | {staff['岗位']} | {staff['分层']} | {staff['总分']} | {staff['建议']} |")
    for chart in chart_paths:
        lines.append(f"\n![]({os.path.basename(chart)})")
    with open(save_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

def generate_pdf_report(result: dict, chart_paths: list, save_path: str):
    """生成PDF报告"""
    ai = result['ai_insights']
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font('Arial', 'B', 16)
    pdf.cell(0, 10, 'ai_org_talent_gen Report', ln=1)
    pdf.set_font('Arial', '', 12)
    pdf.cell(0, 10, f"分析时间：{result['analysis_date']}", ln=1)
    pdf.cell(0, 10, f"团队人数：{result['staff_count']}", ln=1)
    pdf.cell(0, 10, f"团队平均分：{ai['team_overview']['average_score']}", ln=1)
    pdf.cell(0, 10, f"最高分：{ai['team_overview']['highest_score']}，最低分：{ai['team_overview']['lowest_score']}", ln=1)
    pdf.cell(0, 10, f"优势维度：{ai['dimension_analysis']['strength']['dimension']}（{ai['dimension_analysis']['strength']['score']}）", ln=1)
    pdf.cell(0, 10, f"薄弱维度：{ai['dimension_analysis']['weakness']['dimension']}（{ai['dimension_analysis']['weakness']['score']}）", ln=1)
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '团队建议', ln=1)
    pdf.set_font('Arial', '', 12)
    for rec in ai['recommendations']:
        pdf.cell(0, 10, f"- {rec}", ln=1)
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, '分层明细', ln=1)
    pdf.set_font('Arial', '', 12)
    for staff in result['results']:
        pdf.cell(0, 10, f"{staff['姓名']} | {staff['岗位']} | {staff['分层']} | 总分: {staff['总分']} | 建议: {staff['建议']}", ln=1)
    for chart in chart_paths:
        pdf.add_page()
        pdf.image(chart, x=10, y=20, w=180)
    pdf.output(save_path) 