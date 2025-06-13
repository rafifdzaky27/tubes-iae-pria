from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
from sqlalchemy import inspect
from .db import engine, Base, get_db, wait_for_db
from .models import Room
from .schema_simple import graphql_router
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Create FastAPI app
app = FastAPI(title="Room Management Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include GraphQL router
app.include_router(graphql_router, prefix="/graphql")

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "room_management"}

# Startup event to initialize database and add sample data
@app.on_event("startup")
async def startup_event():
    # Wait for database to be ready
    print("Waiting for database to be ready...")
    if wait_for_db():
        print("Creating database tables...")
        try:
            # Create database tables
            Base.metadata.create_all(bind=engine)
            print("Database tables created successfully")
            
            # Verify tables were created
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            print(f"Tables after creation: {tables}")
            
            # Add sample data
            print("Adding sample data...")
            db = next(get_db())
            try:
                # Check if there are already rooms in the database
                room_count = db.query(Room).count()
                print(f"Current room count: {room_count}")
                
                if room_count == 0:
                    # Add some sample rooms
                    print("No rooms found, adding sample data...")
                    sample_rooms = [
                        Room(room_number="101", room_type="Standard", price_per_night=100.00, status="available"),
                        Room(room_number="102", room_type="Standard", price_per_night=100.00, status="available"),
                        Room(room_number="201", room_type="Deluxe", price_per_night=150.00, status="available"),
                        Room(room_number="301", room_type="Suite", price_per_night=250.00, status="maintenance"),
                    ]
                    db.add_all(sample_rooms)
                    db.commit()
                    print("Sample data added successfully")
            except Exception as e:
                print(f"Error adding sample data: {e}")
                # Print the full exception traceback for debugging
                import traceback
                traceback.print_exc()
            finally:
                db.close()
        except Exception as e:
            print(f"Error creating database tables: {e}")
            # Print the full exception traceback for debugging
            import traceback
            traceback.print_exc()
    else:
        print("Failed to connect to database. Service may not function correctly.")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
