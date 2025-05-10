# app/schemas/pagination.py
# --- NEW FILE ---

from pydantic import BaseModel, Field
from typing import List, TypeVar, Generic

T = TypeVar('T') # Define a generic type variable

class PaginatedResponse(BaseModel, Generic[T]):
    total: int = Field(..., description="Total number of items available")
    page: int = Field(..., description="Current page number")
    limit: int = Field(..., description="Number of items per page")
    items: List[T] = Field(..., description="List of items on the current page")
