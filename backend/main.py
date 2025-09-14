from typing import Union
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
from dotenv import dotenv_values
import json
import anyio


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],  # Or specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

config = dotenv_values(".env")


client = anthropic.Anthropic(api_key=config["ANTHROPIC_API_KEY"])
recipe_list = []
image_base64 = None
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
    global image_base64

    print(f"You are a master chef. Analyze the image and answer the user's question directly. Be specific, concise, and practical. Maximum 1-2 sentences.\n\nCurrent step: {recipe_list[recipe_counter] if recipe_counter >= 0 and recipe_counter < len(recipe_list) else 'Not started yet'}\nFull recipe: {recipe_list if recipe_list else []}\nUser question: {body.prompt}")
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=48,
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
                    {"type": "text", "text": f"You are a master chef. Analyze the image and answer the user's question directly alongside the provided recipe. If there is no recipe then return a response prompting the user to enter a recipe. Be specific, concise, and practical in your answers. Maximum 1-2 sentences.\n\nCurrent step: {recipe_list[recipe_counter] if recipe_counter >= 0 and recipe_counter < len(recipe_list) else 'Not started yet'}\nFull recipe: {recipe_list if recipe_list else []}\nUser question: {body.prompt}"},
                ],
            }
        ],
    )

    image_base64 = body.image_base64

    anyio.from_thread.run(ws_broadcast, "image_changed", {"data": image_base64, "text": message.content[0].text})

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


@app.post("/process-recipe")
def process_recipe_input(body: TitleBody) -> dict:
    """Process recipe input and return unstructured recipe text"""
    recipe_input = body.recipe
    try:
        # Step 1: Classify input
        classification_message = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=100,
            messages=[
                {
                    "role": "user",
                    "content": f"""Analyze this input and classify it as one of these three options:
                    - "link": If it's a URL to a recipe website
                    - "recipe": If it's a complete recipe with ingredients and steps
                    - "natural_language": If it's a description of what you want to cook (e.g., "I want to make pasta")

                    Input: {recipe_input}

                    Respond with only one word: link, recipe, or natural_language"""
                }
            ],
        )
        input_type = classification_message.content[0].text.strip().lower()
        
        # Step 2: Process based on classification
        if input_type == "link":
            # Use web_fetch for direct URL access
            web_fetch_message = client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=2000,
                messages=[
                    {
                        "role": "user",
                        "content": f"""Find the recipe at this URL: {recipe_input}
                        
                        Extract the complete recipe and format it as a clean recipe with:
                        - Ingredients list with measurements
                        - Step-by-step cooking instructions
                        - Cooking times and temperatures
                        - Number of servings
                        
                        Provide the actual recipe from the website."""
                    }
                ],
                tools=[{
                    "type": "web_fetch_20250910",
                    "name": "web_fetch",
                    "max_uses": 5
                }],
                extra_headers={
                    "anthropic-beta": "web-fetch-2025-09-10"
                }
            )
            
            # Extract recipe text from web_fetch response
            recipe_text = ""
            for content in web_fetch_message.content:
                if hasattr(content, 'text') and content.text is not None:
                    recipe_text += content.text
            
        elif input_type == "natural_language":
            # First search for a recipe URL, then fetch it directly
            search_message = client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=1000,
                messages=[
                    {
                        "role": "user",
                        "content": f"""I want to cook: {recipe_input}
                        
                        Find a good recipe URL from a trusted cooking website (like AllRecipes, Food Network, Serious Eats, etc.).
                        Return just the URL, nothing else."""
                    }
                ],
                tools=[{
                    "type": "web_search_20250305",
                    "name": "web_search",
                    "max_uses": 2
                }]
            )
            
            # Extract URL from search results
            search_text = ""
            for content in search_message.content:
                if hasattr(content, 'text') and content.text is not None:
                    search_text += content.text
            
            # Find URL in the search results
            import re
            url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
            urls = re.findall(url_pattern, search_text)
            
            if not urls:
                # Fallback: return the search results as recipe
                recipe_text = search_text
            else:
                # Use the first URL found to fetch the recipe directly
                recipe_url = urls[0]
                print(f"DEBUG: Found recipe URL: {recipe_url}")
                
                # Fetch the recipe using web_fetch (same as the working test)
                web_fetch_message = client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=2000,
                    messages=[
                        {
                            "role": "user",
                            "content": f"""Find the recipe at this URL: {recipe_url}
                            
                            Extract the complete recipe and format it as a clean recipe with:
                            - Ingredients list with measurements
                            - Step-by-step cooking instructions
                            - Cooking times and temperatures
                            - Number of servings
                            
                            Provide the actual recipe from the website."""
                        }
                    ],
                    tools=[{
                        "type": "web_fetch_20250910",
                        "name": "web_fetch",
                        "max_uses": 5
                    }],
                    extra_headers={
                        "anthropic-beta": "web-fetch-2025-09-10"
                    }
                )
                
                # Extract recipe text from web_fetch response
                recipe_text = ""
                for content in web_fetch_message.content:
                    if hasattr(content, 'text') and content.text is not None:
                        recipe_text += content.text
            
        else:  # input_type == "recipe"
            # Use input as-is
            recipe_text = recipe_input
        
        return {"data": recipe_text}
        
    except Exception as e:
        print(f"Error processing recipe input: {e}")
        return {"data": recipe_input}  # Fallback to original input


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
    global recipe_counter
    recipe_list = json.loads(message.content[0].text)["recipe"]
    recipe_counter = -1

    return {"data": message.content[0].text}


@app.get("/curr-idx")
def get_curr_idx():
    global recipe_counter
    return {"data": recipe_counter}


@app.get("/reset-idx")
def reset_idx():
    global recipe_counter
    recipe_counter = -1


@app.get("/next-step")
def get_next_step():
    global recipe_counter
    if not recipe_list:
        return {"data": "Please enter a recipe to get started"}
    recipe_counter += 1
    if recipe_counter >= len(recipe_list):
        return {"data": "You're done!"}

    anyio.from_thread.run(ws_broadcast, "step_changed", {"index": recipe_counter})

    return {"data": recipe_list[recipe_counter]}


@app.get("/image")
def get_image():
    global image_base64

    anyio.from_thread.run(ws_broadcast, "image_changed", {"data": image_base64})

    return {"data": image_base64}


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
        "message": "Base64 image received successfully!",
    }


# websocket
ws_clients: set[WebSocket] = set()


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    ws_clients.add(ws)
    try:
        # You don't need to receive; keep alive by waiting for messages or close.
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        ws_clients.discard(ws)


async def ws_broadcast(event: str, data):
    msg = json.dumps({"event": event, "data": data})
    for ws in list(ws_clients):
        try:
            await ws.send_text(msg)
        except Exception:
            ws_clients.discard(ws)
