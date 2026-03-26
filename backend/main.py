from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import requests
import random

from database import engine, Base, SessionLocal
import models
import schemas

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


class SendMessageRequest(BaseModel):
    group_id: int
    peer_id: int
    text: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def fetch_vk_group_info(vk_group_id: str, access_token: str):
    url = "https://api.vk.com/method/groups.getById"
    params = {
        "group_id": vk_group_id,
        "access_token": access_token,
        "v": "5.131",
    }

    response = requests.get(url, params=params, timeout=15)
    response.raise_for_status()
    data = response.json()

    if "error" in data:
        error_msg = data["error"].get("error_msg", "Ошибка VK API")
        raise HTTPException(status_code=400, detail=f"VK API: {error_msg}")

    groups = data.get("response", [])
    if not groups:
        raise HTTPException(status_code=400, detail="VK API не вернул данные группы")

    return groups[0]


@app.get("/")
def read_root():
    return {"status": "ok"}


@app.post("/groups", response_model=schemas.GroupOut)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    existing_group = (
        db.query(models.Group)
        .filter(models.Group.vk_group_id == group.vk_group_id)
        .first()
    )
    if existing_group:
        raise HTTPException(status_code=400, detail="Группа с таким vk_group_id уже есть")

    vk_group = fetch_vk_group_info(group.vk_group_id, group.access_token)
    real_name = vk_group.get("name", group.name)

    db_group = models.Group(
        name=real_name,
        vk_group_id=group.vk_group_id,
        access_token=group.access_token,
        user_access_token=group.user_access_token,
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group


@app.get("/groups", response_model=list[schemas.GroupOut])
def get_groups(db: Session = Depends(get_db)):
    return db.query(models.Group).all()


@app.get("/groups/{group_id}", response_model=schemas.GroupOut)
def get_group(group_id: int, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    return group


@app.put("/groups/{group_id}", response_model=schemas.GroupOut)
def update_group(group_id: int, group_data: schemas.GroupUpdate, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")

    existing_group = (
        db.query(models.Group)
        .filter(
            models.Group.vk_group_id == group_data.vk_group_id,
            models.Group.id != group_id
        )
        .first()
    )
    if existing_group:
        raise HTTPException(status_code=400, detail="Группа с таким vk_group_id уже есть")

    vk_group = fetch_vk_group_info(group_data.vk_group_id, group_data.access_token)
    real_name = vk_group.get("name", group_data.name)

    group.name = real_name
    group.vk_group_id = group_data.vk_group_id
    group.access_token = group_data.access_token
    group.user_access_token = group_data.user_access_token

    db.commit()
    db.refresh(group)
    return group


@app.delete("/groups/{group_id}")
def delete_group(group_id: int, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")

    db.query(models.Message).filter(models.Message.group_id == group_id).delete()
    db.delete(group)
    db.commit()
    return {"message": "Группа удалена"}


@app.get("/vk/check/{group_id}")
def check_vk(group_id: int, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()

    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")

    try:
        vk_group = fetch_vk_group_info(group.vk_group_id, group.access_token)
        return {"response": [vk_group]}
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Ошибка запроса к VK: {str(e)}")


def get_video_player(video_owner_id, video_id, access_key, user_access_token):
    url = "https://api.vk.com/method/video.get"
    videos_value = f"{video_owner_id}_{video_id}"
    if access_key:
        videos_value += f"_{access_key}"

    params = {
        "videos": videos_value,
        "access_token": user_access_token,
        "v": "5.131",
    }

    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        if "error" in data:
            return None

        items = data.get("response", {}).get("items", [])
        if not items:
            return None

        return items[0].get("player")
    except requests.RequestException:
        return None


@app.get("/vk/posts/{group_id}")
def get_vk_posts(group_id: int, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()

    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")

    url = "https://api.vk.com/method/wall.get"
    params = {
        "owner_id": f"-{group.vk_group_id}",
        "count": 5,
        "access_token": group.user_access_token,
        "v": "5.131",
    }

    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        if "error" in data:
            return data

        posts = []

        for item in data["response"]["items"]:
            attachments = []

            for att in item.get("attachments", []):
                if att["type"] == "photo":
                    photo = att["photo"]
                    sizes = photo.get("sizes", [])
                    if sizes:
                        attachments.append({
                            "type": "photo",
                            "url": sizes[-1]["url"]
                        })

                elif att["type"] == "video":
                    video = att["video"]

                    video_owner_id = video.get("owner_id")
                    video_id = video.get("id")
                    access_key = video.get("access_key")

                    player = get_video_player(
                        video_owner_id=video_owner_id,
                        video_id=video_id,
                        access_key=access_key,
                        user_access_token=group.user_access_token,
                    )

                    vk_video_url = None
                    if video_owner_id is not None and video_id is not None:
                        vk_video_url = f"https://vk.com/video{video_owner_id}_{video_id}"

                    attachments.append({
                        "type": "video",
                        "title": video.get("title"),
                        "player": player,
                        "vk_url": vk_video_url,
                    })

                elif att["type"] == "audio":
                    audio = att["audio"]
                    attachments.append({
                        "type": "audio",
                        "artist": audio.get("artist"),
                        "title": audio.get("title"),
                    })

            posts.append({
                "id": item["id"],
                "text": item.get("text"),
                "likes": item.get("likes", {}).get("count", 0),
                "comments": item.get("comments", {}).get("count", 0),
                "reposts": item.get("reposts", {}).get("count", 0),
                "attachments": attachments,
            })

        return {"response": {"items": posts}}

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Ошибка запроса к VK: {str(e)}")


@app.get("/messages/{group_id}")
def get_messages(group_id: int, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")

    messages = (
        db.query(models.Message)
        .filter(models.Message.group_id == group_id)
        .order_by(models.Message.id.desc())
        .limit(50)
        .all()
    )

    result = []
    for msg in reversed(messages):
        result.append({
            "id": msg.id,
            "vk_peer_id": msg.vk_peer_id,
            "from_id": msg.from_id,
            "text": msg.text,
            "direction": msg.direction,
        })

    return {"items": result}


@app.post("/messages/send")
def send_message(payload: SendMessageRequest, db: Session = Depends(get_db)):
    group = db.query(models.Group).filter(models.Group.id == payload.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")

    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Текст сообщения пустой")

    url = "https://api.vk.com/method/messages.send"
    params = {
        "peer_id": payload.peer_id,
        "message": text,
        "random_id": random.randint(1, 2147483647),
        "access_token": group.access_token,
        "v": "5.131",
    }

    try:
        response = requests.post(url, data=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        if "error" in data:
            error_msg = data["error"].get("error_msg", "Ошибка VK API")
            raise HTTPException(status_code=400, detail=f"VK API: {error_msg}")

        # ВАЖНО:
        # здесь больше НЕ сохраняем сообщение в БД.
        # его сохранит message_poller.py через событие message_reply

        return {"status": "ok", "vk_response": data}

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Ошибка запроса к VK: {str(e)}")