# app/utils/cookie_utils.py
from typing import Optional

def get_cookie_domain_attribute(base_domain_setting: str) -> Optional[str]:
    """
    Calculates the appropriate value for the 'domain' attribute in set_cookie.
    Returns None for localhost to use browser default scoping.
    Returns parent domain (e.g., '.yourdomain.com') otherwise.
    """
    if not base_domain_setting: # Handle empty string case
        return None
    if base_domain_setting.lower() == "localhost" or base_domain_setting.lower() == "127.0.0.1":
        # For localhost or 127.0.0.1, DO NOT set the domain attribute. Let browser handle it.
        return None
    else:
        # Parent domain for production/staging/localtest.me with leading dot
        return f".{base_domain_setting}"
