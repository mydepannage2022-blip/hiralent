from app.sources.registry import list_sources


def test_list_sources_returns_list():
    sources = list_sources()
    assert isinstance(sources, list)
