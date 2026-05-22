"""코드/SQL 실행 검증기 — AI 생성 문제의 정답을 실제 컴파일/실행으로 검증.

지원 언어: C (gcc), Java (javac/java), Python, SQL (MySQL)
보안: subprocess에 timeout 적용, 신뢰된 AI 코드만 실행
SQL: 임시 DB 생성 → 실행 → 결과 비교 → DB 삭제
"""
import logging
import os
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

# gcc 경로 (winget 설치 위치)
_GCC_PATHS = [
    "gcc",  # PATH에 있으면 바로 사용
    str(Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
        / "BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe"
        / "mingw64/bin/gcc.exe"),
]

_PYTHON_PATHS = [
    str(Path.home() / "AppData/Local/Programs/Python/Python311/python.exe"),
    "python",
]

_TIMEOUT = 5  # 초


def _find_executable(candidates: list[str]) -> str | None:
    for path in candidates:
        try:
            subprocess.run([path, "--version"], capture_output=True, timeout=3)
            return path
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            continue
    return None


def _run_c(code: str) -> dict:
    """C 코드 컴파일 + 실행."""
    gcc = _find_executable(_GCC_PATHS)
    if not gcc:
        return {"success": False, "error": "gcc not found"}

    with tempfile.TemporaryDirectory() as tmpdir:
        src = Path(tmpdir) / "main.c"
        exe = Path(tmpdir) / "main.exe"
        src.write_text(code, encoding="utf-8")

        # 컴파일
        comp = subprocess.run(
            [gcc, str(src), "-o", str(exe), "-lm"],
            capture_output=True, text=True, timeout=_TIMEOUT,
        )
        if comp.returncode != 0:
            return {"success": False, "error": f"compile error: {comp.stderr[:300]}"}

        # 실행
        run = subprocess.run(
            [str(exe)],
            capture_output=True, text=True, timeout=_TIMEOUT,
            cwd=tmpdir,
        )
        if run.returncode != 0:
            return {"success": False, "error": f"runtime error: {run.stderr[:300]}"}

        return {"success": True, "stdout": run.stdout}


def _run_python(code: str) -> dict:
    """Python 코드 실행."""
    python = _find_executable(_PYTHON_PATHS)
    if not python:
        return {"success": False, "error": "python not found"}

    with tempfile.TemporaryDirectory() as tmpdir:
        src = Path(tmpdir) / "main.py"
        src.write_text(code, encoding="utf-8")

        run = subprocess.run(
            [python, str(src)],
            capture_output=True, text=True, timeout=_TIMEOUT,
            cwd=tmpdir,
        )
        if run.returncode != 0:
            return {"success": False, "error": f"runtime error: {run.stderr[:300]}"}

        return {"success": True, "stdout": run.stdout}


def _run_java(code: str) -> dict:
    """Java 코드 컴파일 + 실행."""
    javac = _find_executable(["javac"])
    java = _find_executable(["java"])
    if not javac or not java:
        return {"success": False, "error": "javac/java not found"}

    import re

    # main 메서드가 있는 클래스를 찾아서 실행 대상으로 설정
    all_classes = re.findall(r'(?:public\s+)?class\s+(\w+)', code)
    if not all_classes:
        return {"success": False, "error": "no class found in Java code"}

    # main() 선언 직전의 가장 가까운 class 선언을 찾음
    main_pos = None
    for m in re.finditer(r'public\s+static\s+void\s+main', code):
        main_pos = m.start()
        break

    main_class = all_classes[-1]  # fallback: 마지막 클래스
    if main_pos is not None:
        # main 위치보다 앞에 있는 class 선언 중 가장 가까운 것
        for m in re.finditer(r'(?:public\s+)?class\s+(\w+)', code):
            if m.start() <= main_pos:
                main_class = m.group(1)

    # 파일명 결정:
    # - public class가 있으면 그 이름으로 (Java 규칙)
    # - 없으면 main이 있는 클래스명으로
    public_class = re.search(r'public\s+class\s+(\w+)', code)
    filename = (public_class.group(1) if public_class else main_class) + ".java"

    with tempfile.TemporaryDirectory() as tmpdir:
        src = Path(tmpdir) / filename
        src.write_text(code, encoding="utf-8")

        # 컴파일
        comp = subprocess.run(
            [javac, str(src)],
            capture_output=True, text=True, timeout=_TIMEOUT,
            cwd=tmpdir,
        )
        if comp.returncode != 0:
            return {"success": False, "error": f"compile error: {comp.stderr[:300]}"}

        # 실행 (main이 있는 클래스를 실행)
        run = subprocess.run(
            [java, "-cp", tmpdir, main_class],
            capture_output=True, text=True, timeout=_TIMEOUT,
            cwd=tmpdir,
        )
        if run.returncode != 0:
            return {"success": False, "error": f"runtime error: {run.stderr[:300]}"}

        return {"success": True, "stdout": run.stdout}


