import json
import os
from datetime import datetime
from typing import List, Dict

HISTORY_FILE = os.path.join(os.path.dirname(__file__), 'history.json')

def save_history(record: Dict):
    """保存分析记录到本地JSON文件"""
    history = []
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            history = json.load(f)
    record['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    history.append(record)
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

def load_history() -> List[Dict]:
    """查询历史记录"""
    if not os.path.exists(HISTORY_FILE):
        return []
    with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
        return json.load(f) 
