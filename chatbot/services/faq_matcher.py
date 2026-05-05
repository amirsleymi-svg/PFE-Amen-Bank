import re
import unicodedata

_OUT_OF_SCOPE_RESPONSE = (
    "Je suis l'Assistant Amen, je ne reponds qu'aux questions bancaires."
)

_MISSING_DATA_RESPONSE = (
    "Je n'ai pas la donnee demandee dans votre dossier. "
    "Veuillez contacter le siege Amen Bank, Avenue Mohamed V, Tunis, ou le +216 71 148 000."
)

_CONTACT_RESPONSE = (
    "Siege Amen Bank: Avenue Mohamed V, Tunis. "
    "Telephone: +216 71 148 000. Email: contact@amenbank.com.tn."
)


_STATUS_FR = {
    "ACTIVE": "actif",
    "DISABLED": "desactive",
    "EXPIRED": "expire",
    "PENDING": "en attente",
    "APPROVED": "approuve",
    "REJECTED": "rejete",
    "EXECUTED": "execute",
    "FAILED": "echoue",
    "CANCELLED": "annule",
    "DISBURSED": "verse",
    "COMPLETED": "termine",
}

_TYPE_FR = {
    "TRANSFER_SIMPLE": "Virement simple",
    "TRANSFER_GROUPED": "Virement groupe",
    "TRANSFER_PERMANENT": "Virement permanent",
    "CREDIT_DISBURSEMENT": "Decaissement credit",
    "CARD_RECHARGE": "Recharge carte",
    "CARD_LINKING": "Liaison carte",
    "CREDIT_REPAYMENT": "Remboursement credit",
}


def _normalize(text: str) -> str:
    text = text or ""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", text.lower()).strip()


def _contains_any(text: str, words: set[str]) -> bool:
    return any(w in text for w in words)


def _fmt_amount(value: float | int | str | None, currency: str = "TND") -> str:
    try:
        amount = float(value or 0)
    except Exception:
        amount = 0.0
    return f"{amount:.3f} {currency or 'TND'}"


def _status_label(raw: str | None) -> str:
    if not raw:
        return ""
    return _STATUS_FR.get(raw, raw)


def _type_label(raw: str | None) -> str:
    if not raw:
        return ""
    return _TYPE_FR.get(raw, raw)


def _answer_balances(ctx: dict) -> str:
    accounts = ctx.get("accounts") or []
    cards = ctx.get("cards") or []

    if not accounts and not cards:
        return _MISSING_DATA_RESPONSE

    lines: list[str] = []
    for a in accounts[:5]:
        lines.append(
            f"- Compte {a.get('account_number', '')}: {_fmt_amount(a.get('balance'), a.get('currency', 'TND'))} "
            f"({ _status_label(a.get('status')) })"
        )
    for c in cards[:5]:
        lines.append(
            f"- Carte {c.get('masked_number', '')}: {_fmt_amount(c.get('card_balance'), 'TND')} "
            f"(statut {_status_label(c.get('status'))})"
        )

    if not lines:
        return _MISSING_DATA_RESPONSE
    return "\n".join(lines[:7])


def _answer_cards(ctx: dict) -> str:
    cards = ctx.get("cards") or []
    if not cards:
        return _MISSING_DATA_RESPONSE

    lines = []
    for c in cards[:7]:
        lines.append(
            f"- Carte {c.get('masked_number', '')} | statut {_status_label(c.get('status'))} | "
            f"solde {_fmt_amount(c.get('card_balance'), 'TND')} | compte {c.get('account_number', '')}"
        )
    return "\n".join(lines)


def _answer_history(ctx: dict) -> str:
    txs = ctx.get("transactions") or []
    if not txs:
        return _MISSING_DATA_RESPONSE

    lines = []
    for t in txs[:7]:
        lines.append(
            f"- {t.get('date', '')} | {_type_label(t.get('type'))} | "
            f"{_fmt_amount(t.get('amount'), t.get('currency', 'TND'))} | {_status_label(t.get('status'))}"
        )
    return "\n".join(lines)


def _answer_credits(ctx: dict) -> str:
    credits = ctx.get("credits") or []
    if not credits:
        return _MISSING_DATA_RESPONSE

    lines = []
    for c in credits[:5]:
        status = c.get("status") or ""
        status_label = _status_label(status)
        line = (
            f"- {c.get('reference', '')}: {_fmt_amount(c.get('amount'), 'TND')} | "
            f"mensualite {_fmt_amount(c.get('monthly_payment'), 'TND')} | statut {status_label}"
        )
        if status == "REJECTED" and c.get("decision_comment"):
            line += f" | motif: {c.get('decision_comment')}"
        lines.append(line)
    return "\n".join(lines[:7])


def _answer_pending_transfers(ctx: dict) -> str:
    pending = ctx.get("pending_transfers") or []
    if not pending:
        return "Vous n'avez aucun virement en attente pour le moment."

    lines = []
    for p in pending[:7]:
        lines.append(
            f"- {p.get('date', '')} | {_type_label(p.get('type'))} | "
            f"{_fmt_amount(p.get('amount'), p.get('currency', 'TND'))} | ref {p.get('reference', '')}"
        )
    return "\n".join(lines)