_MYSQL_PATHS = [
    "mysql",
    str(Path("C:/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe")),
]

_MYSQL_DB_PREFIX = "cbt_verify_"


def _run_sql(code: str) -> dict:
    """MySQL에서 SQL을 실행하고 결과를 반환.

    AI가 생성한 SQL은 보통:
      - CREATE TABLE + INSERT (테이블 셋업)
      - SELECT 쿼리 (실제 문제)
    또는:
      - GRANT/REVOKE 등 DCL
    """
    mysql = _find_executable(_MYSQL_PATHS)
    if not mysql:
        return {"success": False, "error": "mysql not found"}

    import uuid
    db_name = f"{_MYSQL_DB_PREFIX}{uuid.uuid4().hex[:8]}"

    try:
        # 1. 임시 DB 생성 (UTF-8)
        setup = subprocess.run(
            [mysql, "-u", "root", "-e",
             f"CREATE DATABASE `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"],
            capture_output=True, text=True, timeout=_TIMEOUT,
        )
        if setup.returncode != 0:
            return {"success": False, "error": f"DB creation failed: {setup.stderr[:300]}"}

        # 2. SQL 실행 (USE db; + 유저 코드)
        full_sql = f"USE `{db_name}`;\n{code}"
        run = subprocess.run(
            [mysql, "-u", "root", "--default-character-set=utf8mb4", "-N"],
            input=full_sql.encode("utf-8"),
            capture_output=True, timeout=_TIMEOUT,
        )
        run.stdout = run.stdout.decode("utf-8", errors="replace")
        run.stderr = run.stderr.decode("utf-8", errors="replace")

        # 3. 결과 수집 (에러가 있어도 stdout은 캡처)
        stdout = run.stdout.strip()
        stderr = run.stderr.strip()

        if run.returncode != 0:
            return {"success": False, "error": f"SQL error: {stderr[:300]}"}

        # MySQL -N 옵션: 컬럼 헤더 없이 값만 출력
        # 탭 구분을 공백으로, 여러 행은 줄바꿈으로
        result_lines = []
        for line in stdout.split("\n"):
            cleaned = line.replace("\t", " ").strip()
            if cleaned:
                result_lines.append(cleaned)

        return {"success": True, "stdout": "\n".join(result_lines)}

    finally:
        # 4. 임시 DB 삭제 (항상 실행)
        try:
            subprocess.run(
                [mysql, "-u", "root", "-e", f"DROP DATABASE IF EXISTS `{db_name}`;"],
                capture_output=True, timeout=_TIMEOUT,
            )
        except Exception:
            pass


def execute_code(code: str, language: str) -> dict:
    """코드를 실행하고 결과를 반환.

    Returns:
        {"success": True, "stdout": "..."} 또는
        {"success": False, "error": "..."}
    """
    lang = language.lower().strip()
    try:
        if lang == "c":
            return _run_c(code)
        elif lang == "python":
            return _run_python(code)
        elif lang == "java":
            return _run_java(code)
        elif lang == "sql":
            return _run_sql(code)
        else:
            return {"success": False, "error": f"unsupported language: {language}"}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "execution timeout (5s)"}
    except Exception as e:  # noqa: BLE001
        logger.warning("code execution failed: %s", e)
        return {"success": False, "error": str(e)[:200]}


def verify_answer(code: str, language: str, expected_answer: str) -> dict:
    """코드를 실행하고 expected_answer와 비교.

    Returns:
        {"verified": True} 또는
        {"verified": False, "actual_output": "...", "expected": "..."}
    """
    result = execute_code(code, language)

    if not result["success"]:
        # 컴파일/실행 실패 → AI에게 에러를 알려줌
        return {
            "verified": False,
            "actual_output": "",
            "expected": expected_answer,
            "error": result["error"],
        }

    actual = result["stdout"].strip()
    expected = expected_answer.strip()

    if actual == expected:
        return {"verified": True}

    return {
        "verified": False,
        "actual_output": actual,
        "expected": expected,
    }
