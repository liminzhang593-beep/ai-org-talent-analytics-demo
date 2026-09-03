from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import os, json, requests, uuid

router = APIRouter()

class LLMConfig(BaseModel):
    id: str
    name: str
    type: str
    api_url: str
    api_key: Optional[str] = ""
    enabled: bool = False
    remark: Optional[str] = ""

# 配置文件路径
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "llm_configs.json")

def load_configs():
    if not os.path.exists(CONFIG_FILE):
        return []
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_configs(configs):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(configs, f, ensure_ascii=False, indent=2)

def get_enabled_id(configs):
    for c in configs:
        if c.get('enabled'):
            return c['id']
    return None

@router.get("/llm-configs")
async def get_llm_configs():
    configs = load_configs()
    return {"success": True, "data": configs}

@router.post("/llm-configs")
async def add_llm_config(config: LLMConfig):
    configs = load_configs()
    configs.append(config.dict())
    save_configs(configs)
    return {"success": True}

@router.put("/llm-configs/{id}")
async def update_llm_config(id: str, config: LLMConfig):
    configs = load_configs()
    for i, c in enumerate(configs):
        if c["id"] == id:
            configs[i] = config.dict()
            save_configs(configs)
            return {"success": True}
    raise HTTPException(404, "配置不存在")

@router.delete("/llm-configs/{id}")
async def delete_llm_config(id: str):
    configs = load_configs()
    configs = [c for c in configs if c["id"] != id]
    save_configs(configs)
    return {"success": True}

@router.post("/llm-configs/enable")
def enable_llm_config(data: Dict):
    id = data['id']
    configs = load_configs()
    for c in configs:
        c['enabled'] = (c['id'] == id)
    save_configs(configs)
    return {"success": True}

@router.post("/llm-configs/{id}/test")
async def test_llm_config_by_id(id: str):
    configs = load_configs()
    cfg = None
    for c in configs:
        if c["id"] == id:
            cfg = c
            break
    
    if not cfg:
        raise HTTPException(404, "配置不存在")
    
    return test_llm_config(cfg)

@router.post("/llm-configs/test")
def test_llm_config(cfg: dict):
    try:
        model_type = cfg.get("type", "")
        api_url = cfg.get("api_url", "")
        model_name = cfg.get("name", "")
        api_key = cfg.get("api_key", "")
        headers = {}
        payload = {}
        if model_type == "local":
            # Ollama等本地模型
            payload = {"model": model_name, "prompt": "hello"}
            resp = requests.post(api_url, json=payload, timeout=120)
        else:
            # 云端模型（如deepsseek、qwen、gpt、claude等）
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            headers["Content-Type"] = "application/json"
            payload = {
                "model": model_name,
                "messages": [{"role": "user", "content": "你好"}]
            }
            resp = requests.post(api_url, headers=headers, json=payload, timeout=120)
        return {
            "success": resp.status_code in [200, 400, 401, 403],
            "status": resp.status_code,
            "msg": resp.text[:500]  # 返回部分响应内容，便于前端展示
        }
    except Exception as e:
        return {"success": False, "msg": str(e)} 