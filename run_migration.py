import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE = {
    'user': os.getenv('PGUSER', 'postgres'),
    'password': os.getenv('PGPASSWORD', 'postgres'),
    'database': os.getenv('PGDATABASE', 'local_talent'),
    'host': os.getenv('PGHOST', 'localhost'),
    'port': int(os.getenv('PGPORT', 5432)),
}

async def run_migration():
    conn = await asyncpg.connect(
        user=DATABASE['user'],
        password=DATABASE['password'],
        database=DATABASE['database'],
        host=DATABASE['host'],
        port=DATABASE['port'],
    )
    
    # Read and execute migration
    with open('database/migrations/001_create_bookings.sql', 'r') as f:
        sql = f.read()
    
    await conn.execute(sql)
    print('✅ Bookings table created/verified')
    
    await conn.close()

asyncio.run(run_migration())
