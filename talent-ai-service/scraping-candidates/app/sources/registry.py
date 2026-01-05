from app.settings import settings
from app.sources.github.source import GitHubSource
from app.sources.greenhouse.source import GreenhouseSource
from app.sources.lever.source import LeverSource

_SOURCES = {}

if settings.enable_github:
    _SOURCES["github"] = GitHubSource()

if settings.enable_greenhouse:
    _SOURCES["greenhouse"] = GreenhouseSource()

if settings.enable_lever:
    _SOURCES["lever"] = LeverSource()


def get_source(name: str):
    return _SOURCES[name]


def list_sources():
    return list(_SOURCES.keys())


def describe_sources():
    return {name: src.descriptor() for name, src in _SOURCES.items()}
