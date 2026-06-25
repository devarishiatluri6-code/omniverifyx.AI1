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

        # 8. Add password_hash column
        add_col_if_missing("users", "password_hash", "TEXT")

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

            import bcrypt
            hashed_pw = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')

            # 1. Admin Bootstrap
            cursor.execute("SELECT id FROM users WHERE email = ?", ("admin@omniverifyx.ai",))
            admin_user = cursor.fetchone()
            if not admin_user:
                print("Bootstrapping default admin user (admin@omniverifyx.ai)...")
                new_uuid = str(uuid.uuid4())
                cursor.execute(
                    "INSERT INTO users (candidate_uuid, user_id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)",
                    (new_uuid, "admin_demo", "System Admin", "admin@omniverifyx.ai", "admin", hashed_pw)
                )
            else:
                cursor.execute(
                    "UPDATE users SET role = ?, password_hash = ? WHERE email = ?",
                    ("admin", hashed_pw, "admin@omniverifyx.ai")
                )

            # 2. Candidate Bootstrap
            cursor.execute("SELECT id FROM users WHERE email = ?", ("candidate@omniverifyx.ai",))
            candidate_user = cursor.fetchone()
            if not candidate_user:
                print("Bootstrapping default candidate user (candidate@omniverifyx.ai)...")
                new_uuid = str(uuid.uuid4())
                cursor.execute(
                    "INSERT INTO users (candidate_uuid, user_id, name, email, role, password_hash, category, annual_income, candidate_aadhaar_number, date_of_birth, mobile_number, document_verification_status, uploaded_documents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (new_uuid, "candidate_demo", "Jane Doe", "candidate@omniverifyx.ai", "candidate", hashed_pw, "BC-A", 85000.0, "123456789012", "1998-05-15", "9876543210", "VERIFIED", "Aadhaar,Caste Certificate,Income Certificate")
                )
            else:
                cursor.execute(
                    "UPDATE users SET role = ?, password_hash = ? WHERE email = ?",
                    ("candidate", hashed_pw, "candidate@omniverifyx.ai")
                )

            # 3. Student Bootstrap
            cursor.execute("SELECT id FROM users WHERE email = ?", ("student@omniverifyx.ai",))
            student_user = cursor.fetchone()
            if not student_user:
                print("Bootstrapping default student user (student@omniverifyx.ai)...")
                new_uuid = str(uuid.uuid4())
                cursor.execute(
                    "INSERT INTO users (candidate_uuid, user_id, name, email, role, password_hash, category, annual_income, candidate_aadhaar_number, date_of_birth, mobile_number, document_verification_status, uploaded_documents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (new_uuid, "student_demo", "John Smith", "student@omniverifyx.ai", "student", hashed_pw, "OC", 250000.0, "987654321098", "2000-10-20", "8765432109", "VERIFIED", "Aadhaar")
                )
            else:
                cursor.execute(
                    "UPDATE users SET role = ?, password_hash = ? WHERE email = ?",
                    ("student", hashed_pw, "student@omniverifyx.ai")
                )

            conn.commit()

        print("Migration run_migration completed successfully.")
    except Exception as e:
        print(f"Error running migration: {e}")
    finally:
        conn.close()
