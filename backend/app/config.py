from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str  # Automatically maps to DATABASE_URL from .env
    secret_key: str  # Add this line to load the secret key
    environment: str #= os.getenv("ENVIRONMENT", "development") # "development" or "production"
    base_domain: str #= os.getenv("BASE_DOMAIN", "localhost") # Base domain for cookies/redirects
    auth_cookie_name: str = "access_token" # Default cookie name
    
    
    # JWT Settings
    access_token_expire_minutes: int = 60 * 24 * 7  # Default to 7 days, can be overridden in .env
    cookie_domain: str = "localhost"  # Default for dev, GET FROM ENV
    auth_cookie_name: str = "access_token"  # Default cookie name, can be overridden in .env
    # Email Settings
    mail_server: str
    mail_port: int = 587
    mail_username: str
    mail_password: str
    mail_from_address: str
    mail_from_name: str = "Pamplia" # Default name

    # Celery Settings
    celery_broker_url: str 
    celery_result_backend: str
    timezone: str = "UTC"  # Default timezone
    
    #frontend URL
    frontend_url: str = "localtestt.me:3000" # Default for dev, GET FROM ENV
    
    invitation_expiry_hours: int = 48 # Default, GET FROM ENV
    
    model_config = SettingsConfigDict(
        env_file='.env',    # Specify the .env file
        env_file_encoding='utf-8', # Specify encoding
        extra='ignore'      # Allow other env vars without causing errors
                            # Alternatively, keep 'forbid' and only define needed vars
    )
    
settings = Settings()  #  This line makes the instance available for import
