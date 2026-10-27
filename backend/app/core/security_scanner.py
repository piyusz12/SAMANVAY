import os
import ast
import re
from typing import List, Dict, Any

class SecurityASTVisitor(ast.NodeVisitor):
    def __init__(self, filename: str):
        self.filename = filename
        self.findings: List[Dict[str, Any]] = []

    def visit_Call(self, node: ast.Call):
        # 1. Detect raw eval / exec
        if isinstance(node.func, ast.Name):
            if node.func.id in ("eval", "exec"):
                self.findings.append({
                    "severity": "CRITICAL",
                    "type": "CODE_INJECTION",
                    "message": f"Dangerous call to {node.func.id}()",
                    "line": node.lineno,
                    "file": self.filename
                })
            elif node.func.id in ("mktemp",):
                self.findings.append({
                    "severity": "MEDIUM",
                    "type": "INSECURE_TEMP_FILE",
                    "message": "Use of insecure tempfile.mktemp()",
                    "line": node.lineno,
                    "file": self.filename
                })

        # 2. Detect os.system / subprocess with shell=True
        if isinstance(node.func, ast.Attribute):
            if node.func.attr == "system" and getattr(node.func.value, "id", None) == "os":
                self.findings.append({
                    "severity": "HIGH",
                    "type": "COMMAND_INJECTION",
                    "message": "Dangerous call to os.system()",
                    "line": node.lineno,
                    "file": self.filename
                })
            elif node.func.attr in ("Popen", "run", "call", "check_output"):
                for kw in node.keywords:
                    if kw.arg == "shell" and getattr(kw.value, "value", None) is True:
                        self.findings.append({
                            "severity": "HIGH",
                            "type": "COMMAND_INJECTION",
                            "message": f"subprocess.{node.func.attr} with shell=True",
                            "line": node.lineno,
                            "file": self.filename
                        })

        # 3. Detect raw SQL string formatting in execute()
        if isinstance(node.func, ast.Attribute) and node.func.attr == "execute":
            if node.args and isinstance(node.args[0], (ast.JoinedStr, ast.BinOp)):
                self.findings.append({
                    "severity": "HIGH",
                    "type": "SQL_INJECTION",
                    "message": "Possible dynamic SQL query formatting in execute()",
                    "line": node.lineno,
                    "file": self.filename
                })

        # 4. Detect weak hash algorithms (md5, sha1 for security)
        if isinstance(node.func, ast.Attribute) and node.func.attr in ("md5", "sha1"):
            if getattr(node.func.value, "id", None) == "hashlib":
                self.findings.append({
                    "severity": "LOW",
                    "type": "WEAK_CRYPTO",
                    "message": f"Use of weak hash function hashlib.{node.func.attr}()",
                    "line": node.lineno,
                    "file": self.filename
                })

        # 5. Detect pickle / yaml unsafe load
        if isinstance(node.func, ast.Attribute):
            if getattr(node.func.value, "id", None) == "pickle" and node.func.attr in ("load", "loads"):
                self.findings.append({
                    "severity": "HIGH",
                    "type": "INSECURE_DESERIALIZATION",
                    "message": "Unsafe pickle.load/loads() detected",
                    "line": node.lineno,
                    "file": self.filename
                })
            elif getattr(node.func.value, "id", None) == "yaml" and node.func.attr == "load":
                has_loader = any(kw.arg == "Loader" for kw in node.keywords)
                if not has_loader:
                    self.findings.append({
                        "severity": "MEDIUM",
                        "type": "UNSAFE_YAML",
                        "message": "yaml.load without safe Loader specified",
                        "line": node.lineno,
                        "file": self.filename
                    })

        self.generic_visit(node)

def scan_python_codebase(root_dir: str) -> List[Dict[str, Any]]:
    """Recursively scans all Python files in root_dir for common AST security issues."""
    all_findings = []
    for root, _, files in os.walk(root_dir):
        if "venv" in root or "__pycache__" in root or ".pytest_cache" in root:
            continue
        for file in files:
            if file.endswith(".py"):
                fpath = os.path.join(root, file)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        code = f.read()
                    tree = ast.parse(code, filename=fpath)
                    visitor = SecurityASTVisitor(fpath)
                    visitor.visit(tree)
                    all_findings.extend(visitor.findings)
                except Exception as e:
                    all_findings.append({
                        "severity": "INFO",
                        "type": "PARSE_ERROR",
                        "message": f"Failed to parse AST: {e}",
                        "file": fpath,
                        "line": 0
                    })
    return all_findings

if __name__ == "__main__":
    app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    print(f"Scanning codebase at {app_dir}...")
    findings = scan_python_codebase(app_dir)
    print(f"Static scan completed. Total findings: {len(findings)}")
    for f in findings:
        print(f"[{f['severity']}] {f['type']} at {os.path.basename(f['file'])}:{f['line']} - {f['message']}")
