# Safety net — double check on DB results

FORBIDDEN_KEYWORDS = [
  "password", "pin", "otp", "token", "secret",
  "cin", "passport", "ssn", "iban", "rib", "bic",
  "mot_de_passe", "code_secret", "biometrie",
  "empreinte", "email_prive", "adresse_personnelle"
]

def is_safe_result(data: dict) -> bool:
    """Checks ALL values in the dict for forbidden keywords."""
    for value in data.values():
        if isinstance(value, str):
            val_lower = value.lower()
            for kw in FORBIDDEN_KEYWORDS:
                if kw in val_lower:
                    return False
    return True

def sanitize_result(data: dict) -> dict:
    """Replaces any forbidden value with [MASQUÉ]."""
    sanitized = {}
    for key, value in data.items():
        if isinstance(value, str):
            val_lower = value.lower()
            is_forbidden = False
            for kw in FORBIDDEN_KEYWORDS:
                if kw in val_lower:
                    is_forbidden = True
                    break
            sanitized[key] = "[MASQUÉ]" if is_forbidden else value
        else:
            sanitized[key] = value
    return sanitized
