FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    time gosu tini && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 10001 runner

WORKDIR /opt/runner
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY entrypoint.py sandbox_exec.py scoring.py /opt/runner/

# Ensure files are owned by the non-root runner user
RUN chown -R runner:runner /opt/runner

USER runner

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["/usr/bin/tini","--","python","/opt/runner/entrypoint.py"]

# Lightweight healthcheck: verify entrypoint exists
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD ["/bin/sh","-c","test -f /opt/runner/entrypoint.py || exit 1"]
