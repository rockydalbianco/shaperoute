"""The links of the items members tag on their photos (TASK-394, ADR-0333,
docs/API.md, «Outfit tags»).

Any https page (the user's choice 1), cleaned and checked when it is kept
and again at every «Shop»:

- https on a domain name: no user, password, port or IP address, at most
  MAX_URL_LENGTH characters;
- no link shortener or redirector (SHORTENERS): they hide where one lands;
- no domain of outfit_blocked_domains, MuW's own list, nor of its parents;
- nothing Web Risk lists (web_risk.py). When Web Risk cannot say (no key,
  old lists, Google not answering), only the shops of MuW Style open
  (RETAILER_HOSTS): a link is never let through unchecked.

Cleaned: the fragment goes, and the parameters of tracking and affiliation
known (TRACKING, and AMAZON_AFFILIATE on Amazon); the rest of the query
stays as written, since on any site who knows what a page needs. The server
never visits the link.

The store «Shop on {store}» names is the shop's name for RETAILER_HOSTS
(«Zalando»), else the host without «www.» («nike.com»). A label in letters
other than Latin is shown in punycode (`xn--…`): a look-alike in Cyrillic
cannot pass for another site.
"""

from __future__ import annotations

import ipaddress
import re
import unicodedata
from collections.abc import Collection
from dataclasses import dataclass
from typing import Literal
from urllib.parse import unquote_plus, urlsplit

from shaperoute_api.style_links import MAX_URL_LENGTH, RETAILER_HOSTS
from shaperoute_api.web_risk import WebRisk

LinkReason = Literal["not_https", "shortened"]

# Hosts that only send one elsewhere: shorteners, the redirects of social
# sites and of affiliate networks. A host under one of them is one too.
SHORTENERS = frozenset(
    {
        # Shorteners
        "bit.ly",
        "bitly.com",
        "bl.ink",
        "buff.ly",
        "cutt.ly",
        "goo.gl",
        "g.co",
        "is.gd",
        "ow.ly",
        "rb.gy",
        "rebrand.ly",
        "s.id",
        "short.io",
        "shorturl.at",
        "t.co",
        "t.ly",
        "tiny.cc",
        "tinyurl.com",
        "v.gd",
        "lnkd.in",
        "fb.me",
        "amzn.to",
        "amzn.eu",
        "a.co",
        "linktr.ee",
        # Redirects of social sites
        "l.facebook.com",
        "lm.facebook.com",
        "l.instagram.com",
        "out.reddit.com",
        "t.umblr.com",
        "href.li",
        # Redirects of affiliate networks
        "awin1.com",
        "prf.hn",
        "click.linksynergy.com",
        "go.skimresources.com",
        "go.redirectingat.com",
        "shareasale.com",
        "anrdoezrs.net",
        "dpbolvw.net",
        "jdoqocy.com",
        "kqzyfj.com",
        "tkqlhce.com",
        "rstyle.me",
        "liketk.it",
    }
)

# Query parameters that only follow who clicked, or pay who shared: lower
# case, as read.
TRACKING_PREFIXES = ("utm_", "pk_", "mtm_")
TRACKING = frozenset(
    {
        # Ads and analytics
        "fbclid",
        "gclid",
        "gclsrc",
        "dclid",
        "gbraid",
        "wbraid",
        "msclkid",
        "yclid",
        "twclid",
        "ttclid",
        "igshid",
        "igsh",
        "li_fat_id",
        "mc_cid",
        "mc_eid",
        "_hsenc",
        "_hsmi",
        "mkt_tok",
        "srsltid",
        "_ga",
        "_gl",
        # Affiliation: Awin, Impact, CJ, ShareASale, Rakuten, Tradedoubler,
        # Zanox, and the generic ones
        "awc",
        "awinaffid",
        "awinmid",
        "clickref",
        "irclickid",
        "irgwc",
        "cjevent",
        "cjdata",
        "sscid",
        "ranmid",
        "raneaid",
        "ransiteid",
        "tduid",
        "zanpid",
        "affid",
        "aff_id",
        "affiliate",
        "affiliate_id",
        "affiliateid",
        "aff_sub",
        "ref",
        "referrer",
    }
)
# Amazon's own: the associate's tag and what goes with it.
AMAZON_AFFILIATE_PREFIXES = ("pd_rd_", "pf_rd_")
AMAZON_AFFILIATE = frozenset(
    {
        "tag",
        "ascsubtag",
        "linkcode",
        "linkid",
        "creative",
        "creativeasin",
        "camp",
        "ref_",
    }
)

_LABEL = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")
_TOP_LEVEL = re.compile(r"[a-z]{2,63}|xn--[a-z0-9-]{1,59}")
_CONTROL = re.compile(r"[\x00-\x20\x7f]")
# An address written as text: a scheme, «www.», or a name with a common
# top-level domain («nike.com»). Not «Pegasus 41», not «Ultraboost 1.0».
_TOP_LEVELS = (
    "com|net|org|info|biz|eu|it|de|fr|es|uk|ch|at|nl|be|pt|pl|se|dk|no|fi|ie"
    "|us|ca|io|co|me|ly|to|gl|gd|cc|ee|tv|ru|cn|shop|store|app|xyz|link|site"
    "|online"
)
_ADDRESS = re.compile(
    rf"(?i)[a-z][a-z0-9+.-]*://|\bwww\.|\b[\w-]+\.(?:{_TOP_LEVELS})\b"
)


