print("=== analyze_api.py 已加载 ===")

def load_llm_configs():
    config_path = os.path.join(os.path.dirname(__file__), "llm_configs.json")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_llm_config_by_id(model_id):
    configs = load_llm_configs()
    for c in configs:
        if str(c.get("id")) == str(model_id):
            return c
    raise Exception("未找到对应的大模型配置")

def build_headers(llm):
    if llm.get("type") == "local":
        return {"Content-Type": "application/json"}
    else:
        return {
            "Authorization": f"Bearer {llm.get('api_key','')}",
            "Content-Type": "application/json"
        }

def build_payload(llm, question):
    if llm.get("type") == "local":
        return {
            "model": llm.get('name'),
            "prompt": question,
            "stream": False
        }
    else:
        return {
            "model": llm.get('name'),
            "messages": [{"role": "user", "content": question}],
            "temperature": 0.7
        }
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from typing import Dict, List, Optional
import requests, os, json
from pydantic import BaseModel
import subprocess
from datetime import datetime
import pandas as pd
import io
from ai_org_talent_gen.utils import load_templates, save_templates
import uuid
import logging
import re
import asyncio
import httpx
from fastapi.responses import StreamingResponse
from .history_utils import save_history, load_history
import unicodedata

router = APIRouter()
class QARequest(BaseModel):
    question: str
    model_id: str
    file_id: Optional[str] = None
    file_content: Optional[str] = None
    file_name: Optional[str] = None
    prefer_chart: Optional[bool] = False
    capability_model: Optional[dict] = None
    company: Optional[str] = None

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MODEL_LOG_FILE = os.path.join(os.path.dirname(__file__), "model_call.log")
PROMPT_DEBUG_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "llm_prompt_debug.txt")
)

