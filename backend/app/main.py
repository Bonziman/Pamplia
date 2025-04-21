# app/main.py
from fastapi import FastAPI
from app.routers import tenants, appointments, services, auth 
from app.database import Base, engine
from app.models import tenant, user, service, appointment

Base.metadata.create_all(bind=engine)
app = FastAPI()



app.include_router(tenants)
app.include_router(appointments)
app.include_router(services)
app.include_router(auth)

@app.get("/")
def root():
    return {"message": "API is up and running"}
  
