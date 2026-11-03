"""Laboratoriya arxivini (xlsx) API orqali bemorlarga yuklash.

`plan.json` (lokal skaner + `group.py` natijasi) bo'yicha ishlaydi:
  1. Har bemor: avval holat faylida, keyin bazada (ism bo'yicha qidiruv:
     familiya + ism bosh harfi + tug'ilgan yili) qidiriladi; topilmasa
     yaratiladi (`save-patient-data`).
  2. Har tahlil: `POST lab-analyses/analyze` — oddiy yuklash bilan AYNAN bir
     xil yo'l (fayl tekshiruvi, takror himoyasi, AI, birliklar, sana).
     Fayllarda «Дата:» bo'lmasa papka nomidagi sana yuboriladi.
  3. Holat (`state.json`) har qadamdan keyin yoziladi — to'xtab qolsa
     qaytadan ishga tushirilganda davom etadi, takror yuklamaydi.

AI so'rovlari uchun API da UMUMIY chegara bor (daqiqasiga 10 ta, barcha
foydalanuvchilar uchun) — `--rate` dan oshirmang. 429 javobida skript o'zi
kutadi. Serverda AI navbati `--max-queue` (10) dan oshsa yuborish to'xtab
turadi — tezlik serverning o'z imkoniyatiga moslashadi.

Buyruqlar:
    run    — yuklash (birinchi marta `--limit 30` bilan sinab ko'ring)
    check  — yuborilgan tahlillar holatini yangilash va hisobot
    retry  — AI xatosi (-1) bilan tugaganlarini qayta yuborish

Misol (serverda):
    venv/bin/python tools/lab_import/import_labs.py run --plan ~/import/plan.json \
        --root ~/import/labaratoriya --token-file ~/import_token.txt --limit 30
"""
import argparse
import datetime
import json
import mimetypes
import os
import sys
import time

import requests

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class Api:
    def __init__(self, base, token_file):
        self.base = base.rstrip("/")
        self.token_file = token_file
        self.s = requests.Session()

    def _headers(self):
        with open(self.token_file, encoding="utf-8") as fh:
            token = fh.readline().strip()
        return {"Authorization": f"Bearer {token}"}

    def call(self, method, path, **kw):
        """So'rov; 429 va tarmoq xatosida kutib qayta urinadi. 401 — to'xtaydi."""
        for attempt in range(8):
            try:
                r = self.s.request(method, f"{self.base}/{path}", headers=self._headers(), timeout=180, **kw)
            except requests.RequestException as e:
                wait = min(300, 15 * (attempt + 1))
                log(f"  tarmoq xatosi ({type(e).__name__}), {wait} s kutiladi")
                time.sleep(wait)
                continue
            if r.status_code == 429:
                log("  429 — AI so'rovlari chegarasi, 30 s kutiladi")
                time.sleep(30)
                continue
            if r.status_code == 401:
                sys.exit("401 — token yaroqsiz yoki muddati tugagan. Yangi token yarating va qayta ishga tushiring.")
            if r.status_code >= 500 and attempt < 3:
                log(f"  {r.status_code} — 20 s kutiladi")
                time.sleep(20)
                continue
            return r
        raise RuntimeError(f"{path}: urinishlar tugadi")


def log(msg):
    print(f"{datetime.datetime.now():%H:%M:%S} {msg}", flush=True)


def load_state(path):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    return {"patients": {}, "uploads": {}}


def save_state(path, state):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(state, fh, ensure_ascii=False)
    os.replace(tmp, path)


def initial_of(name):
    for dig in ("SH", "CH", "YO", "YU", "YA", "TS", "O'", "G'"):
        if name.startswith(dig):
            return dig
    return name[:1]


def find_or_create_patient(api, p):
    """Bazada familiya + bosh harf + tug'ilgan yili mos bemor; bo'lmasa yangi."""
    year = p["birthdate"][:4]
    ini = initial_of(p["firstname"])
    r = api.call("GET", "patcient/search-by-name", params={"q": f"{p['lastname']} {ini}"})
    if r.ok:
        cands = [
            c for c in (r.json().get("data") or [])
            if (c.get("lastName") or "").upper() == p["lastname"]
            and str(c.get("birthDate") or "")[:4] == year
            and initial_of((c.get("firstName") or "").upper()) == ini
        ]
        exact = [c for c in cands if (c.get("firstName") or "").upper() == p["firstname"]]
        pick = exact or cands
        if len(pick) >= 1:
            return pick[0]["id"], "mavjud"
    body = {
        "firstname": p["firstname"],
        "lastname": p["lastname"],
        "surename": p.get("surename") or None,
        "birthdate": p["birthdate"],
        "gender": {"male": True, "female": False}.get(p.get("gender")),
    }
    r = api.call("POST", "patcient/save-patient-data", json=body)
    if not r.ok:
        raise RuntimeError(f"bemor yaratilmadi: {r.status_code} {r.text[:200]}")
    return r.json()["id"], "yangi"


