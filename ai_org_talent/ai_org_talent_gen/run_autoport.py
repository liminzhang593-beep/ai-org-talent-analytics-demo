import socket
import subprocess
import sys
sys.path.append("./ai_org_talent/ai_org_talent_gen")
from ai_org_talent_gen.analyze_utils import INDUSTRY_TEMPLATES as ANALYZE_INDUSTRY_TEMPLATES

def find_free_port(start_port=8000, max_port=8100):
    for port in range(start_port, max_port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) != 0:
                return port
    raise RuntimeError("No free port found in range.")

if __name__ == "__main__":
    port = find_free_port(8000, 8100)
    print(f"自动选择端口：{port}")
    cmd = [
        sys.executable, "-m", "uvicorn",
        "ai_org_talent.ai_org_talent_gen.analyze_utils:app",
        "--host", "0.0.0.0",
        "--port", str(port)
    ]
    subprocess.run(cmd) 