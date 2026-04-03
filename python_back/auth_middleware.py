"""
Python API uchun JWT autentifikatsiya middleware.
.NET bilan bir xil JWT Secret Key ishlatadi — shared token tekshiruvi.

Foydalanish:
    from auth_middleware import verify_token
    
    @router.post("/analyze")
    async def analyze(user=Depends(verify_token), ...):
        # user — JWT payload (user_id, role va h.k.)
"""
import jwt
from fastapi import Header, HTTPException, Depends
from config import JWT_SECRET, JWT_ALGORITHM


async def verify_token(authorization: str = Header(None)):
    """
    Authorization header dan Bearer token ni tekshiradi.
    Token bo'lmasa yoki JWT_SECRET sozlanmagan bo'lsa — ruxsat beriladi (graceful degradation).
    JWT_SECRET sozlangan bo'lsa — token majburiy.
    """
    # Agar JWT_SECRET sozlanmagan bo'lsa — autentifikatsiyani o'tkazib yuborish
    # (development muhiti uchun)
    if not JWT_SECRET:
        return {"user_id": None, "role": "anonymous"}

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header topilmadi. Bearer token kerak."
        )

    # "Bearer <token>" formatini parse qilish
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Authorization header formati noto'g'ri. 'Bearer <token>' kerak."
        )

    token = parts[1]

    try:
        # .NET tomondan yaratilgan JWT ni dekod qilish
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={
                "verify_aud": False,  # .NET audience tekshiruvini o'tkazish
                "verify_iss": False,  # .NET issuer tekshiruvini o'tkazish
            }
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token muddati o'tgan.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Token noto'g'ri: {str(e)}")
