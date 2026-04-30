import base64
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import settings

security = HTTPBearer(auto_error=False)


@dataclass
class ClientAuth:
    user_id: int
    email: str


def get_current_client(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> ClientAuth:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token manquant",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        secret_bytes = base64.b64decode(settings.JWT_SECRET)
        payload = jwt.decode(
            token,
            secret_bytes,
            algorithms=["HS256", "HS384", "HS512"],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expire",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )

    role = payload.get("role")
    if role != "CLIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le chatbot est reserve aux clients",
        )

    user_id = int(payload.get("sub", 0))
    email = payload.get("email", "")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide: identifiant manquant",
        )

    return ClientAuth(user_id=user_id, email=email)
