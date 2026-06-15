import sqlite3
import os

def run_exam_session_migration():
    # Find database file relative to backend root
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, "omniverifyx.db")
    
    if not os.path.exists(db_path):
        # Try local folder if not found
        db_path = "./omniverifyx.db"

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if exam_sessions table exists first
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='exam_sessions'")
        table_exists = cursor.fetchone()
        if not table_exists:
            print("exam_sessions table does not exist yet. Skipping database alteration.")
            return

        # Check existing columns
        cursor.execute("PRAGMA table_info(exam_sessions)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # 1. candidate_uuid migration
        if "candidate_uuid" not in columns:
            print("Adding candidate_uuid column to exam_sessions table...")
            cursor.execute("ALTER TABLE exam_sessions ADD COLUMN candidate_uuid TEXT")
            conn.commit()

        # 2. hall_ticket_number migration
        if "hall_ticket_number" not in columns:
            print("Adding hall_ticket_number column to exam_sessions table...")
            cursor.execute("ALTER TABLE exam_sessions ADD COLUMN hall_ticket_number TEXT")
            conn.commit()

        # 3. exam_id migration
        if "exam_id" not in columns:
            print("Adding exam_id column to exam_sessions table...")
            cursor.execute("ALTER TABLE exam_sessions ADD COLUMN exam_id TEXT")
            conn.commit()

        print("Migration add_exam_session_columns completed successfully.")
    except Exception as e:
        print(f"Error running exam session migration: {e}")
    finally:
        conn.close()
