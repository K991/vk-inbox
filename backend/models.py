from sqlalchemy import Column, Integer, String, Text
from database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    vk_group_id = Column(String, unique=True, index=True)
    access_token = Column(String)
    user_access_token = Column(String)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, index=True)          # локальный id группы в нашей БД
    vk_peer_id = Column(Integer, index=True)        # peer_id из VK
    from_id = Column(Integer, index=True)           # кто отправил
    text = Column(Text)
    direction = Column(String, default="in")        # in / out