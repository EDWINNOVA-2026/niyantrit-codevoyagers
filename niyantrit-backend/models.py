from sqlalchemy import Column, Integer, String
from database import Base

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    file = Column(String)