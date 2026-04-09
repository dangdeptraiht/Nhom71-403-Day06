import os
import json
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)

SESSION_DIR = os.path.join(os.path.dirname(__file__), "../../data/sessions")

class SessionManager:
    @staticmethod
    def _get_session_path(session_id: str) -> str:
        return os.path.join(SESSION_DIR, f"{session_id}.json")

    @staticmethod
    def create_session(title: str = "New Research Session") -> str:
        if not os.path.exists(SESSION_DIR):
            os.makedirs(SESSION_DIR)
        
        session_id = str(uuid.uuid4())
        session_data = {
            "id": session_id,
            "title": title,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "messages": [],
            "matrix": []
        }
        
        with open(SessionManager._get_session_path(session_id), "w", encoding="utf-8") as f:
            json.dump(session_data, f, ensure_ascii=False, indent=2)
        
        return session_id

    @staticmethod
    def list_sessions() -> List[Dict[str, Any]]:
        if not os.path.exists(SESSION_DIR):
            return []
        
        sessions = []
        for filename in os.listdir(SESSION_DIR):
            if filename.endswith(".json"):
                try:
                    with open(os.path.join(SESSION_DIR, filename), "r", encoding="utf-8") as f:
                        data = json.load(f)
                        sessions.append({
                            "id": data["id"],
                            "title": data["title"],
                            "updated_at": data["updated_at"]
                        })
                except Exception as e:
                    logger.error(f"Error loading session {filename}: {e}")
        
        # Sort by updated_at desc
        sessions.sort(key=lambda x: x["updated_at"], reverse=True)
        return sessions

    @staticmethod
    def get_session(session_id: str) -> Optional[Dict[str, Any]]:
        path = SessionManager._get_session_path(session_id)
        if not os.path.exists(path):
            return None
        
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def update_session(session_id: str, messages: Optional[List[Dict]] = None, matrix: Optional[List[Dict]] = None):
        path = SessionManager._get_session_path(session_id)
        if not os.path.exists(path):
            return
        
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        if messages is not None:
            data["messages"] = messages
        if matrix is not None:
            data["matrix"] = matrix
            
        data["updated_at"] = datetime.utcnow().isoformat()
        
        # Update title based on first user message if possible and title is default
        if data["title"] == "New Research Session" and messages:
            for msg in messages:
                if msg["role"] == "user":
                    data["title"] = msg["content"][:40] + ("..." if len(msg["content"]) > 40 else "")
                    break

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    @staticmethod
    def add_message(session_id: str, role: str, msg_type: str, content: str = "", extra: Dict = None):
        session = SessionManager.get_session(session_id)
        if not session:
            return
        
        msg = {
            "id": str(uuid.uuid4()),
            "role": role,
            "type": msg_type,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        }
        if extra:
            msg.update(extra)
            
        session["messages"].append(msg)
        SessionManager.update_session(session_id, messages=session["messages"])

    @staticmethod
    def delete_session(session_id: str) -> bool:
        path = SessionManager._get_session_path(session_id)
        if os.path.exists(path):
            try:
                os.remove(path)
                return True
            except Exception as e:
                logger.error(f"Error deleting session {session_id}: {e}")
                return False
        return False

    @staticmethod
    def clear_all_sessions() -> int:
        if not os.path.exists(SESSION_DIR):
            return 0
        
        count = 0
        for filename in os.listdir(SESSION_DIR):
            if filename.endswith(".json"):
                try:
                    os.remove(os.path.join(SESSION_DIR, filename))
                    count += 1
                except Exception as e:
                    logger.error(f"Error removing {filename}: {e}")
        return count
