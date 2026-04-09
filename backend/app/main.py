from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from logging.handlers import RotatingFileHandler
import os
from .api import endpoints

# Cấu hình Logging Rotating cho Production (Chat + Errors)
LOG_DIR = os.path.join(os.path.dirname(__file__), "../logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

log_formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log_file = os.path.join(LOG_DIR, "activity.log")

# Xoay vòng log: tối đa 5MB mỗi file, giữ tối đa 5 files
file_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=5, encoding='utf-8')
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)

logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)
logger.addHandler(console_handler)

app = FastAPI(title="AI Research Nexus - Agentic Edition", version="2.0.0")

# Security: Ràng buộc CORS bằng biến môi trường
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    logger.info("Health check ping received.")
    return {"status": "ok", "version": "2.0.0-agentic"}
