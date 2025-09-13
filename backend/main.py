from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
from dotenv import dotenv_values
import json


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Or specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

config = dotenv_values(".env")


client = anthropic.Anthropic(api_key=config["ANTHROPIC_API_KEY"])
recipe_list = []
recipe_counter = 0


class InferenceBody(BaseModel):
    prompt: str
    image_url: str


class TitleBody(BaseModel):
    recipe: str


@app.get("/health")
def get_health():
    return {"ok": True}


@app.post("/inference")
def post_inference(body: InferenceBody):
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
                            "url": body.image_url,  # TODO: image url
                        },
                    },
                    {"type": "text", "text": body.prompt},
                ],
            }
        ],
    )

    return {"data": message.content[0].text}


@app.post("/extract-metadata")
def post_title(body: TitleBody):
    message = client.messages.create(
        model="claude-opus-4-1-20250805",
        max_tokens=1024 * 8,
        messages=[
            {
                "role": "user",
                "content": f"You are an expert chef. You are given the recipe for a dish. Your task is to output the details of the meal in JSON format with keys: 'dish_name' (str), 'preparation_duration_minutes' (int), 'preparation_difficulty' (str), 'serving_number_of_people' (int), 'brief_description' (str), 'ingredients' (list), 'nutritional_value' (list). Only output the JSON without the markdown formatting.\n\n### Recipe\n\n{body.recipe}",
            }
        ],
    )

    return {"data": message.content[0].text}


@app.post("/extract-steps")
def post_extract_steps(body: TitleBody):
    message = client.messages.create(
        model="claude-opus-4-1-20250805",
        max_tokens=1024 * 8,
        messages=[
            {
                "role": "user",
                "content": f"You are an expert chef. You are given the recipe for a dish. Your task is to extract the steps of the recipe in JSON format with keys: 'recipe' (list). Only output the JSON without the markdown formatting.\n\n### Recipe\n\n{body.recipe}",
            }
        ],
    )

    global recipe_list
    recipe_list = json.loads(message.content[0].text)["recipe"]

    return {"data": message.content[0].text}


@app.get("/next-step")
def get_next_step():
    global recipe_counter
    recipe_counter += 1
    if recipe_counter >= len(recipe_list):
        return {"data": "You're done!"}
    return {"data": recipe_list[recipe_counter]}






# TODO: delete test-inference
@app.post("/test-inference")
def post_test_inference(body: InferenceBody):
    return {"prompt": body.prompt, "image_url": body.image_url}
