from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str  # Automatically maps to DATABASE_URL from .env
    secret_key: str  # Add this line to load the secret key
    environment: str #= os.getenv("ENVIRONMENT", "development") # "development" or "production"
    base_domain: str #= os.getenv("BASE_DOMAIN", "localhost") # Base domain for cookies/redirects
    
    # Email Settings
    mail_server: str
    mail_port: int = 587
    mail_username: str
    mail_password: str
    mail_from_address: str
    mail_from_name: str = "Pamplia" # Default name

    class Config:
        env_file = ".env"

settings = Settings()  #  This line makes the instance available for import
