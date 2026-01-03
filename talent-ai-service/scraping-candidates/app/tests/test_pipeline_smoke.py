def test_smoke_imports():
    # Just ensures modules import correctly
    import app.pipeline.orchestrator  # noqa
    import app.pipeline.job_store  # noqa
    import app.sources.registry  # noqa
