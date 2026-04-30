# Amen Bank - Launch Guide

Start the 3 services in this order: **MySQL -> Backend -> Chatbot -> Frontend**.

---

## 0. Prerequisites (check once)

```bash
# XAMPP MySQL must be running on port 3306
#   Open XAMPP Control Panel -> Start MySQL

# Check installed tools
java -version          # Java 17+
mvn -version           # Maven 3.8+
node -v                # Node 20+
npm -v
python --version       # Python 3.10+
ollama --version       # Ollama installed
```

---

## 1. Backend (Spring Boot on http://localhost:8080)

```bash
cd "c:/xampp/htdocs/project/Amen Bank/backend"
mvn clean spring-boot:run
```

Alternative (skip tests for faster rebuild):
```bash
mvn spring-boot:run -DskipTests
```

Wait until you see: `Started AmenBankApplication in X seconds`.

---

## 2. Chatbot (FastAPI on https://localhost:8000)

### Easiest way - double-click or run the .bat

```bash
cd "c:/xampp/htdocs/project/Amen Bank/chatbot"
cmd //c start-chatbot.bat
```

### From PowerShell

```powershell
cd "c:\xampp\htdocs\project\Amen Bank\chatbot"
powershell -ExecutionPolicy Bypass -File start-chatbot.ps1
```

### Manual (if the script fails)

```bash
cd "c:/xampp/htdocs/project/Amen Bank/chatbot"

# 1. Start Ollama in its own terminal (keep it running)
ollama serve

# 2. In another terminal, pull the model (only first time)
ollama pull llama3.2:1b

# 3. Create venv + install deps (only first time)
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# 4. Create .env (only first time)
copy .env.example .env

# 5. Run the API
python main.py
```

Wait until you see: `Uvicorn running on https://0.0.0.0:8000`.

---

## 3. Frontend (Angular on https://localhost:4200)

```bash
cd "c:/xampp/htdocs/project/Amen Bank/frontend"
npm install          # only first time
npm start
```

Then open **https://localhost:4200** in your browser.

---

## Stop everything

```bash
# Ctrl+C in each terminal, then (optional):
taskkill /F /IM java.exe        # kill backend
taskkill /F /IM python.exe      # kill chatbot
taskkill /F /IM node.exe        # kill frontend
taskkill /F /IM ollama.exe      # kill ollama
```

---

## Quick health checks

```bash
curl http://localhost:8080/api/auth/health                 # backend
curl -k https://localhost:8000/api/chatbot/health          # chatbot
curl http://localhost:11434/api/tags                       # ollama
```
