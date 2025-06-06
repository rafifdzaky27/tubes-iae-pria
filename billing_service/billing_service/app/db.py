from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment variable or use default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/billing_service")

# Create SQLAlchemy engine with connection pool settings
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Enable connection health checks
    pool_recycle=3600,   # Recycle connections after 1 hour
    connect_args={"connect_timeout": 30}  # Set connection timeout to 30 seconds
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Function to wait for database to be ready
def wait_for_db(max_retries=30, retry_interval=2):
    retries = 0
    while retries < max_retries:
        try:
            # Try to connect to the database
            connection = engine.connect()
            connection.close()
            print("Database connection successful")
            return True
        except Exception as e:
            retries += 1
            print(f"Database connection attempt {retries}/{max_retries} failed: {e}")
            if retries >= max_retries:
                print("Max retries reached. Could not connect to the database.")
                return False
            time.sleep(retry_interval)
    return False

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
