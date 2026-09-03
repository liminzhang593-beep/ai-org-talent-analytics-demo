def answer_question(result: dict, question: str) -> str:
    """
    根据分析结果和问题，自动生成答案。
    支持关键词匹配。
    """
    q = question.strip()
    ai = result.get('ai_insights', {})
    if not ai:
        return '未找到分析结果，请先执行分析。'
    if '平均分' in q:
        return f"团队平均分为：{ai['team_overview']['average_score']}"
    if '最高分' in q:
        return f"团队最高分为：{ai['team_overview']['highest_score']}"
    if '最低分' in q:
        return f"团队最低分为：{ai['team_overview']['lowest_score']}"
    if '优势' in q or '最强' in q:
        d = ai['dimension_analysis']['strength']
        return f"团队优势维度是：{d['dimension']}（{d['score']}分）"
    if '薄弱' in q or '最弱' in q:
        d = ai['dimension_analysis']['weakness']
        return f"团队薄弱维度是：{d['dimension']}（{d['score']}分）"
    if '建议' in q or '提升' in q:
        recs = ai.get('recommendations', [])
        return '团队建议：\n' + '\n'.join(f'- {r}' for r in recs)
    return '暂不支持该问题，请尝试：平均分、最高分、最低分、优势、薄弱、建议等关键词。' 