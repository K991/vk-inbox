from pydantic import BaseModel


class GroupCreate(BaseModel):
    name: str
    vk_group_id: str
    access_token: str
    user_access_token: str


class GroupUpdate(BaseModel):
    name: str
    vk_group_id: str
    access_token: str
    user_access_token: str


class GroupOut(BaseModel):
    id: int
    name: str
    vk_group_id: str
    access_token: str
    user_access_token: str

    class Config:
        from_attributes = True