def write_model_log(log: dict):
    log['time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open(MODEL_LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(json.dumps(log, ensure_ascii=False) + '\n')

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, file_id + "_" + file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    return {"file_id": file_id, "filename": file.filename}

def load_prompt_templates():
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(current_dir, 'prompt_templates.json')
        with open(file_path, 'r', encoding='utf-8') as f:
            # 直接返回加载的数据
            return json.load(f)
    except Exception as e:
        logging.error(f"Failed to load prompt_templates.json: {e}")
        # 如果失败，返回空对象
        return {}

# 加载一次以供应用内部其他地方使用
PROMPT_TEMPLATES = load_prompt_templates()

# 新增：用于保存和加载Prompt配置的路由
@router.get("/prompt-config")
def get_prompt_config():
    # 每次请求时都重新从文件加载，确保拿到最新数据
    return load_prompt_templates()

@router.post("/prompt-config")
def update_prompt_config(config: dict):
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(current_dir, 'prompt_templates.json')
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
        # 更新内存中的配置
        global PROMPT_TEMPLATES
        PROMPT_TEMPLATES = config
        return {"success": True, "msg": "配置已保存"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存配置失败: {str(e)}")

async def classify_intent(llm_config, question: str):
    logging.info(f"[classify_intent] 收到问题: {question}")
    prompt = f'''As an expert in understanding user requests, your task is to analyze the user's query and break it down into a structured JSON object. You need to identify ALL relevant 'intents' (as a list) and extract any relevant 'entities'.

Here are the possible intents:
- 'GREETING': For simple hellos, goodbyes, or thank yous.
- 'GENERAL_KNOWLEDGE': For questions about who you are, what you can do, or general facts that do not require file analysis.
- 'DATA_ANALYSIS': For any request that involves analyzing data, especially from an uploaded file. This includes calculations, aggregations, summaries, and generating insights.
- 'CHART_GENERATION': When the user explicitly asks for a chart or visualization.
- 'CAPABILITY_ANALYSIS': For requests to analyze the capabilities, skills, or performance of an organization, team, or individual, often based on a predefined capability model.

Your output MUST be a valid JSON object with 'intents' (a list of all relevant intents, e.g. ["DATA_ANALYSIS", "CAPABILITY_ANALYSIS"]) and 'entities' keys. 'entities' should be an object containing extracted values. If no entities are found, it should be an empty object.

Example:
User query: "基于数据表.xlsx, 分析一下研发团队的平均年龄，并给出能力提升建议，并画一个趋势图"
Output:
{{
  "intents": ["DATA_ANALYSIS", "CAPABILITY_ANALYSIS", "CHART_GENERATION"],
  "entities": {{
    "file_name": "数据表.xlsx",
    "analysis_scope": "研发团队",
    "metric": "平均年龄"
  }}
}}

Now, analyze the following user query.

User query: "{question}"
Output:
'''
    payload = build_payload(llm_config, prompt)
    headers = build_headers(llm_config)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(llm_config['api_url'], headers=headers, json=payload)
            data = resp.json()
            if llm_config.get("type") == "local":
                content = data.get("response") or data.get("result") or ""
            else:
                content = data.get('choices', [{}])[0].get('message', {}).get('content') or ""
            match = re.search(r"```json\s*([\s\S]*?)\s*```", content)
            if match:
                json_str = match.group(1)
            else:
                json_str = content
            try:
                intent_data = json.loads(json_str)
                # 新增：兼容旧格式
                if 'intents' in intent_data and 'entities' in intent_data:
                    return intent_data
                elif 'intent' in intent_data and 'entities' in intent_data:
                    return {'intents': [intent_data['intent']], 'entities': intent_data['entities']}
            except json.JSONDecodeError:
                pass
    except Exception as e:
        logging.error(f"[classify_intent] 发生异常: {e}", exc_info=True)
    return {'intents': ['GENERAL_KNOWLEDGE'], 'entities': {}}

# 新增：合并策略与复合prompt支持

def get_merge_key(intent_list, merge_strategy):
    # 查找custom_rules中是否有完全匹配的组合
    for rule in merge_strategy.get('custom_rules', []):
        if set(rule['if']) == set(intent_list):
            return rule['merge_as']
    return None

@router.post("/qa")
async def qa_api(req: QARequest):
    logger = logging.getLogger(__name__)
    tried_models = []
    all_llms = load_llm_configs()
    try_order = []
    if req.model_id:
        try:
            llm = get_llm_config_by_id(req.model_id)
            try_order.append(llm)
        except Exception as e:
            logger.error(f"模型选择失败: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    for c in all_llms:
        if c.get("enabled") and (not req.model_id or str(c.get("id")) != str(req.model_id)):
            try_order.append(c)
    if not try_order:
        raise HTTPException(status_code=500, detail="没有配置可用的LLM模型")
    # === 第1步: 多意图识别 & 实体提取 ===
    intent_llm = try_order[0]
    intent_data = await classify_intent(intent_llm, req.question)
    intent_list = intent_data.get('intents', ['GENERAL_KNOWLEDGE'])
    entities = intent_data.get('entities', {})
    defaults = PROMPT_TEMPLATES.get("qa_defaults", {})
    capability_model_id = defaults.get("capability_model_id")
    company = defaults.get("company")
    capability_model = None
    if capability_model_id:
        try:
            all_models = []
            current_dir = os.path.dirname(os.path.abspath(__file__))
            templates_path = os.path.join(current_dir, 'industry_templates.json')
            if os.path.exists(templates_path):
                with open(templates_path, 'r', encoding='utf-8') as f:
                    all_models = json.load(f)
            for m in all_models:
                model_id_field = f"{m.get('industry')}_{m.get('company')}"
                if model_id_field == capability_model_id:
                    capability_model = m
                    break
        except Exception as e:
            logger.error(f"加载默认能力模型失败: {e}")
    original_question = req.question
    qa_prompts = PROMPT_TEMPLATES.get("qa_prompts", {})
    prompts_by_intent = PROMPT_TEMPLATES.get("PROMPTS_BY_INTENT", {})
    merge_strategy = PROMPT_TEMPLATES.get("merge_strategy", {})
    composite_prompts = PROMPT_TEMPLATES.get("COMPOSITE_PROMPTS", {})
    # === 多意图prompt合并 ===
    merge_key = get_merge_key(intent_list, merge_strategy)
    final_prompt_parts = []
    # 角色定义（只加一次，优先用第一个非GREETING意图的system_role）
    for intent in intent_list:
        if intent != 'GREETING':
            system_role = prompts_by_intent.get(intent, {}).get("system_role", "")
            if system_role:
                final_prompt_parts.append(system_role)
            break
    # 多附件内容
    file_ids = getattr(req, 'file_ids', None) or getattr(req, 'file_id', None)
    file_content_str = get_files_content_as_string(file_ids, UPLOAD_DIR, logger)
    if file_content_str:
        final_prompt_parts.append(file_content_str)
    else:
        logger.warning("最终没有文件内容被拼接到Prompt中。")
    # 优先用复合prompt
    if merge_key and merge_key in composite_prompts:
        print("[拼接策略] 采用了复合prompt：{}".format(merge_key))
        composite_prompt = composite_prompts[merge_key]
        # 传递所有意图、实体、原始问题，附件内容已在前面拼接
        final_prompt_parts.append(f"【多意图任务说明】\n意图: {intent_list}\n实体: {json.dumps(entities, ensure_ascii=False)}\n用户问题: {original_question}\n{composite_prompt}")
    else:
        print("[拼接策略] 采用了普通分段拼接")
        # 按顺序分段拼接
        for intent in intent_list:
            intent_prompt = prompts_by_intent.get(intent, {})
            main_prompt = intent_prompt.get("main_prompt", "")
            user_question_suffix = intent_prompt.get("user_question_suffix", "")
            if main_prompt:
                final_prompt_parts.append(f"【{intent}】\n" + main_prompt)
            if intent == 'CAPABILITY_ANALYSIS' and capability_model:
                prefix = qa_prompts.get("capability_model_prefix", "【企业能力模型】\n{capability_model}\n")
                final_prompt_parts.append(prefix.format(capability_model=json.dumps(capability_model, ensure_ascii=False)))
            final_prompt_parts.append(f"【用户问题】\n{original_question}")
            if user_question_suffix:
                final_prompt_parts.append(user_question_suffix)
    if not any(i for i in intent_list if i != 'GREETING'):
        final_prompt_parts.append(original_question)
    question = "\n\n".join(final_prompt_parts)
    print("\n========== 最终拼接的完整 prompt ==========")
    print(question)
    print("========== END prompt =========\n")
    try:
        with open(PROMPT_DEBUG_FILE, "a", encoding="utf-8") as f:
            f.write("\n========== 最终拼接的完整 prompt ==========\n")
            f.write(question + "\n")
            f.write("========== END prompt =========\n\n")
    except Exception as e:
        print(f"写入 llm_prompt_debug.txt 失败: {e}")

    # 由于模型会智能判断返回格式（JSON或文本），
    # 我们统一使用非流式请求，然后由后端判断返回类型
    async def call_llm(llm, question):
        payload = build_payload(llm, question)
        headers = build_headers(llm)
        log_record = {
            'model_name': llm.get('name'),
            'input': question,
            'type': 'qa',
        }
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(llm['api_url'], headers=headers, json=payload)
                data = resp.json()
                if llm.get("type") == "local":
                    content = data.get("response") or data.get("result") or str(data)
                else:
                    content = data.get('choices',[{}])[0].get('message',{}).get('content') or data.get('output') or str(data)
                
                log_record['success'] = True
                log_record['response'] = str(content)[:200]
                write_model_log(log_record)

                chart = None
                answer = content.strip() # 默认回复为全部内容

                # 优先使用正则寻找被```json ...```包裹的图表配置
                chart_match = re.search(r"```json\s*(\{[\s\S]*?\})\s*```", content, re.DOTALL)
                
                if chart_match:
                    chart_json_str = chart_match.group(1)
                    try:
                        chart_data = json.loads(chart_json_str)
                        if isinstance(chart_data, dict):
                            chart = chart_data
                            # 文本内容为图表JSON之外的所有内容
                            answer = content.replace(chart_match.group(0), "").strip()
                            # 如果去除图表后文本为空，则使用图表标题作为默认文本
                            if not answer:
                                answer = chart.get('title', {}).get('text', '已为您生成图表')
                    except (json.JSONDecodeError, TypeError):
                        # 如果```json```块中内容无法解析，则将所有内容视为纯文本
                        answer = content
                else:
                    # 如果没有代码块，尝试直接解析整个内容（作为降级策略）
                    try:
                        cleaned_content = content.strip()
                        if cleaned_content.startswith('{') and cleaned_content.endswith('}'):
                            chart_data = json.loads(cleaned_content)
                            # 简单校验是否为echarts option
                            if isinstance(chart_data, dict) and 'series' in chart_data:
                                chart = chart_data
                                answer = chart.get('title', {}).get('text', '已为您生成图表')
                    except (json.JSONDecodeError, TypeError):
                        # 解析失败，说明是纯文本
                        answer = content

                return {
                    "answer": answer,
                    "model_used": llm.get('name'),
                    "chart": chart,
                    "success": True
                }
        except Exception as e:
            import traceback
            print("=== LLM 调用异常 ===")
            print(traceback.format_exc())
            log_record['success'] = False
            log_record['response'] = str(e)
            write_model_log(log_record)
            return {"error": str(e), "model_used": llm.get('name'), "success": False}
    
    for llm in try_order:
        try:
            result = await asyncio.wait_for(call_llm(llm, question), timeout=60)
        except asyncio.TimeoutError:
            print(f"模型 {llm.get('name')} 超时，尝试下一个...")
            continue
        
        if result.get('success'):
            return {
                "answer": result['answer'],
                "model_used": result['model_used'],
                "chart": result.get('chart')
            }

    raise HTTPException(status_code=500, detail=f"所有可用大模型均调用失败")

# 示例行业最佳实践，可扩展为数据库/配置文件
INDUSTRY_BEST_PRACTICE = {
    "互联网": "互联网行业优秀人才通常具备：强技术创新、跨部门协作、快速学习能力...",
    "制造业": "制造业优秀人才需具备：质量控制、团队协作、持续改进意识...",
    "金融": "金融行业优秀人才需具备：风险控制、合规意识、数据分析能力...",
    "教育": "教育行业优秀人才需具备：教学创新、学生关爱、团队合作..."
}

class AnalyzeRequest(BaseModel):
    industry: str
    thresholds: dict
    staff_list: list
    use_cursor: Optional[bool] = False
    model_id: Optional[str] = None

@router.post("/analyze")
async def analyze(request: AnalyzeRequest):
    try:
        if request.use_cursor:
            # 使用 Cursor 客户端进行分析
            result = await analyze_with_cursor(request)
        else:
            # 使用配置的模型进行分析
            result = await analyze_with_model(request)
        # 生成markdown和PDF
        report_dir = "reports"
        os.makedirs(report_dir, exist_ok=True)
        analysis_id = result.get("analysis_id") or datetime.now().strftime("%Y%m%d%H%M%S")
        md_path = os.path.join(report_dir, f"{analysis_id}.md")
        pdf_path = os.path.join(report_dir, f"{analysis_id}.pdf")
        generate_markdown_report(result, [], md_path)
        generate_pdf_report(result, [], pdf_path)
        with open(md_path, "r", encoding="utf-8") as f:
            markdown_text = f.read()
        response_payload = {
            "success": True,
            "markdown": markdown_text,
            "pdf_url": f"/api/report/{analysis_id}.pdf",
            "result": result,
            **result,
        }
        save_history({
            "analysis_id": analysis_id,
            "industry": request.industry,
            "company": request.thresholds.get("company"),
            "staff_count": result.get("staff_count"),
            "analysis_date": result.get("analysis_date"),
            "average_score": result.get("ai_insights", {}).get("team_overview", {}).get("average_score"),
            "pdf_url": response_payload["pdf_url"],
        })
        return response_payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
def get_history():
    try:
        history = load_history()
        return {
            "success": True,
            "data": list(reversed(history)),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/report/{filename}")
def get_report_pdf(filename: str):
    report_dir = "reports"
    pdf_path = os.path.join(report_dir, filename)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="报告不存在")
    from fastapi.responses import FileResponse
    return FileResponse(pdf_path, media_type="application/pdf", filename=filename)

@router.post("/analyze/file")
async def analyze_file(
    industry: str = Form(...),
    company: str = Form(None),
    file: UploadFile = File(...),
    use_cursor: bool = Form(False),
    model_id: str = Form(None)
):
    ext = file.filename.split('.')[-1].lower()
    content = await file.read()
    if ext in ["xlsx", "xls"]:
        df = pd.read_excel(io.BytesIO(content))
    elif ext == "csv":
        df = pd.read_csv(io.BytesIO(content))
    elif ext == "json":
        df = pd.read_json(io.BytesIO(content))
    else:
        raise HTTPException(400, "仅支持Excel/CSV/JSON文件")
    staff_list = df.to_dict(orient="records")
    # 这里可根据行业/企业自动获取能力模型和thresholds
    # 简化处理，假设前端传company，后端查模板
    templates = load_templates()
    template = next((t for t in templates if t["industry"]==industry and t["company"]==company), None)
    if not template:
        raise HTTPException(400, "未找到行业企业能力模型")
    thresholds = template.get("default_thresholds", {})
    ability_model = template.get("dimensions", [])
    # 组装结构化请求
    req = AnalyzeRequest(
        industry=industry,
        thresholds={**thresholds, "company": company, "ability_model": ability_model},
        staff_list=staff_list,
        use_cursor=use_cursor,
        model_id=model_id
    )
    return await analyze(req)

async def analyze_with_cursor(request: AnalyzeRequest):
    # 调用 Cursor 客户端进行分析
    try:
        temp_file = "temp_analysis.json"
        with open(temp_file, "w") as f:
            json.dump({
                "industry": request.industry,
                "thresholds": request.thresholds,
                "staff_list": request.staff_list
            }, f)
        result = subprocess.run(
            ["cursor", "analyze", temp_file],
            capture_output=True,
            text=True
        )
        os.remove(temp_file)
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            raise Exception(f"Cursor analysis failed: {result.stderr}")
    except Exception as e:
        raise Exception(f"Failed to analyze with Cursor: {str(e)}")

async def analyze_with_model(request: AnalyzeRequest):
    # 原有的模型分析逻辑
    industry = request.industry
    company = request.thresholds.get('company')
    ability_model = request.thresholds.get('ability_model')
    staff_list = request.staff_list
    if not (industry and staff_list):
        raise HTTPException(400, "参数不全")
    llm = get_enabled_llm()
    prompt = build_prompt(industry, company, ability_model, staff_list)
    headers = {"Authorization": f"Bearer {llm.get('api_key','')}", "Content-Type": "application/json"}
    payload = {
        "model": llm.get('name'),
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }
    try:
        resp = requests.post(llm['api_url'], headers=headers, json=payload, timeout=120)
        data = resp.json()
        content = data.get('choices',[{}])[0].get('message',{}).get('content') or data.get('output')
        result = json.loads(content)
        return result
    except Exception as e:
        raise HTTPException(500, f"大模型调用失败: {e}")
 
def get_enabled_llm():
    configs = load_llm_configs()
    for c in configs:
        if c.get('enabled'):
            return c
    raise HTTPException(400, "未配置启用的大模型")

def build_prompt(industry, company, ability_model, staff_list, user_question=None):
    """
    组装大模型prompt，适用于能力评估相关场景。
    user_question: 智能问答场景下的用户问题，分析场景可为None
    """
    analysis_prompts = PROMPT_TEMPLATES.get("analysis_prompts", {})
    
    system_role = analysis_prompts.get("system_role", """你是一名拥有15年工作经验的组织发展专家与数据分析专家，拥有深厚的人力资源、管理学、组织行为学、心理学、数据科学、谈判学的理论和知识沉淀，并且通善丰富的人力资源管理实践和咨询经验，熟知行业内的最佳实践。你的任务是综合用户提供的信息进行深度思考，结合行业对人才通用能力要求及企业本身的能力维度要求（见下），完成对人员的综合评价、对人员进行点评、输出有力基于数据的管理建议。语言专业、精简。""")
    main_template = analysis_prompts.get("main_template", """

【企业能力模型】
{ability_model}

【员工原始数据】
{staff_list}
""")
    
    prompt = system_role + main_template.format(
        ability_model=json.dumps(ability_model, ensure_ascii=False),
        staff_list=json.dumps(staff_list, ensure_ascii=False)
    )
    
    if user_question:
        user_question_suffix = analysis_prompts.get("user_question_suffix", "\n【用户问题】\n{user_question}\n")
        prompt += user_question_suffix.format(user_question=user_question)
        
    output_format_instruction = analysis_prompts.get("output_format_instruction", """
请严格按照以下结构输出：
1. 阐述你分析评价的理论框架，说明其合理性。
2. 综合评价、对比、管理建议。
3. 为了后续更好的分析，你还希望补充哪些信息即原因。
""")
    prompt += output_format_instruction
    return prompt

@router.post("/llm-configs/{model_id}/test")
async def test_llm_connectivity(model_id: str):
    try:
        llm = get_llm_config_by_id(model_id)
        payload = build_payload(llm, "你好，测试连通性")
        headers = build_headers(llm)
        log_record = {
            'model_name': llm.get('name'),
            'input': '你好，测试连通性',
            'type': 'test',
        }
        resp = requests.post(llm['api_url'], headers=headers, json=payload, timeout=120)
        if resp.status_code == 200:
            try:
                data = resp.json()
                if llm.get("type") == "local":
                    content = data.get("response") or data.get("result") or str(data)
                else:
                    content = data.get('choices',[{}])[0].get('message',{}).get('content') or data.get('output') or str(data)
                log_record['success'] = True
                log_record['response'] = content[:200]
                write_model_log(log_record)
                return {"success": True, "msg": "连通成功", "response": content}
            except Exception:
                log_record['success'] = True
                log_record['response'] = resp.text[:200]
                write_model_log(log_record)
                return {"success": True, "msg": "连通成功（但返回内容解析失败）", "response": resp.text}
        else:
            log_record['success'] = False
            log_record['response'] = f"HTTP {resp.status_code}: {resp.text[:200]}"
            write_model_log(log_record)
            return {"success": False, "msg": f"HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        log_record = {
            'model_name': '',
            'input': '你好，测试连通性',
            'type': 'test',
            'success': False,
            'response': str(e)
        }
        write_model_log(log_record)
        return {"success": False, "msg": f"连接失败: {str(e)}"}

@router.get("/model-call-logs")
def get_model_call_logs(page: int = 1, page_size: int = 20):
    logs = []
    if os.path.exists(MODEL_LOG_FILE):
        with open(MODEL_LOG_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    logs.append(json.loads(line))
                except:
                    continue
    logs = logs[::-1]  # 最新的在前
    total = len(logs)
    start = (page - 1) * page_size
    end = start + page_size
    return {"success": True, "data": logs[start:end], "total": total}

@router.put("/industry_templates/{industry}/{company}/enable")
async def set_industry_template_enabled(industry: str, company: str, body: dict = Body(...)):
    """启用/禁用企业能力模型，兼容前端传递对象格式"""
    print("=== 你看到这行说明日志生效 ===")
    enabled = body.get("enabled")
    if enabled is None:
        raise HTTPException(status_code=400, detail="缺少 enabled 字段")

    def normalize(s):
        # 转小写、去空格、全角转半角
        if not isinstance(s, str):
            return ""
        s = unicodedata.normalize('NFKC', s)
        return s.strip().lower()

    templates = load_templates()
    found = False
    print(f"前端传入: industry='{industry}', company='{company}'")
    print(f"前端 normalize 后: industry='{normalize(industry)}', company='{normalize(company)}'")
    for t in templates:
        print(f"模板原始: industry='{t.get('industry')}', company='{t.get('company')}'")
        print(f"模板 normalize 后: industry='{normalize(t.get('industry'))}', company='{normalize(t.get('company'))}'")
        if normalize(t.get("industry")) == normalize(industry) and normalize(t.get("company")) == normalize(company):
            t["enabled"] = enabled
            found = True
            break

    if not found:
        print("未找到匹配项，所有模板normalize后如下：")
        for t in templates:
            print(f"industry: '{normalize(t.get('industry'))}', company: '{normalize(t.get('company'))}'")
        raise HTTPException(status_code=404, detail="未找到对应企业能力模型")

    save_templates(templates)
    from .app import load_industry_templates_to_cache  # 延迟导入，避免循环依赖
    load_industry_templates_to_cache()  # 强制刷新缓存，确保GET接口返回最新数据
    return {"success": True, "msg": "状态已更新"}

# --- 新增的、专门负责文件处理的函数 ---
def get_files_content_as_string(file_ids, upload_dir, logger):
    """根据file_ids列表查找并读取所有文件内容，返回字符串。"""
    if not file_ids:
        return ""
    if isinstance(file_ids, str):
        file_ids = [file_ids]
    contents = []
    for file_id in file_ids:
        if not file_id:
            continue
        logger.info(f"开始处理附件。收到的 file_id: {file_id}")
        try:
            for fname in os.listdir(upload_dir):
                if fname.startswith(file_id + "_"):
                    file_path = os.path.join(upload_dir, fname)
                    logger.info(f"找到了匹配的文件: {file_path}")
                    try:
                        with open(file_path, "rb") as f:
                            if fname.endswith((".xls", ".xlsx")):
                                logger.info("尝试作为Excel文件读取...")
                                df = pd.read_excel(f)
                                content_str = f"\n[附件内容-表格: {fname.split('_',1)[-1]}]\n{df.to_csv(index=False)}"
                                logger.info(f"Excel读取成功，转换后内容长度: {len(content_str)}")
                                contents.append(content_str)
                            else:
                                logger.info("尝试作为文本文件读取...")
                                content = f.read().decode('utf-8', errors='ignore')
                                content_str = f"\n[附件内容: {fname.split('_',1)[-1]}]\n{content}"
                                logger.info(f"文本文件读取成功，内容长度: {len(content_str)}")
                                contents.append(content_str)
                    except Exception as e:
                        logger.error(f"读取文件 '{fname}' 内容时失败: {e}", exc_info=True)
                        continue
            # 没找到文件也不报错
        except Exception as e:
            logger.error(f"遍历上传目录 '{upload_dir}' 时失败: {e}", exc_info=True)
    return "\n".join(contents)

@router.post("/qa/stream")
async def qa_api_stream(req: QARequest):
    logger = logging.getLogger(__name__)
    tried_models = []
    all_llms = load_llm_configs()
    try_order = []
    if req.model_id:
        try:
            llm = get_llm_config_by_id(req.model_id)
            try_order.append(llm)
        except Exception as e:
            logger.error(f"模型选择失败: {e}")
            raise HTTPException(status_code=400, detail=str(e))
    for c in all_llms:
        if c.get("enabled") and (not req.model_id or str(c.get("id")) != str(req.model_id)):
            try_order.append(c)
    if not try_order:
        raise HTTPException(status_code=500, detail="没有配置可用的LLM模型")

    # 复用原有prompt构建逻辑
    intent_llm = try_order[0]
    intent_data = await classify_intent(intent_llm, req.question)
    intent_list = intent_data.get('intents', ['GENERAL_KNOWLEDGE'])
    entities = intent_data.get('entities', {})
    defaults = PROMPT_TEMPLATES.get("qa_defaults", {})
    capability_model_id = defaults.get("capability_model_id")
    company = defaults.get("company")
    capability_model = None
    if capability_model_id:
        try:
            all_models = []
            current_dir = os.path.dirname(os.path.abspath(__file__))
            templates_path = os.path.join(current_dir, 'industry_templates.json')
            if os.path.exists(templates_path):
                with open(templates_path, 'r', encoding='utf-8') as f:
                    all_models = json.load(f)
            for m in all_models:
                model_id_field = f"{m.get('industry')}_{m.get('company')}"
                if model_id_field == capability_model_id:
                    capability_model = m
                    break
        except Exception as e:
            logger.error(f"加载默认能力模型失败: {e}")
    question = req.question
    qa_prompts = PROMPT_TEMPLATES.get("qa_prompts", {})
    prompts_by_intent = PROMPT_TEMPLATES.get("PROMPTS_BY_INTENT", {})
    # === 多意图prompt合并 ===
    final_prompt_parts = []
    for intent in intent_list:
        if intent != 'GREETING':
            system_role = prompts_by_intent.get(intent, {}).get("system_role", "")
            if system_role:
                final_prompt_parts.append(system_role)
            break
    file_ids = getattr(req, 'file_ids', None) or getattr(req, 'file_id', None)
    file_content_str = get_files_content_as_string(file_ids, UPLOAD_DIR, logger)
    if file_content_str:
        final_prompt_parts.append(file_content_str)
    else:
        logger.warning("最终没有文件内容被拼接到Prompt中。")
    for intent in intent_list:
        intent_prompt = prompts_by_intent.get(intent, {})
        main_prompt = intent_prompt.get("main_prompt", "")
        user_question_suffix = intent_prompt.get("user_question_suffix", "")
        if main_prompt:
            final_prompt_parts.append(f"【{intent}】\n" + main_prompt)
        if intent == 'CAPABILITY_ANALYSIS' and capability_model:
            prefix = qa_prompts.get("capability_model_prefix", "【企业能力模型】\n{capability_model}\n")
            final_prompt_parts.append(prefix.format(capability_model=json.dumps(capability_model, ensure_ascii=False)))
        final_prompt_parts.append(f"【用户问题】\n{req.question}")
        if user_question_suffix:
            final_prompt_parts.append(user_question_suffix)
    if not any(i for i in intent_list if i != 'GREETING'):
        final_prompt_parts.append(req.question)
    question = "\n\n".join(final_prompt_parts)
    print("\n========== 最终拼接的完整 prompt ==========")
    print(question)
    print("========== END prompt =========\n")
    try:
        with open(PROMPT_DEBUG_FILE, "a", encoding="utf-8") as f:
            f.write("\n========== 最终拼接的完整 prompt ==========\n")
            f.write(question + "\n")
            f.write("========== END prompt =========\n\n")
    except Exception as e:
        print(f"写入 llm_prompt_debug.txt 失败: {e}")

    # --- 流式转发大模型API ---
    async def event_generator():
        sent = False
        for llm in try_order:
            try:
                payload = build_payload(llm, question)
                headers = build_headers(llm)
                # 强制流式
                if llm.get("type") != "local":
                    payload["stream"] = True
                async with httpx.AsyncClient(timeout=120) as client:
                    async with client.stream("POST", llm['api_url'], headers=headers, json=payload) as resp:
                        async for chunk in resp.aiter_text():
                            if chunk.strip():
                                logger.info(f"[qa_api_stream] 流式返回chunk: {chunk[:100]}")
                                sent = True
                                yield chunk
                break  # 成功后不再尝试下一个模型
            except Exception as e:
                logger.error(f"流式调用模型 {llm.get('name')} 失败: {e}")
                continue
        if not sent:
            logger.warning("[qa_api_stream] 没有任何内容被流式返回，向前端返回提示信息。")
            yield "data: {\"error\": \"AI未返回内容，请稍后重试或联系管理员。\"}\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream") 
