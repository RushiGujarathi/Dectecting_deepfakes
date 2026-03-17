import motor.motor_asyncio
import os

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "deepshield")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def create_indexes():
    """Create MongoDB indexes for performance"""
    await db.analyses.create_index("created_at")
    await db.analyses.create_index("verdict")
    await db.analyses.create_index("media_type")
    await db.analyses.create_index("confidence")
    print("✅ MongoDB indexes created")
