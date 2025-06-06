from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
from .db import engine, Base, get_db, wait_for_db
from .models import Guest
from .schema import graphql_router

# Create FastAPI app
app = FastAPI(title="Guest Service")

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
    return {"status": "healthy", "service": "guest_service"}

# Startup event to initialize database and add sample data
@app.on_event("startup")
async def startup_event():
    # Wait for database to be ready
    print("Waiting for database to be ready...")
    if wait_for_db():
        print("Creating database tables...")
        # Create database tables
        Base.metadata.create_all(bind=engine)
        
        # Add sample data
        print("Adding sample data...")
        db = next(get_db())
        try:
            # Check if there are already guests in the database
            if db.query(Guest).count() == 0:
                # Add some sample guests
                sample_guests = [
                    Guest(full_name="John Doe", email="john.doe@example.com", phone="123-456-7890", address="123 Main St, City, Country"),
                    Guest(full_name="Jane Smith", email="jane.smith@example.com", phone="987-654-3210", address="456 Oak Ave, Town, Country"),
                    Guest(full_name="Bob Johnson", email="bob.johnson@example.com", phone="555-123-4567", address="789 Pine Rd, Village, Country"),
                ]
                db.add_all(sample_guests)
                db.commit()
                print("Sample data added successfully")
        except Exception as e:
            print(f"Error adding sample data: {e}")
        finally:
            db.close()
    else:
        print("Failed to connect to database. Service may not function correctly.")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