def _answer_grouped_transfers(ctx: dict) -> str:
    grouped = ctx.get("grouped_transfers") or []
    if not grouped:
        return _MISSING_DATA_RESPONSE

    lines = []
    for g in grouped[:5]:
        lines.append(
            f"- Ref {g.get('reference', '')}: total {_fmt_amount(g.get('amount'), g.get('currency', 'TND'))}, "
            f"{g.get('beneficiary_count', 0)} beneficiaire(s), statut {_status_label(g.get('status'))}"
        )
    return "\n".join(lines[:7])


def _answer_permanent_transfers(ctx: dict) -> str:
    permanent = ctx.get("permanent_transfers") or []
    if not permanent:
        return _MISSING_DATA_RESPONSE

    lines = []
    for p in permanent[:5]:
        next_exec = p.get("next_execution") or "non definie"
        lines.append(
            f"- Ref {p.get('reference', '')}: {_fmt_amount(p.get('amount'), p.get('currency', 'TND'))}, "
            f"frequence {p.get('frequency', '')}, prochaine execution {next_exec}, "
            f"statut {_status_label(p.get('status'))}"
        )
    return "\n".join(lines[:7])


def _answer_notifications(ctx: dict) -> str:
    notifications = ctx.get("notifications") or []
    if not notifications:
        return _MISSING_DATA_RESPONSE

    unread = [n for n in notifications if not n.get("is_read")]
    if not unread:
        return "Vous n'avez pas de notification non lue."

    lines = []
    for n in unread[:7]:
        lines.append(
            f"- {n.get('date', '')}: {n.get('title', '')} ({n.get('type', '')})"
        )
    return "\n".join(lines)


def _answer_client_status(ctx: dict) -> str:
    user = ctx.get("user_info") or {}
    if not user:
        return _MISSING_DATA_RESPONSE

    first_name = user.get("first_name", "")
    last_name = user.get("last_name", "")
    name = f"{first_name} {last_name}".strip() or "Client"
    status = _status_label(user.get("status"))
    member_since = user.get("member_since") or "date inconnue"
    return f"{name}, votre statut client est {status}. Date d'inscription: {member_since}."


def _answer_transfer_rules(query: str) -> str:
    if "permanent" in query:
        return (
            "Le virement permanent suit une frequence programmee (quotidien, hebdomadaire, mensuel, trimestriel, annuel) "
            "avec une approbation initiale, puis execution automatique a chaque echeance."
        )
    if "groupe" in query or "group" in query:
        return (
            "Pour un virement groupe, l'execution est automatique si le total est <= 1000.000 TND; "
            "au-dela, une approbation employe est requise."
        )
    return (
        "Pour un virement simple, OTP (2FA) obligatoire. "
        "Execution automatique si montant <= 1000.000 TND, sinon validation par un employe."
    )


def try_answer(user_message: str, ctx: dict) -> str | None:
    q = _normalize(user_message)
    if not q:
        return "Veuillez saisir votre question bancaire."

    off_topic_words = {
        "meteo", "weather", "sport", "football", "match", "musique", "film",
        "serie", "python", "javascript", "code", "programmation", "politique",
        "recette", "cuisine", "voyage", "restaurant",
    }
    banking_words = {
        "amen", "banque", "bank", "compte", "solde", "carte", "virement",
        "credit", "transaction", "historique", "notification", "iban",
        "agence", "service client", "otp", "mensualite", "beneficiaire",
        "permanent", "groupe", "statut", "profil", "contact",
    }
    greeting_words = {"bonjour", "salut", "hello", "bonsoir", "merci"}

    if _contains_any(q, off_topic_words) and not _contains_any(q, banking_words):
        return _OUT_OF_SCOPE_RESPONSE

    if _contains_any(q, greeting_words):
        return "Bonjour. Je peux vous aider sur votre solde, vos virements, vos cartes, vos credits et vos transactions."

    if not _contains_any(q, banking_words):
        return _OUT_OF_SCOPE_RESPONSE

    if _contains_any(q, {"agence", "contact", "telephone", "adresse", "support", "service client", "siege"}):
        return _CONTACT_RESPONSE

    if _contains_any(q, {"statut client", "mon statut", "compte actif", "compte desactive", "profile", "profil"}):
        return _answer_client_status(ctx)

    if _contains_any(q, {"solde", "balance", "combien j", "combien ai", "mes comptes", "mon compte"}):
        return _answer_balances(ctx)

    if _contains_any(q, {"carte", "cartes"}):
        return _answer_cards(ctx)

    if _contains_any(q, {"historique", "mouvement", "transactions", "transaction", "operations", "dernier"}):
        return _answer_history(ctx)

    if _contains_any(q, {"credit", "mensualite", "demande credit", "approuve", "rejete", "disbursed"}):
        return _answer_credits(ctx)

    if _contains_any(q, {"en attente", "pending"}):
        return _answer_pending_transfers(ctx)

    if _contains_any(q, {"virement permanent", "permanent"}):
        return _answer_permanent_transfers(ctx)

    if _contains_any(q, {"virement groupe", "grouped", "groupe", "beneficiaire"}):
        return _answer_grouped_transfers(ctx)

    if _contains_any(q, {"virement", "transfer", "otp"}):
        return _answer_transfer_rules(q)

    if _contains_any(q, {"notification", "notifications", "alerte"}):
        return _answer_notifications(ctx)

    return None
