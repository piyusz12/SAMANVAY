from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlalchemy.orm import Session

ModelType = TypeVar("ModelType")

class BaseRepository(Generic[ModelType]):
    """Generic repository providing standard data access operations."""

    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get_by_id(self, id: Any) -> Optional[ModelType]:
        return self.db.query(self.model).filter(self.model.id == id).first()

    def list_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        return self.db.query(self.model).offset(skip).limit(limit).all()

    def count(self) -> int:
        return self.db.query(self.model).count()

    def create(self, instance: ModelType) -> ModelType:
        self.db.add(instance)
        self.db.flush()
        return instance

    def delete(self, instance: ModelType) -> None:
        self.db.delete(instance)
        self.db.flush()
