from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class KioskDevice(Base):
    __tablename__ = "kiosk_devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(100), nullable=False)
    status = Column(String(30), nullable=False, default="online")  # "online" or "offline"
    last_seen = Column(String(50), nullable=True)
    camera_status = Column(String(30), nullable=True, default="Connected")
    engine_status = Column(String(30), nullable=True, default="Active")
    ip = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
