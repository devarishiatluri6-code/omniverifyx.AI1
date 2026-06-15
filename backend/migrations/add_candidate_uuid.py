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
        # Check if users table exists first
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        table_exists = cursor.fetchone()
        if not table_exists:
            print("Users table does not exist yet. Skipping database alteration.")
            return

        # Check if candidate_uuid column exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "candidate_uuid" not in columns:
            print("Adding candidate_uuid column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN candidate_uuid TEXT")
            conn.commit()

        # Backfill existing users with NULL/empty candidate_uuid
        cursor.execute("SELECT id FROM users WHERE candidate_uuid IS NULL OR candidate_uuid = ''")
        users_to_backfill = cursor.fetchall()
        
        if users_to_backfill:
            print(f"Backfilling candidate_uuid for {len(users_to_backfill)} users...")
            for user in users_to_backfill:
                user_id = user[0]
                new_uuid = str(uuid.uuid4())
                cursor.execute(
                    "UPDATE users SET candidate_uuid = ? WHERE id = ?",
                    (new_uuid, user_id)
                )
            conn.commit()

        print("Migration add_candidate_uuid completed successfully.")
    except Exception as e:
        print(f"Error running migration: {e}")
    finally:
        conn.close()
