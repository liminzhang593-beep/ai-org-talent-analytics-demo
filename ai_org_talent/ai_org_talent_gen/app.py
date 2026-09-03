from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .analyze_api import router as analyze_router
from .llm_config import router as llm_router, load_configs
from typing import Dict
import json
import os
import logging

# --- 缓存优化 ---
INDUSTRY_TEMPLATES_CACHE = []

# --- 日志配置 (全局一次性配置) ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

def load_industry_templates_to_cache():
    """在服务启动时加载行业模板到内存"""
    global INDUSTRY_TEMPLATES_CACHE
    template_path = os.path.join(os.path.dirname(__file__), "industry_templates.json")
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            INDUSTRY_TEMPLATES_CACHE = json.load(f)
        print("行业能力模型已成功加载到缓存。")
    except Exception as e:
        print(f"警告：无法加载行业能力模型到缓存: {e}")
        INDUSTRY_TEMPLATES_CACHE = []

def save_templates(templates):
    """保存模板到文件"""
    template_path = os.path.join(os.path.dirname(__file__), "industry_templates.json")
    with open(template_path, "w", encoding="utf-8") as f:
        json.dump(templates, f, ensure_ascii=False, indent=2)

app = FastAPI(title="AI组织及人才分析平台")

@app.on_event("startup")
async def startup_event():
    """FastAPI启动事件"""
    load_industry_templates_to_cache()

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(analyze_router, prefix="/api")
app.include_router(llm_router, prefix="/api")

# 获取行业模板 (从缓存读取)
@app.get("/api/industry_templates")
async def get_industry_templates():
    # 直接从缓存返回，不再每次读取文件
    return {"success": True, "data": INDUSTRY_TEMPLATES_CACHE}

# 添加行业模板
@app.post("/api/industry_templates")
async def add_template(template: Dict):
    global INDUSTRY_TEMPLATES_CACHE
    industry = template.get("industry")
    company = template.get("company", "")
    if not industry or not company:
        raise HTTPException(status_code=400, detail="参数不完整")
    for item in INDUSTRY_TEMPLATES_CACHE:
        if item["industry"] == industry and item["company"] == company:
            raise HTTPException(status_code=400, detail="该行业下企业已存在，不能重复添加")
    INDUSTRY_TEMPLATES_CACHE.append(template)
    save_templates(INDUSTRY_TEMPLATES_CACHE)
    return {"success": True}

# 更新行业模板
@app.put("/api/industry_templates/{industry}/{company}")
async def update_template(industry: str, company: str, template: Dict):
    global INDUSTRY_TEMPLATES_CACHE
    print("=== update_template 被调用 ===")
    print(f"industry={industry}, company={company}")
    print(f"模板总数: {len(INDUSTRY_TEMPLATES_CACHE)}")
    for idx, item in enumerate(INDUSTRY_TEMPLATES_CACHE):
        print(f"模板[{idx}]: industry='{item.get('industry')}', company='{item.get('company')}'")
    found = False
    for idx, item in enumerate(INDUSTRY_TEMPLATES_CACHE):
        if item["industry"] == industry and item["company"] == company:
            print(f"找到匹配项: idx={idx}")
            INDUSTRY_TEMPLATES_CACHE[idx] = template
            found = True
            break
    if not found:
        print("未找到对应模板，返回404")
        raise HTTPException(status_code=404, detail="未找到对应模板")
    save_templates(INDUSTRY_TEMPLATES_CACHE)
    print("保存成功，返回success")
    return {"success": True}

# 删除行业模板
@app.delete("/api/industry_templates/{industry}/{company}")
async def delete_template(industry: str, company: str):
    global INDUSTRY_TEMPLATES_CACHE
    new_templates = [item for item in INDUSTRY_TEMPLATES_CACHE if not (item["industry"] == industry and item["company"] == company)]
    if len(new_templates) == len(INDUSTRY_TEMPLATES_CACHE):
        raise HTTPException(status_code=404, detail="未找到对应模板")
    INDUSTRY_TEMPLATES_CACHE = new_templates
    save_templates(INDUSTRY_TEMPLATES_CACHE)
    return {"success": True}

# 新增：只获取已启用的能力模型，用于下拉框选择
@app.get("/api/enabled_capability_models")
async def get_enabled_capability_models():
    enabled_models = [
        model for model in INDUSTRY_TEMPLATES_CACHE if model.get("enabled", False)
    ]
    return {"success": True, "data": enabled_models}

# 新增：用于重新加载配置的API，方便调试和动态更新
@app.post("/api/reload-configs")
async def reload_configs():
    try:
        load_industry_templates_to_cache()
        # 未来也可以在这里增加重载其他配置的逻辑
        return {"success": True, "message": "配置已重新加载"}
    except Exception as e:
        return {"success": False, "message": f"重新加载失败: {str(e)}"} 
