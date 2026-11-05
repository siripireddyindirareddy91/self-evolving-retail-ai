"""Create the version-1 portable core schema against DATABASE_URL."""
from backend.app.database import Base, engine
if __name__ == '__main__':
    Base.metadata.create_all(engine)
    print('RetailMind core schema is ready.')
