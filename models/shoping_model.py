
from sqlalchemy import Column, Integer, String, ForeignKey, Text, Boolean, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
Base = declarative_base()

class ShoppingHistory(Base):
    __tablename__ = "shopping_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(Text, nullable=False, unique=True)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)

    product_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    quantity = Column(Integer, default=1)
    price_per_unit = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=True)  
    status = Column(String(50), default="completed")    
    delivery_address = Column(Text, nullable=True)
    delivery_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