class OutfitLinkError(ValueError):
    """A link that cannot be kept; `reason` says why, as the app tells it."""

    def __init__(self, reason: LinkReason) -> None:
        super().__init__(reason)
        self.reason: LinkReason = reason


@dataclass(frozen=True)
class CleanLink:
    """A link as kept: `url` cleaned, its `host` in ASCII, the `store`
    «Shop on» names, and whether it is one of the shops of Style."""

    url: str
    host: str
    store: str
    known: bool


def _under(host: str, domains: Collection[str]) -> bool:
    return any(domain in domains for domain in suffixes(host))


def suffixes(host: str) -> list[str]:
    """The host and every domain above it: shop.nike.com, nike.com, com."""
    labels = host.split(".")
    return [".".join(labels[start:]) for start in range(len(labels))]


def _retailer(host: str) -> str | None:
    for retailer, hosts in RETAILER_HOSTS.items():
        if host in hosts or f"www.{host}" in hosts:
            return retailer
    return None


def _latin(label: str) -> bool:
    return all(
        char.isascii() or unicodedata.name(char, "").startswith("LATIN ")
        for char in label
    )


def shown_host(host: str) -> str:
    """The host as the sheet says it: without «www.», a punycode label in
    Unicode only when it is all Latin letters («müller.de»)."""
    labels: list[str] = []
    for label in host.removeprefix("www.").split("."):
        if label.startswith("xn--"):
            try:
                read = label.encode("ascii").decode("idna")
            except UnicodeError:
                read = label
            labels.append(read if _latin(read) else label)
        else:
            labels.append(label)
    return ".".join(labels)


def _ascii_host(host: str) -> str:
    """The host in ASCII, a domain name of two labels or more; else
    not_https: an IP address, a single name, a label that is not one."""
    host = host.rstrip(".")
    try:
        ipaddress.ip_address(host.strip("[]"))
    except ValueError:
        pass
    else:
        raise OutfitLinkError("not_https")
    try:
        ascii_host = host.encode("idna").decode("ascii").lower()
    except UnicodeError:
        raise OutfitLinkError("not_https") from None
    labels = ascii_host.split(".")
    if (
        len(ascii_host) > 253
        or len(labels) < 2
        or not all(_LABEL.fullmatch(label) for label in labels)
        or not _TOP_LEVEL.fullmatch(labels[-1])
    ):
        raise OutfitLinkError("not_https")
    return ascii_host


def _is_amazon(host: str) -> bool:
    return "amazon" in host.split(".")[:-1]


def _kept_query(query: str, host: str) -> str:
    """The query without the parameters of tracking and affiliation; the
    others as written, in their order."""
    amazon = _is_amazon(host)
    kept: list[str] = []
    for piece in query.split("&"):
        if not piece:
            continue
        name = unquote_plus(piece.split("=", 1)[0]).lower()
        if name.startswith(TRACKING_PREFIXES) or name in TRACKING:
            continue
        if amazon and (
            name in AMAZON_AFFILIATE or name.startswith(AMAZON_AFFILIATE_PREFIXES)
        ):
            continue
        kept.append(piece)
    return "&".join(kept)


def cleaned(text: str) -> CleanLink:
    """The link as kept, or OutfitLinkError: not_https for anything but an
    https page on a domain name, shortened for a shortener or redirector."""
    text = text.strip()
    if _CONTROL.search(text) or len(text) > MAX_URL_LENGTH:
        raise OutfitLinkError("not_https")
    try:
        parts = urlsplit(text)
        port = parts.port
    except ValueError:
        raise OutfitLinkError("not_https") from None
    if (
        parts.scheme != "https"
        or "@" in parts.netloc
        or ":" in parts.netloc.rsplit("]", 1)[-1]
        or port is not None
        or not parts.hostname
    ):
        raise OutfitLinkError("not_https")
    host = _ascii_host(parts.hostname)
    if _under(host, SHORTENERS):
        raise OutfitLinkError("shortened")
    query = _kept_query(parts.query, host)
    url = f"https://{host}{parts.path}" + (f"?{query}" if query else "")
    if len(url) > MAX_URL_LENGTH:
        raise OutfitLinkError("not_https")
    retailer = _retailer(host)
    store = retailer.capitalize() if retailer is not None else shown_host(host)
    return CleanLink(url=url, host=host, store=store, known=retailer is not None)


def allowed(link: CleanLink, blocked: Collection[str], web_risk: WebRisk) -> bool:
    """The link may be kept, or opened now: not under a domain of
    `blocked`, and safe for Web Risk; when Web Risk cannot say, only a
    shop of Style."""
    if _under(link.host, blocked):
        return False
    verdict = web_risk.verdict(link.url)
    return verdict == "safe" or (verdict == "unknown" and link.known)


def has_address(text: str) -> bool:
    """An address written in a brand or a model: the link has its own box."""
    return _ADDRESS.search(text) is not None
