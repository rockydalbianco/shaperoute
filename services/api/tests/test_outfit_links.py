"""The links of the items members tag (TASK-394, ADR-0333, docs/API.md,
«Outfit tags»), without a database and without network.

Only an https page on a domain name: no http, user, port or IP address;
no shortener or redirector. Cleaned: the fragment and the parameters of
tracking and affiliation known go, the rest of the query stays as written.
The store is the shop's name or the host, in punycode when its letters are
not Latin. A link opens when it is under no blocked domain and Web Risk
says it is safe; when Web Risk cannot say, only a shop of Style. An address
in a brand or a model is found."""

from __future__ import annotations

import pytest
from test_web_risk import FakeGoogle, ready_risk

from shaperoute_api.outfit_links import (
    OutfitLinkError,
    allowed,
    cleaned,
    has_address,
    shown_host,
    suffixes,
)
from shaperoute_api.web_risk import WebRisk

NIKE = (
    "https://www.nike.com/it/t/pegasus-41-scarpa-da-running-su-strada-uomo"
    "?utm_source=instagram&size=44#reviews"
)


def test_a_link_is_cleaned() -> None:
    link = cleaned(NIKE)
    assert link.url == (
        "https://www.nike.com/it/t/pegasus-41-scarpa-da-running-su-strada-uomo"
        "?size=44"
    )
    assert (link.host, link.store, link.known) == ("www.nike.com", "nike.com", False)


@pytest.mark.parametrize(
    ("given", "kept"),
    [
        # Tracking, wherever it is, in any case; the rest in its order.
        (
            "https://shop.example.it/p?color=red&UTM_MEDIUM=x&fbclid=1&gclid=2&size=m",
            "https://shop.example.it/p?color=red&size=m",
        ),
        # Affiliation: Awin, Impact, CJ, a referral code.
        (
            "https://shop.example.it/p?awc=123_456&irclickid=a&cjevent=b&ref=me&id=7",
            "https://shop.example.it/p?id=7",
        ),
        # Amazon's tag only on Amazon; a value written as it was.
        (
            "https://www.amazon.it/dp/B0CX?tag=mine-21&psc=1&linkCode=ll1"
            "&pd_rd_w=x&th=1",
            "https://www.amazon.it/dp/B0CX?psc=1&th=1",
        ),
        (
            "https://shop.example.it/search?tag=red%20shoes&q=a+b",
            "https://shop.example.it/search?tag=red%20shoes&q=a+b",
        ),
        # Nothing left of the query: no «?».
        ("https://shop.example.it/p?utm_source=x", "https://shop.example.it/p"),
        # Case and a trailing dot of the host; the path as written.
        ("HTTPS://Shop.Example.IT./P/%C3%A9", "https://shop.example.it/P/%C3%A9"),
        ("  https://shop.example.it  ", "https://shop.example.it"),
    ],
)
def test_tracking_goes_and_the_rest_stays(given: str, kept: str) -> None:
    assert cleaned(given).url == kept


@pytest.mark.parametrize(
    "given",
    [
        "http://www.nike.com/it/",
        "ftp://www.nike.com/",
        "www.nike.com/it/",
        "nike.com",
        "https://",
        "https:/www.nike.com/",
        "https://user@www.nike.com/",
        "https://user:pass@www.nike.com/",
        "https://www.nike.com:443/",
        "https://www.nike.com:/",
        "https://www.nike.com:99999/",
        "https://192.168.1.1/",
        "https://[::1]/",
        "https://3232235777/",
        "https://0x7f.1/",
        "https://localhost/",
        "https://nike/",
        "https://www.nike.c/",
        "https://www..nike.com/",
        "https://www.ni_ke.com/",
        "https://www.nike.com/a b",
        "https://www.nike.com/a\nb",
        "https://www.nike.com/" + "a" * 1000,
    ],
)
def test_only_an_https_page_on_a_domain(given: str) -> None:
    with pytest.raises(OutfitLinkError) as refused:
        cleaned(given)
    assert refused.value.reason == "not_https"


