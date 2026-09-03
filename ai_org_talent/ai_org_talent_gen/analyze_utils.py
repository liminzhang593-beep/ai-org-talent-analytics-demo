print("=== analyze_utils.py 已加载 ===")

from fastapi import HTTPException
from typing import List, Dict
import os
import json

# 行业模板存储文件
TEMPLATE_FILE = os.path.join(os.path.dirname(__file__), 'industry_templates.json')

def load_templates():
    if os.path.exists(TEMPLATE_FILE):
        with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_templates(templates):
    with open(TEMPLATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(templates, f, ensure_ascii=False, indent=2)

import uuid
from datetime import datetime

# 行业模板配置
INDUSTRY_TEMPLATES = {
    "互联网": {
        "dimensions": [
            {"name": "技术能力", "weight": 30, "description": "编程技能、技术架构能力"},
            {"name": "项目贡献", "weight": 25, "description": "项目交付质量和影响力"},
            {"name": "创新能力", "weight": 20, "description": "技术创新和问题解决能力"},
            {"name": "协作能力", "weight": 15, "description": "团队合作和沟通能力"},
            {"name": "学习能力", "weight": 10, "description": "持续学习和适应能力"}
        ],
        "default_thresholds": {"优秀": 85, "良好": 70, "一般": 50}
    },
    "制造业": {
        "dimensions": [
            {"name": "专业技能", "weight": 25, "description": "岗位专业技能熟练度"},
            {"name": "安全意识", "weight": 20, "description": "安全操作和风险防范"},
            {"name": "质量控制", "weight": 20, "description": "产品质量把控能力"},
            {"name": "团队协作", "weight": 15, "description": "团队配合和执行力"},
            {"name": "稳定性", "weight": 12, "description": "工作稳定性和责任心"},
            {"name": "改进意识", "weight": 8, "description": "持续改进和优化意识"}
        ],
        "default_thresholds": {"优秀": 82, "良好": 68, "一般": 50}
    },
    "金融": {
        "dimensions": [
            {"name": "专业知识", "weight": 30, "description": "金融专业知识水平"},
            {"name": "风险控制", "weight": 25, "description": "风险识别和控制能力"},
            {"name": "客户服务", "weight": 20, "description": "客户关系维护能力"},
            {"name": "合规意识", "weight": 15, "description": "法规遵守和合规操作"},
            {"name": "数据分析", "weight": 10, "description": "数据分析和决策支持"}
        ],
        "default_thresholds": {"优秀": 88, "良好": 75, "一般": 55}
    },
    "教育": {
        "dimensions": [
            {"name": "教学能力", "weight": 35, "description": "教学方法和课堂管理"},
            {"name": "专业知识", "weight": 25, "description": "学科专业知识深度"},
            {"name": "学生关爱", "weight": 20, "description": "学生关怀和引导能力"},
            {"name": "创新意识", "weight": 12, "description": "教学创新和方法改进"},
            {"name": "团队合作", "weight": 8, "description": "同事协作和团队精神"}
        ],
        "default_thresholds": {"优秀": 85, "良好": 72, "一般": 55}
    }
}

def generate_team_recommendations(staff_data: List[Dict], dim_averages: Dict, avg_score: float) -> List[str]:
    """生成团队改进建议"""
    recommendations = []
    if avg_score >= 80:
        recommendations.append("团队整体表现优秀，建议保持当前优势并关注持续发展")
    elif avg_score >= 70:
        recommendations.append("团队表现良好，可通过针对性培训进一步提升")
    else:
        recommendations.append("团队需要系统性提升，建议制定详细的能力发展计划")
    weak_dims = [dim for dim, score in dim_averages.items() if score < 70]
    if weak_dims:
        recommendations.append(f"重点关注以下薄弱维度：{', '.join(weak_dims)}")
    excellent_count = len([s for s in staff_data if s["分层"] == "优秀人才"])
    total_count = len(staff_data)
    if total_count > 0 and excellent_count / total_count < 0.2:
        recommendations.append("优秀人才比例偏低，建议加强人才培养和引进")
    return recommendations

def calculate_ai_insights(staff_data: List[Dict], template: Dict) -> Dict:
    """AI分析洞察"""
    total_staff = len(staff_data)
    if total_staff == 0:
        return {}
    dimensions = template["dimensions"]
    dim_averages = {}
    for dim in dimensions:
        scores = [staff[dim["name"]] for staff in staff_data if dim["name"] in staff]
        dim_averages[dim["name"]] = round(sum(scores) / len(scores), 1) if scores else 0
    sorted_dims = sorted(dim_averages.items(), key=lambda x: x[1], reverse=True)
    strength_dim = sorted_dims[0] if sorted_dims else ("", 0)
    weakness_dim = sorted_dims[-1] if sorted_dims else ("", 0)
    total_scores = [staff["总分"] for staff in staff_data]
    avg_score = round(sum(total_scores) / len(total_scores), 1) if total_scores else 0
    max_score = max(total_scores) if total_scores else 0
    min_score = min(total_scores) if total_scores else 0
    return {
        "team_overview": {
            "total_count": total_staff,
            "average_score": avg_score,
            "highest_score": max_score,
            "lowest_score": min_score,
            "score_range": round(max_score - min_score, 1)
        },
        "dimension_analysis": {
            "averages": dim_averages,
            "strength": {"dimension": strength_dim[0], "score": strength_dim[1]},
            "weakness": {"dimension": weakness_dim[0], "score": weakness_dim[1]}
        },
        "recommendations": generate_team_recommendations(staff_data, dim_averages, avg_score)
    }

def analyze_staff(industry: str, staff_list: List[Dict], thresholds: Dict[str, float] = None, analysis_date: str = None) -> Dict:
    """命令行分析主入口，输入行业、员工数据，输出分析结果"""
    if industry not in INDUSTRY_TEMPLATES:
        raise ValueError("不支持的行业类型")
    template = INDUSTRY_TEMPLATES[industry]
    dimensions = template["dimensions"]
    if thresholds is None:
        thresholds = template["default_thresholds"]
    analyzed_staff = []
    for staff in staff_list:
        total_score = 0
        dimension_scores = {}
        for dim in dimensions:
            dim_name = dim["name"]
            score = float(staff.get(dim_name, 0))
            weight = dim["weight"]
            total_score += score * weight / 100
            dimension_scores[dim_name] = score
        # 分层
        if total_score >= thresholds.get("优秀", 85):
            tier = "优秀人才"
            suggestion = "核心骨干，重点培养和激励，考虑晋升发展"
            risk_level = "低"
        elif total_score >= thresholds.get("良好", 70):
            tier = "骨干人才"
            suggestion = "中坚力量，提供成长机会和技能培训"
            risk_level = "中"
        elif total_score >= thresholds.get("一般", 50):
            tier = "普通人才"
            suggestion = "基础员工，关注能力提升和职业发展"
            risk_level = "中"
        else:
            tier = "待提升"
            suggestion = "需要重点关注，制定专项提升计划"
            risk_level = "高"
        staff_result = {
            "姓名": staff.get("姓名", ""),
            "标签": staff.get("标签", ""),
            "部门": staff.get("部门", ""),
            "岗位": staff.get("岗位", ""),
            "总分": round(total_score, 1),
            "分层": tier,
            "建议": suggestion,
            "风险等级": risk_level,
            **dimension_scores
        }
        analyzed_staff.append(staff_result)
    ai_insights = calculate_ai_insights(analyzed_staff, template)
    analyzed_staff.sort(key=lambda x: x["总分"], reverse=True)
    return {
        "success": True,
        "analysis_id": str(uuid.uuid4()),
        "industry": industry,
        "template": template,
        "thresholds": thresholds,
        "analysis_date": analysis_date or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "staff_count": len(analyzed_staff),
        "results": analyzed_staff,
        "ai_insights": ai_insights
    }