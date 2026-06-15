import sqlite3
import uuid
import os

def run_migration():
    # Find database file relative to backend root
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, "omniverifyx.db")
    
    if not os.path.exists(db_path):
        # Try local folder if not found
        db_path = "./omniverifyx.db"

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        def add_col_if_missing(table_name, col_name, col_type):
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not cursor.fetchone():
                return
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [row[1] for row in cursor.fetchall()]
            if col_name not in columns:
                print(f"Adding {col_name} ({col_type}) column to {table_name} table...")
                try:
                    cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
                    conn.commit()
                except Exception as ex:
                    print(f"Failed to add column {col_name} to table {table_name}: {ex}")

        # 1. users table
        add_col_if_missing("users", "candidate_uuid", "TEXT")
        add_col_if_missing("users", "user_id", "TEXT")
        add_col_if_missing("users", "name", "TEXT")
        add_col_if_missing("users", "email", "TEXT")
        add_col_if_missing("users", "role", "TEXT")
        add_col_if_missing("users", "voice_path", "TEXT")
        add_col_if_missing("users", "category", "TEXT")
        add_col_if_missing("users", "annual_income", "REAL")
        add_col_if_missing("users", "uploaded_documents", "TEXT")
        add_col_if_missing("users", "document_verification_status", "TEXT")
        add_col_if_missing("users", "candidate_aadhaar_number", "TEXT")
        add_col_if_missing("users", "date_of_birth", "TEXT")
        add_col_if_missing("users", "mobile_number", "TEXT")

        # 2. hall_tickets table
        add_col_if_missing("hall_tickets", "hall_ticket_number", "TEXT")
        add_col_if_missing("hall_tickets", "candidate_uuid", "TEXT")
        add_col_if_missing("hall_tickets", "user_id", "TEXT")
        add_col_if_missing("hall_tickets", "exam_id", "TEXT")
        add_col_if_missing("hall_tickets", "candidate_name", "TEXT")
        add_col_if_missing("hall_tickets", "candidate_email", "TEXT")
        add_col_if_missing("hall_tickets", "exam_name", "TEXT")
        add_col_if_missing("hall_tickets", "exam_date", "TEXT")
        add_col_if_missing("hall_tickets", "start_time", "TEXT")
        add_col_if_missing("hall_tickets", "duration_minutes", "INTEGER")
        add_col_if_missing("hall_tickets", "status", "TEXT")
        add_col_if_missing("hall_tickets", "generated_at", "TEXT")

        # 3. exam_sessions table
        add_col_if_missing("exam_sessions", "session_id", "TEXT")
        add_col_if_missing("exam_sessions", "user_id", "TEXT")
        add_col_if_missing("exam_sessions", "candidate_uuid", "TEXT")
        add_col_if_missing("exam_sessions", "hall_ticket_number", "TEXT")
        add_col_if_missing("exam_sessions", "exam_id", "TEXT")
        add_col_if_missing("exam_sessions", "login_time", "TEXT")
        add_col_if_missing("exam_sessions", "logout_time", "TEXT")
        add_col_if_missing("exam_sessions", "duration_seconds", "INTEGER")
        add_col_if_missing("exam_sessions", "verification_status", "TEXT")
        add_col_if_missing("exam_sessions", "face_similarity", "REAL")
        add_col_if_missing("exam_sessions", "voice_similarity", "REAL")
        add_col_if_missing("exam_sessions", "blink_count", "INTEGER")
        add_col_if_missing("exam_sessions", "exam_status", "TEXT")
        add_col_if_missing("exam_sessions", "score", "INTEGER")
        add_col_if_missing("exam_sessions", "total_questions", "INTEGER")
        add_col_if_missing("exam_sessions", "percentage", "REAL")
        add_col_if_missing("exam_sessions", "pass_status", "TEXT")
        add_col_if_missing("exam_sessions", "risk_score", "INTEGER")

        # 4. exam_questions table
        add_col_if_missing("exam_questions", "exam_id", "TEXT")
        add_col_if_missing("exam_questions", "question_text", "TEXT")
        add_col_if_missing("exam_questions", "option_a", "TEXT")
        add_col_if_missing("exam_questions", "option_b", "TEXT")
        add_col_if_missing("exam_questions", "option_c", "TEXT")
        add_col_if_missing("exam_questions", "option_d", "TEXT")
        add_col_if_missing("exam_questions", "correct_answer", "TEXT")
        add_col_if_missing("exam_questions", "marks", "INTEGER")
        add_col_if_missing("exam_questions", "created_at", "TEXT")

        # 5. exam_answers table
        add_col_if_missing("exam_answers", "session_id", "TEXT")
        add_col_if_missing("exam_answers", "question_id", "INTEGER")
        add_col_if_missing("exam_answers", "selected_answer", "TEXT")
        add_col_if_missing("exam_answers", "is_correct", "BOOLEAN")
        add_col_if_missing("exam_answers", "marks_awarded", "INTEGER")
        add_col_if_missing("exam_answers", "submitted_at", "TEXT")

        # 6. proctoring_logs table
        add_col_if_missing("proctoring_logs", "session_id", "TEXT")
        add_col_if_missing("proctoring_logs", "user_id", "TEXT")
        add_col_if_missing("proctoring_logs", "violation_type", "TEXT")
        add_col_if_missing("proctoring_logs", "severity", "TEXT")
        add_col_if_missing("proctoring_logs", "timestamp", "TEXT")

        # 7. candidate_documents table
        add_col_if_missing("candidate_documents", "user_id", "TEXT")
        add_col_if_missing("candidate_documents", "extracted_aadhaar_number", "TEXT")
        add_col_if_missing("candidate_documents", "name_match_score", "REAL")
        add_col_if_missing("candidate_documents", "aadhaar_match", "TEXT")
        add_col_if_missing("candidate_documents", "verification_status", "TEXT")
        add_col_if_missing("candidate_documents", "extracted_dob", "TEXT")
        add_col_if_missing("candidate_documents", "dob_match", "TEXT")
        add_col_if_missing("candidate_documents", "caste_extracted_name", "TEXT")
        add_col_if_missing("candidate_documents", "caste_extracted_category", "TEXT")
        add_col_if_missing("candidate_documents", "caste_extracted_cert_number", "TEXT")
        add_col_if_missing("candidate_documents", "caste_name_match_score", "REAL")
        add_col_if_missing("candidate_documents", "caste_category_match", "TEXT")
        add_col_if_missing("candidate_documents", "caste_verification_status", "TEXT")
        add_col_if_missing("candidate_documents", "income_extracted_name", "TEXT")
        add_col_if_missing("candidate_documents", "income_extracted_amount", "REAL")
        add_col_if_missing("candidate_documents", "income_name_match_score", "REAL")
        add_col_if_missing("candidate_documents", "income_amount_match", "TEXT")
        add_col_if_missing("candidate_documents", "income_verification_status", "TEXT")

        # Backfill uuid fields
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if cursor.fetchone():
            cursor.execute("SELECT id FROM users WHERE candidate_uuid IS NULL OR candidate_uuid = ''")
            users_to_backfill_uuid = cursor.fetchall()
            if users_to_backfill_uuid:
                print(f"Backfilling candidate_uuid for {len(users_to_backfill_uuid)} users...")
                for user in users_to_backfill_uuid:
                    new_uuid = str(uuid.uuid4())
                    cursor.execute("UPDATE users SET candidate_uuid = ? WHERE id = ?", (new_uuid, user[0]))
                conn.commit()

        print("Migration run_migration completed successfully.")
    except Exception as e:
        print(f"Error running migration: {e}")
    finally:
        conn.close()
