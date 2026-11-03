"""AI chaqiruvlari xarajatini yozish — `ai_usage` jadvali (2026-11-03).

Har bir `client.responses.create` dan keyin chaqiriladi: tokenlar (kirish,
keshlangan kirish, chiqish, shundan fikrlash) va taxminiy narx. Maqsad —
qaysi bosqich (o'qish, nomlarni bog'lash, xulosa, tasniflash) qancha
turishini ko'rish va sozlama o'zgarishining tejamini o'lchash.

Narx `AI_PRICES` muhit o'zgaruvchisidan (1 mln token uchun USD)::

    AI_PRICES='{"gpt-5.6-terra": [1.25, 0.125, 10], "gpt-5-mini": [0.25, 0.025, 2]}'

(kirish, keshlangan kirish, chiqish). Model narxi berilmasa `cost_usd` NULL —
tokenlar baribir yoziladi.

Yozish xatosi HECH QACHON tahlilni to'xtatmaydi — faqat logga tushadi.
Jadval EF migratsiyasi bilan yaratiladi (`20261105000000_AiUsageAndLabAliases`).

Hisobot misoli (oxirgi kun, bosqich bo'yicha)::

    SELECT step, model, count(*), sum(input_tokens), sum(cached_tokens),
           sum(output_tokens), sum(reasoning_tokens), sum(cost_usd)
      FROM ai_usage WHERE created_at > now() - interval '1 day'
     GROUP BY 1, 2 ORDER BY 1;
"""
from __future__ import annotations

import json
import logging
import os

from sqlalchemy import text

logger = logging.getLogger(__name__)


def _prices() -> dict:
    raw = os.getenv("AI_PRICES", "").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except ValueError:
        logger.warning("AI_PRICES noto'g'ri JSON — narx hisoblanmaydi")
        return {}


def _get(obj, *path, default=0):
    for name in path:
        if obj is None:
            return default
        obj = obj.get(name) if isinstance(obj, dict) else getattr(obj, name, None)
    return obj if obj is not None else default


def tokens(resp) -> dict:
    """`resp.usage` dan tokenlar (SDK obyekti yoki lug'at)."""
    usage = _get(resp, "usage", default=None)
    return {
        "input_tokens": int(_get(usage, "input_tokens") or 0),
        "cached_tokens": int(_get(usage, "input_tokens_details", "cached_tokens") or 0),
        "output_tokens": int(_get(usage, "output_tokens") or 0),
        "reasoning_tokens": int(_get(usage, "output_tokens_details", "reasoning_tokens") or 0),
    }


def cost_usd(model: str, t: dict) -> float | None:
    """Taxminiy narx (USD). Narx jadvalida model bo'lmasa — None."""
    price = _prices().get(model)
    if not (isinstance(price, (list, tuple)) and len(price) == 3):
        return None
    p_in, p_cached, p_out = (float(x) for x in price)
    uncached = max(0, t["input_tokens"] - t["cached_tokens"])
    return round((uncached * p_in + t["cached_tokens"] * p_cached + t["output_tokens"] * p_out) / 1_000_000, 6)


def record(module: str, analysis_id: int | None, step: str, model: str, resp,
           service_tier: str | None = None) -> None:
    """Bitta AI chaqiruvining xarajatini yozadi (xato bo'lsa faqat log)."""
    try:
        t = tokens(resp)
        cost = cost_usd(model, t)
        logger.info(
            "AI xarajat %s#%s %s %s: kirish=%d (kesh %d), chiqish=%d (fikrlash %d)%s",
            module, analysis_id, step, model, t["input_tokens"], t["cached_tokens"],
            t["output_tokens"], t["reasoning_tokens"], f", ${cost}" if cost is not None else "",
        )
        from database import SessionLocal
        with SessionLocal() as db:
            db.execute(text(
                "INSERT INTO ai_usage (module, analysis_id, step, model, service_tier, input_tokens, "
                "cached_tokens, output_tokens, reasoning_tokens, cost_usd) "
                "VALUES (:module, :aid, :step, :model, :tier, :inp, :cached, :out, :reason, :cost)"
            ), {
                "module": module[:32], "aid": analysis_id, "step": step[:32], "model": (model or "?")[:64],
                "tier": (service_tier or None), "inp": t["input_tokens"], "cached": t["cached_tokens"],
                "out": t["output_tokens"], "reason": t["reasoning_tokens"], "cost": cost,
            })
            db.commit()
    except Exception as exc:  # noqa: BLE001 — xarajat logi tahlilni to'xtatmaydi
        logger.warning("AI xarajatini yozib bo'lmadi (%s/%s): %s", module, step, type(exc).__name__)
