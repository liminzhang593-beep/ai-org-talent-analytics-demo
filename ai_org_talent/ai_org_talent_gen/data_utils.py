import csv
import json
from typing import List, Dict

def load_staff_data(file_path: str) -> List[Dict]:
    """
    读取员工数据文件，支持CSV和JSON格式。
    返回员工数据列表。
    """
    if file_path.endswith('.csv'):
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            data = [row for row in reader]
    elif file_path.endswith('.json'):
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        raise ValueError('仅支持CSV或JSON格式的数据文件')
    return data 