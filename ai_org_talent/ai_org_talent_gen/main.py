import argparse
import sys
import os
from datetime import datetime
from .data_utils import load_staff_data
from history_utils import save_history, load_history
from analyze_utils import analyze_staff, INDUSTRY_TEMPLATES
from qa_utils import answer_question
from chart_utils import plot_dimension_bar, plot_tier_pie
from report_utils import generate_markdown_report, generate_pdf_report

# 预留：导入main.py分析逻辑
# from ..python_main import analyze_staff, get_industry_templates

def main():
    parser = argparse.ArgumentParser(description='ai_org_talent_gen')
    subparsers = parser.add_subparsers(dest='command')

    # 1. 行业模板选择与数据导入
    parser_import = subparsers.add_parser('import', help='导入员工数据')
    parser_import.add_argument('--industry', required=True, help='行业类型')
    parser_import.add_argument('--file', required=True, help='员工数据文件（CSV/JSON）')

    # 2. 分析与洞察
    parser_analyze = subparsers.add_parser('analyze', help='分析员工数据')
    parser_analyze.add_argument('--industry', required=True, help='行业类型')
    parser_analyze.add_argument('--file', required=True, help='员工数据文件（CSV/JSON）')

    # 3. 自动问答
    parser_qa = subparsers.add_parser('qa', help='自动问答')
    parser_qa.add_argument('--question', required=True, help='输入你的问题')

    # 4. 图表生成
    parser_chart = subparsers.add_parser('chart', help='生成分析图表')
    parser_chart.add_argument('--industry', required=True, help='行业类型')
    parser_chart.add_argument('--file', required=True, help='员工数据文件（CSV/JSON）')

    # 5. 报告生成
    parser_report = subparsers.add_parser('report', help='生成分析报告')
    parser_report.add_argument('--industry', required=True, help='行业类型')
    parser_report.add_argument('--file', required=True, help='员工数据文件（CSV/JSON）')
    parser_report.add_argument('--format', choices=['pdf', 'md'], required=True, help='报告格式')

    # 6. 历史记录
    parser_history = subparsers.add_parser('history', help='查看历史分析记录')

    args = parser.parse_args()

    if args.command == 'import':
        print(f'导入行业：{args.industry}，数据文件：{args.file}')
        try:
            staff_data = load_staff_data(args.file)
            print(f'成功导入{len(staff_data)}条员工数据')
            save_history({
                'action': 'import',
                'industry': args.industry,
                'file': args.file,
                'count': len(staff_data)
            })
        except Exception as e:
            print(f'导入失败：{e}')
    elif args.command == 'analyze':
        print(f'分析行业：{args.industry}，数据文件：{args.file}')
        try:
            staff_data = load_staff_data(args.file)
            thresholds = INDUSTRY_TEMPLATES[args.industry]["default_thresholds"]
            result = analyze_staff(args.industry, staff_data, thresholds)
            print("\n【团队分析结果】")
            print(f"分析时间：{result['analysis_date']}")
            print(f"团队人数：{result['staff_count']}")
            print(f"团队平均分：{result['ai_insights']['team_overview']['average_score']}")
            print(f"最高分：{result['ai_insights']['team_overview']['highest_score']}，最低分：{result['ai_insights']['team_overview']['lowest_score']}")
            print(f"优势维度：{result['ai_insights']['dimension_analysis']['strength']['dimension']}（{result['ai_insights']['dimension_analysis']['strength']['score']}）")
            print(f"薄弱维度：{result['ai_insights']['dimension_analysis']['weakness']['dimension']}（{result['ai_insights']['dimension_analysis']['weakness']['score']}）")
            print("\n【团队建议】")
            for rec in result['ai_insights']['recommendations']:
                print(f"- {rec}")
            print("\n【分层明细】")
            for staff in result['results']:
                print(f"{staff['姓名']} | {staff['岗位']} | {staff['分层']} | 总分: {staff['总分']} | 建议: {staff['建议']}")
            save_history({
                'action': 'analyze',
                'industry': args.industry,
                'file': args.file,
                'count': len(staff_data),
                'result': result['ai_insights'],
                'analysis_id': result['analysis_id']
            })
        except Exception as e:
            print(f'分析失败：{e}')
    elif args.command == 'qa':
        print(f'自动问答：{args.question}')
        history = load_history()
        # 查找最近一次分析结果
        last_result = None
        for record in reversed(history):
            if record.get('action') == 'analyze' and 'result' in record:
                last_result = record
                break
        if not last_result:
            print('未找到分析结果，请先执行分析。')
        else:
            answer = answer_question(last_result, args.question)
            print(f'答：{answer}')
    elif args.command == 'chart':
        print(f'生成图表，行业：{args.industry}，数据文件：{args.file}')
        try:
            staff_data = load_staff_data(args.file)
            thresholds = INDUSTRY_TEMPLATES[args.industry]["default_thresholds"]
            result = analyze_staff(args.industry, staff_data, thresholds)
            chart_dir = "charts"
            os.makedirs(chart_dir, exist_ok=True)
            bar_path = os.path.join(chart_dir, f"{args.industry}_dimension_bar.png")
            pie_path = os.path.join(chart_dir, f"{args.industry}_tier_pie.png")
            plot_dimension_bar(result['ai_insights'], bar_path)
            plot_tier_pie(result['results'], pie_path)
            print(f"维度均分柱状图已保存：{bar_path}")
            print(f"人才分层饼图已保存：{pie_path}")
            save_history({
                'action': 'chart',
                'industry': args.industry,
                'file': args.file,
                'charts': [bar_path, pie_path]
            })
        except Exception as e:
            print(f'图表生成失败：{e}')
    elif args.command == 'report':
        print(f'生成报告，行业：{args.industry}，数据文件：{args.file}，格式：{args.format}')
        try:
            staff_data = load_staff_data(args.file)
            thresholds = INDUSTRY_TEMPLATES[args.industry]["default_thresholds"]
            result = analyze_staff(args.industry, staff_data, thresholds)
            chart_dir = "charts"
            os.makedirs(chart_dir, exist_ok=True)
            bar_path = os.path.join(chart_dir, f"{args.industry}_dimension_bar.png")
            pie_path = os.path.join(chart_dir, f"{args.industry}_tier_pie.png")
            plot_dimension_bar(result['ai_insights'], bar_path)
            plot_tier_pie(result['results'], pie_path)
            report_dir = "reports"
            os.makedirs(report_dir, exist_ok=True)
            if args.format == 'md':
                report_path = os.path.join(report_dir, f"{args.industry}_report.md")
                generate_markdown_report(result, [bar_path, pie_path], report_path)
                print(f"Markdown报告已保存：{report_path}")
            else:
                report_path = os.path.join(report_dir, f"{args.industry}_report.pdf")
                generate_pdf_report(result, [bar_path, pie_path], report_path)
                print(f"PDF报告已保存：{report_path}")
            save_history({
                'action': 'report',
                'industry': args.industry,
                'file': args.file,
                'report': report_path,
                'charts': [bar_path, pie_path]
            })
        except Exception as e:
            print(f'报告生成失败：{e}')
    elif args.command == 'history':
        print('历史分析记录：')
        history = load_history()
        for i, record in enumerate(history):
            print(f"[{i+1}] 时间: {record.get('timestamp', '')} | 动作: {record.get('action', '')} | 行业: {record.get('industry', '')} | 文件: {record.get('file', '')} | 数量: {record.get('count', '')}")
        if not history:
            print('暂无历史记录。')
    else:
        parser.print_help()

if __name__ == '__main__':
    main() 