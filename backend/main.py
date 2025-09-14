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
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Or specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

config = dotenv_values(".env")


client = anthropic.Anthropic(api_key=config["ANTHROPIC_API_KEY"])
recipe_list = []

# recipe_list = [
#         "Start with leftover day-old rice if possible",
#         "Heat a large pan or wok with a little oil",
#         "Scramble an egg or two and set them aside",
#         "Add more oil to the same pan",
#         "Sauté aromatics like garlic, onion, and ginger until fragrant",
#         "Toss in diced vegetables such as carrots, peas, or bell peppers",
#         "Cook vegetables until just tender",
#         "Add the rice, breaking up any clumps with a spatula",
#         "Stir-fry rice so the grains get slightly crisp",
#         "Return the eggs to the pan",
#         "Add any cooked protein like chicken, shrimp, or tofu",
#         "Season with soy sauce, sesame oil, and optionally oyster sauce or chili paste",
#         "Stir everything together until evenly coated and heated through",
#         "Finish with chopped scallions on top",
#         "Serve hot"
#     ]
recipe_counter = -1


class InferenceBody(BaseModel):
    prompt: str
    image_url: str

class DirectInferenceBody(BaseModel):
    prompt: str
    image_base64: str
    mime_type: str


class TitleBody(BaseModel):
    recipe: str


@app.get("/health")
def get_health():
    return {"ok": True}


@app.post("/inference-direct")
def post_inference_direct(body: DirectInferenceBody):
    """Optimized endpoint that accepts base64 images directly - NO NETWORK ROUNDTRIP!"""
    message = client.messages.create(
        model="claude-3-5-haiku-20241022",
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": body.mime_type,
                            "data": body.image_base64,
                        },
                    },
                    {"type": "text", "text": f"You are an expert chef. please analyse the image and answer the user's query in a succint and helpful manner, take into account cooking techniques and basic cooking knowledge. ANSWER THE QUESTION DIRECTLY, DO NOT RAMBLE OR ADD FLUFF AND BE SUPER SPECIFIC DO NOT BE GENERIC. the user's query is:{body.prompt}"},
                ],
            }
        ],
    )

    return {"data": message.content[0].text}

@app.post("/inference")
def post_inference(body: InferenceBody):
    """Legacy endpoint that accepts image URLs (slower due to network roundtrip)"""
    message = client.messages.create(
        model="claude-3-5-haiku-20241022",
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
        model="claude-3-5-haiku-20241022",
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
        model="claude-3-5-haiku-20241022",
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
    recipe_counter = -1

    return {"data": message.content[0].text}


@app.get("/curr-idx")
def get_curr_idx():
    global recipe_counter
    return {"data": recipe_counter}


@app.get("/next-step")
def get_next_step():
    global recipe_counter
    if not recipe_list:
        return {"data": "Please enter a recipe to get started"}
    recipe_counter += 1
    if recipe_counter >= len(recipe_list):
        return {"data": "You're done!"}

    return {"data": recipe_list[recipe_counter]}

# TODO: delete test-inference
@app.post("/test-inference")
def post_test_inference(body: InferenceBody):
    return {"prompt": body.prompt, "image_url": body.image_url}

@app.post("/test-inference-direct")
def post_test_inference_direct(body: DirectInferenceBody):
    return {
        "prompt": body.prompt, 
        "image_base64_length": len(body.image_base64),
        "mime_type": body.mime_type,
        "message": "Base64 image received successfully!"
    }
