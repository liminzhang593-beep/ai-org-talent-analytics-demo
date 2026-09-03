from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import json
import os
from .utils import load_templates

router = APIRouter()

def load_models():
    return load_templates()

@router.get("/capability-models/enabled")
async def get_enabled_capability_models():
    """只获取已启用的能力模型，支持热更新"""
    models = load_models()
    enabled_models = [m for m in models if m.get("enabled")]
    return {"success": True, "data": enabled_models} 