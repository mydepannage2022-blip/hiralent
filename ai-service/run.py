import sys
import os

# Ajouter le dossier app au path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)