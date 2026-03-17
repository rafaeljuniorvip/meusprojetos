import psycopg2
from psycopg2.extras import RealDictCursor
from config.settings import DATABASE_URL


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def execute(sql, params=None, fetch=False):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            if fetch:
                result = cur.fetchall()
            else:
                result = None
            conn.commit()
            return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_one(sql, params=None):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            result = cur.fetchone()
            conn.commit()
            return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute_many(sql, params_list):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for params in params_list:
                cur.execute(sql, params)
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
