import os, json

def load_templates():
    TEMPLATE_FILE = os.path.join(os.path.dirname(__file__), "industry_templates.json")
    print(f"[load_templates] 读取路径: {TEMPLATE_FILE}")
    if not os.path.exists(TEMPLATE_FILE):
        return []
    with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_templates(data):
    TEMPLATE_FILE = os.path.join(os.path.dirname(__file__), "industry_templates.json")
    print(f"[save_templates] 写入路径: {TEMPLATE_FILE}")
    with open(TEMPLATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2) 