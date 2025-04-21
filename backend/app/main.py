# app/main.py
from fastapi import FastAPI
from app.routers import auth, tenants, appointments
from app.database import Base, engine
from app.models import tenant, user, service, appointment

Base.metadata.create_all(bind=engine)
app = FastAPI()



app.include_router(auth.router)
app.include_router(tenants.router)
app.include_router(appointments.router)

@app.get("/")
def root():
    return {"message": "API is up and running"}
  
