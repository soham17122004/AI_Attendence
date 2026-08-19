from pydantic import BaseModel
from typing import Optional


class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True  