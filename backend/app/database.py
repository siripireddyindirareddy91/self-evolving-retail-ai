"""Relational persistence shared by the local and cloud runtimes."""
import os
import uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine, String, DateTime, JSON, ForeignKey, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


def uid(): return str(uuid.uuid4())
def now(): return datetime.now(timezone.utc).isoformat()

DB_URL = os.getenv('DATABASE_URL') or ('sqlite:////tmp/retailmind.db' if os.getenv('VERCEL') else 'sqlite:///./retailmind.db')
if DB_URL.startswith('postgres://'): DB_URL = DB_URL.replace('postgres://', 'postgresql+psycopg://', 1)
if DB_URL.startswith('postgresql://'): DB_URL = DB_URL.replace('postgresql://', 'postgresql+psycopg://', 1)
engine = create_engine(DB_URL, connect_args={'check_same_thread': False} if DB_URL.startswith('sqlite') else {}, pool_pre_ping=True)
Session = sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase): pass

class Dataset(Base):
    __tablename__ = 'datasets'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner: Mapped[str] = mapped_column(String(80), index=True)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[str] = mapped_column(String(40), default=now)
    payload: Mapped[dict] = mapped_column(JSON)

class Episode(Base):
    __tablename__ = 'episodic_memories'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner: Mapped[str] = mapped_column(String(80), index=True)
    category: Mapped[str] = mapped_column(String(40), index=True)
    created_at: Mapped[str] = mapped_column(String(40), default=now)
    payload: Mapped[dict] = mapped_column(JSON)

class Reflection(Base):
    __tablename__ = 'reflection_records'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    episode_id: Mapped[str] = mapped_column(ForeignKey('episodic_memories.id'), index=True)
    owner: Mapped[str] = mapped_column(String(80), index=True)
    payload: Mapped[dict] = mapped_column(JSON)

class Setting(Base):
    __tablename__ = 'system_settings'
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    owner: Mapped[str] = mapped_column(String(80), index=True)
    payload: Mapped[dict] = mapped_column(JSON)

class ToolExecution(Base):
    __tablename__ = 'tool_executions'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner: Mapped[str] = mapped_column(String(80), index=True)
    tool: Mapped[str] = mapped_column(String(80), index=True)
    created_at: Mapped[str] = mapped_column(String(40), default=now)
    payload: Mapped[dict] = mapped_column(JSON)

Base.metadata.create_all(engine)
