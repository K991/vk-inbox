import time
import requests

from database import SessionLocal
import models


API_VERSION = "5.131"


def get_longpoll_server(vk_group_id: str, access_token: str):
    url = "https://api.vk.com/method/groups.getLongPollServer"
    params = {
        "group_id": vk_group_id,
        "access_token": access_token,
        "v": API_VERSION,
    }

    response = requests.get(url, params=params, timeout=15)
    response.raise_for_status()
    data = response.json()

    if "error" in data:
        raise Exception(f"VK API error: {data['error'].get('error_msg')}")

    return data["response"]


def extract_message_from_event(event: dict):
    obj = event.get("object", {})

    # Для message_new обычно данные лежат в object["message"]
    if "message" in obj and isinstance(obj["message"], dict):
        return obj["message"]

    # Для message_reply часто данные лежат сразу в object
    return obj


def message_exists(db, local_group_id: int, peer_id: int, from_id: int, text: str, direction: str):
    return (
        db.query(models.Message)
        .filter(
            models.Message.group_id == local_group_id,
            models.Message.vk_peer_id == peer_id,
            models.Message.from_id == from_id,
            models.Message.text == text,
            models.Message.direction == direction,
        )
        .order_by(models.Message.id.desc())
        .first()
    )


def save_message(local_group_id: int, event: dict, direction: str):
    message = extract_message_from_event(event)

    text = message.get("text", "")
    peer_id = message.get("peer_id")
    from_id = message.get("from_id")

    if peer_id is None:
        print(f"[poller] skip event without peer_id: {event}")
        return

    db = SessionLocal()
    try:
        exists = message_exists(
            db=db,
            local_group_id=local_group_id,
            peer_id=peer_id,
            from_id=from_id,
            text=text,
            direction=direction,
        )

        if exists:
            return

        db_message = models.Message(
            group_id=local_group_id,
            vk_peer_id=peer_id,
            from_id=from_id if from_id is not None else 0,
            text=text,
            direction=direction,
        )
        db.add(db_message)
        db.commit()

        print(
            f"[poller] saved {direction} | peer_id={peer_id} | from_id={from_id} | text={text}"
        )
    finally:
        db.close()


def run_group_poller(local_group_id: int):
    db = SessionLocal()
    try:
        group = db.query(models.Group).filter(models.Group.id == local_group_id).first()
        if not group:
            raise Exception("Группа не найдена в БД")

        vk_group_id = group.vk_group_id
        access_token = group.access_token
    finally:
        db.close()

    lp = get_longpoll_server(vk_group_id, access_token)
    server = lp["server"]
    key = lp["key"]
    ts = lp["ts"]

    print(f"[poller] long poll started for group {local_group_id}")

    while True:
        try:
            params = {
                "act": "a_check",
                "key": key,
                "ts": ts,
                "wait": 25,
            }

            response = requests.get(server, params=params, timeout=35)
            response.raise_for_status()
            data = response.json()

            if "failed" in data:
                lp = get_longpoll_server(vk_group_id, access_token)
                server = lp["server"]
                key = lp["key"]
                ts = lp["ts"]
                continue

            ts = data.get("ts", ts)

            for event in data.get("updates", []):
                event_type = event.get("type")
                print(f"[poller] event: {event_type}")

                if event_type == "message_new":
                    save_message(local_group_id, event, direction="in")

                elif event_type == "message_reply":
                    save_message(local_group_id, event, direction="out")

        except Exception as e:
            print(f"[poller] error: {e}")
            time.sleep(3)


if __name__ == "__main__":
    group_id = input("Введите локальный group_id из вашей БД: ").strip()
    run_group_poller(int(group_id))