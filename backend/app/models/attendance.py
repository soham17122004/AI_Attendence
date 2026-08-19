from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
    Text
)
from sqlalchemy.sql import func

from app.core.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    employee_id = Column(
        Integer,
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    attendance_date = Column(
        Date,
        nullable=False,
        index=True
    )

    check_in = Column(
        DateTime(timezone=True),
        nullable=True
    )

    check_out = Column(
        DateTime(timezone=True),
        nullable=True
    )

    status = Column(
        String(30),
        nullable=False,
        default="present"
    )

    recognition_method = Column(
        String(50),
        nullable=True
    )

    confidence_score = Column(
        String(20),
        nullable=True
    )

    notes = Column(
        Text,
        nullable=True
    )

    intervals = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )