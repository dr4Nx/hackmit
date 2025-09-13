from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import anthropic


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Or specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def get_health():
    return {"ok": True}


@app.post("/inference")
def post_inference(prompt: str = "", image_url: str = ""):
    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-opus-4-1-20250805",
        max_tokens=1024 * 8,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "url",
                            "url": image_url,  # TODO: image url
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )

    return {"data": message}


@app.post("/test-inference")
def post_test_inference(prompt: str = "", image_url: str = ""):
    return {"prompt": prompt, "image_url": image_url}
