from app.sources.github.parser import parse_github_user


def test_parse_github_user_minimal():
    raw = {
        "id": 123,
        "login": "octocat",
        "name": "The Octocat",
        "bio": "I love Python and FastAPI",
        "location": "San Francisco, USA",
        "blog": "https://example.com",
        "html_url": "https://github.com/octocat",
        "email": None,
    }
    c = parse_github_user(raw)
    assert c.full_name
    assert c.source == "github"
    assert "github" in c.links
