# app/main.py
from fastapi import FastAPI
from app.routers import tenants, appointments, services, auth, users
from app.database import Base, engine
from app.models import tenant, user, service, appointment
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)
app = FastAPI()

origins = [
    "http://localhost", # Allow base localhost
    "http://localhost:3000",
    "http://*localhost:3000", # Allow all localhost ports
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this to specific origins for security
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

app.include_router(tenants)
app.include_router(users)
app.include_router(appointments)
app.include_router(services)
app.include_router(auth)

@app.get("/")
def root():
    return {"message": "API is up and running"}
  