def age_at(birthdate, on_date):
    try:
        b = datetime.date.fromisoformat(birthdate)
        d = datetime.date.fromisoformat(on_date) if on_date else datetime.date.today()
    except ValueError:
        return None
    return d.year - b.year - ((d.month, d.day) < (b.month, b.day))


def server_queue():
    """Serverda AI kutayotgan (0/1) lab tahlillari soni — BARCHA foydalanuvchilarniki.

    Skript serverda (Python papkasi yonida) ishlaganda bazadan o'qiladi;
    boshqa joyda ishlasa `None` — navbat nazorati o'chadi.
    AI fon vazifalari umumiy thread pool da (4 yadroli serverda 8 ta) bajariladi:
    navbat cheksiz o'ssa, kutish 30 daqiqadan oshib, watchdog tahlilni xato
    deb belgilardi va xodimlarning tahlillari ham shu navbatda qolardi.
    """
    global _db_session
    try:
        if _db_session is None:
            sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
            from database import SessionLocal  # noqa: E402
            from sqlalchemy import text  # noqa: E402
            _db_session = (SessionLocal, text)
        SessionLocal, text = _db_session
        with SessionLocal() as db:
            return db.execute(text(
                "SELECT count(*) FROM lab_analyses WHERE status IN (0, 1) "
                "AND created_at > now() - interval '6 hours'")).scalar()
    except Exception as e:  # noqa: BLE001 — baza yo'q bo'lsa navbat nazoratisiz ishlaydi
        if _db_session is not False:
            log(f"  navbat nazorati o'chiq (baza ochilmadi: {type(e).__name__})")
        _db_session = False
        return None


_db_session = None


def wait_for_queue(limit):
    """Server navbati `limit` dan kichik bo'lguncha kutadi."""
    if not limit or _db_session is False:
        return
    waited = 0
    while True:
        q = server_queue()
        if q is None or q < limit:
            if waited:
                log(f"  navbat {q} — davom etiladi ({waited} s kutildi)")
            return
        if waited == 0:
            log(f"  serverda {q} ta tahlil AI kutmoqda — navbat kamayguncha kutiladi")
        time.sleep(15)
        waited += 15


GUARD_EVERY = 20   # shuncha yuklashdan keyin AI holati tekshiriladi
GUARD_SAMPLE = 6   # oxirgi shuncha (4+ daqiqa oldin yuborilgan) tahlil


def ai_failing(api, recent):
    """Oxirgi tahlillarning HAMMASI AI xatosi (-1) bilan tugaganmi.

    OpenAI hisobida pul tugasa yuklash hamon muvaffaqiyatli (fayl saqlanadi),
    lekin har bir tahlil -1 bo'ladi — import to'xtamasa minglab tahlil
    xatoga tushib, keyin hammasini qayta yuborishga yana 2 kun ketardi.
    """
    old = [lid for lid, t in recent if time.time() - t > 240][-GUARD_SAMPLE:]
    if len(old) < GUARD_SAMPLE:
        return False
    statuses = []
    for lid in old:
        r = api.call("GET", f"lab-analyses/{lid}")
        if r.ok:
            statuses.append(r.json().get("status"))
    return len(statuses) == GUARD_SAMPLE and all(s == -1 for s in statuses)