@pytest.mark.parametrize(
    "given",
    [
        "https://bit.ly/3xYz",
        "https://BIT.LY/3xYz",
        "https://tinyurl.com/abc",
        "https://t.co/abc",
        "https://amzn.to/abc",
        "https://amzn.eu/d/abc",
        "https://linktr.ee/someone",
        "https://l.instagram.com/?u=https%3A%2F%2Fwww.nike.com",
        "https://www.awin1.com/cread.php?awinmid=1&ued=https%3A%2F%2Fwww.zalando.it",
        "https://go.skimresources.com/?url=x",
    ],
)
def test_no_shortener_nor_redirect(given: str) -> None:
    with pytest.raises(OutfitLinkError) as refused:
        cleaned(given)
    assert refused.value.reason == "shortened"


def test_the_store_is_the_shops_or_the_host() -> None:
    zalando = cleaned("https://www.zalando.it/nike-pegasus-41-n1242a2n0-q11.html")
    assert (zalando.store, zalando.known) == ("Zalando", True)
    assert cleaned("https://zalando.it/x").known
    assert cleaned("https://www.zalando.de/x").store == "zalando.de"
    assert not cleaned("https://www.zalando.de/x").known
    assert cleaned("https://shop.nike.com/x").store == "shop.nike.com"


def test_a_look_alike_is_shown_in_punycode() -> None:
    # A Cyrillic «а» in «apple», and a whole name in Cyrillic.
    mixed = cleaned("https://www.аpple.com/shoes")
    assert mixed.host == "www.xn--pple-43d.com"
    assert mixed.store == "xn--pple-43d.com"
    assert mixed.url == "https://www.xn--pple-43d.com/shoes"
    assert shown_host("xn--80ak6aa92e.com") == "xn--80ak6aa92e.com"
    # Latin letters with accents read as they are.
    accented = cleaned("https://www.müller.de/laufschuhe")
    assert accented.host == "www.xn--mller-kva.de"
    assert accented.store == "müller.de"


def test_the_domains_above_a_host() -> None:
    assert suffixes("shop.nike.com") == ["shop.nike.com", "nike.com", "com"]


def test_a_link_opens_when_safe_and_not_blocked() -> None:
    risk = ready_risk(FakeGoogle(listed=["www.bad-shoes.test/"]))
    nike = cleaned(NIKE)
    assert allowed(nike, set(), risk)
    # Blocked: the host, or a domain above it.
    assert not allowed(nike, {"nike.com"}, risk)
    assert not allowed(nike, {"www.nike.com"}, risk)
    assert allowed(nike, {"shop.nike.com", "adidas.com"}, risk)
    assert not allowed(cleaned("https://www.bad-shoes.test/sale"), set(), risk)


def test_without_web_risk_only_the_shops_of_style() -> None:
    risk = WebRisk(None)
    assert allowed(cleaned("https://www.zalando.it/x.html"), set(), risk)
    assert allowed(cleaned("https://www.decathlon.it/p/x"), set(), risk)
    assert not allowed(cleaned(NIKE), set(), risk)
    assert not allowed(cleaned("https://www.zalando.it/x.html"), {"zalando.it"}, risk)


@pytest.mark.parametrize(
    ("text", "address"),
    [
        ("nike.com", True),
        ("Buy at www.nike", True),
        ("https://nike", True),
        ("see shop.example.it/x", True),
        ("Rapha.cc", True),
        ("Pegasus 41", False),
        ("Ultraboost 1.0", False),
        ("Dr. Martens", False),
        ("Gel-Nimbus 26", False),
        ("C.P. Company", False),
        ("Forerunner 965", False),
    ],
)
def test_an_address_in_a_brand_or_a_model(text: str, address: bool) -> None:
    assert has_address(text) is address