def cmd_run(a):
    api = Api(a.api, a.token_file)
    plan = json.load(open(a.plan, encoding="utf-8"))
    state = load_state(a.state)
    interval = 60.0 / a.rate
    sent = 0
    last_post = 0.0
    recent = []  # (lab_id, yuborilgan vaqt) — AI holatini kuzatish uchun
    for p in plan:
        if a.limit and sent >= a.limit:
            break
        todo = [(i, u) for i, u in enumerate(p["uploads"]) if f"{p['key']}#{i}" not in state["uploads"]]
        if not todo:
            continue
        pid = state["patients"].get(p["key"])
        if not pid:
            pid, how = find_or_create_patient(api, p)
            state["patients"][p["key"]] = pid
            save_state(a.state, state)
            log(f"bemor {how}: {p['lastname']} {p['firstname']} {p['birthdate'][:4]} → id {pid}")
        gender = {"male": "erkak", "female": "ayol"}.get(p.get("gender"))
        for i, u in todo:
            if a.limit and sent >= a.limit:
                break
            ukey = f"{p['key']}#{i}"
            # Mazmun xotiraga o'qiladi: qayta urinishda fayl obyekti oxirigacha
            # o'qilgan bo'lib, server "Yuklangan fayl bo'sh" derdi
            files = []
            for rel in u["files"]:
                with open(os.path.join(a.root, rel), "rb") as fh:
                    files.append(("file", (os.path.basename(rel), fh.read(), mimetypes.guess_type(rel)[0] or XLSX)))
            # bulk — AI arzon tarifda (flex): arxiv shoshilinch emas
            data = {"patcient_id": str(pid), "lang": a.lang, "bulk": "true"}
            age = age_at(p["birthdate"], u.get("date"))
            if age is not None and 0 <= age <= 120:
                data["age"] = str(age)
            if gender:
                data["gender"] = gender
            if u.get("date_from_folder") and u.get("date"):
                data["analysis_date"] = u["date"]
            wait_for_queue(a.max_queue)
            wait = last_post + interval - time.time()
            if wait > 0:
                time.sleep(wait)
            last_post = time.time()
            r = api.call("POST", "lab-analyses/analyze", files=files, data=data)
            if r.ok:
                lab_id = r.json().get("lab_id")
                state["uploads"][ukey] = {"lab_id": lab_id, "status": 0, "patient_id": pid}
                log(f"  lab {lab_id}: {len(u['files'])} fayl, {u.get('date')}")
                recent = (recent + [(lab_id, time.time())])[-60:]
            elif r.status_code == 409:
                state["uploads"][ukey] = {"duplicate": True, "patient_id": pid}
                log(f"  takror — avval yuklangan: {u['files'][0]}")
            else:
                state["uploads"][ukey] = {"error": f"{r.status_code} {r.text[:300]}", "patient_id": pid}
                log(f"  XATO {r.status_code}: {u['files'][0]} — {r.text[:200]}")
            save_state(a.state, state)
            sent += 1
            if sent % GUARD_EVERY == 0 and ai_failing(api, recent):
                log("TO'XTATILDI: oxirgi tahlillarning hammasi AI xatosi bilan tugadi.")
                log("OpenAI balansini tekshiring. To'lovdan keyin: check → retry → run (joyidan davom etadi).")
                summary(state)
                sys.exit(2)
    log(f"yuborildi: {sent}")
    summary(state)


def cmd_check(a):
    api = Api(a.api, a.token_file)
    state = load_state(a.state)
    n = 0
    for key, u in state["uploads"].items():
        if u.get("lab_id") and u.get("status") in (0, 1, None):
            r = api.call("GET", f"lab-analyses/{u['lab_id']}")
            if r.ok:
                u["status"] = r.json().get("status")
                n += 1
            if n % 200 == 0:
                save_state(a.state, state)
    save_state(a.state, state)
    summary(state)


def cmd_retry(a):
    api = Api(a.api, a.token_file)
    state = load_state(a.state)
    interval = 60.0 / a.rate
    for key, u in state["uploads"].items():
        if u.get("lab_id") and u.get("status") == -1:
            r = api.call("POST", "lab-analyses/retry", data={"id": str(u["lab_id"]), "lang": a.lang})
            log(f"retry lab {u['lab_id']}: {r.status_code}")
            if r.ok:
                u["status"] = 0
            save_state(a.state, state)
            time.sleep(interval)
    summary(state)


def summary(state):
    ups = state["uploads"].values()
    st = {}
    for u in ups:
        k = ("takror" if u.get("duplicate") else "yuklash xatosi" if u.get("error")
             else {0: "kutmoqda", 1: "kutmoqda", 2: "tayyor", -1: "AI xatosi"}.get(u.get("status"), "noma'lum"))
        st[k] = st.get(k, 0) + 1
    log(f"bemorlar: {len(state['patients'])}, tahlillar: {len(state['uploads'])} — {st}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("command", choices=["run", "check", "retry"])
    ap.add_argument("--plan", default="plan.json")
    ap.add_argument("--root", help="xlsx fayllar papkasi (plan.json dagi yo'llar shunga nisbatan)")
    ap.add_argument("--state", default="state.json")
    ap.add_argument("--token-file", required=True)
    ap.add_argument("--api", default="https://api.nmed.uz/api")
    ap.add_argument("--lang", default="uz")
    ap.add_argument("--rate", type=float, default=8, help="AI so'rovlari / daqiqa (API chegarasi 10)")
    ap.add_argument("--limit", type=int, default=0, help="shuncha tahlildan keyin to'xtash (sinov)")
    ap.add_argument("--max-queue", type=int, default=10,
                    help="serverda AI kutayotgan tahlillar shundan ko'p bo'lsa kutiladi (0 — o'chiq)")
    a = ap.parse_args()
    if a.command == "run" and not a.root:
        sys.exit("--root kerak")
    {"run": cmd_run, "check": cmd_check, "retry": cmd_retry}[a.command](a)


if __name__ == "__main__":
    main()
