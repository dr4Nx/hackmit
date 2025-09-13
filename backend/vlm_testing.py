import os
import base64
from together import Together
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
TOGETHER_API_KEY = os.getenv('TOGETHER_API_KEY')

class VLMImageProcessor:
    def __init__(self, api_key=None):
        """Initialize the VLM Image Processor with Together AI."""
        self.api_key = api_key or TOGETHER_API_KEY
        if not self.api_key:
            raise ValueError("TOGETHER_API_KEY not found. Please set it in your .env file or pass it directly.")
        
        self.client = Together(api_key=self.api_key)
        # Using a vision-capable model from Together AI (serverless)
        self.model = "meta-llama/Llama-4-Scout-17B-16E-Instruct"
    
    def encode_image_to_base64(self, image_path):
        """Encode a JPEG image to base64 string."""
        try:
            with open(image_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                return f"data:image/jpeg;base64,{encoded_string}"
        except FileNotFoundError:
            raise FileNotFoundError(f"Image file not found: {image_path}")
        except Exception as e:
            raise Exception(f"Error encoding image: {str(e)}")
    
    def process_image(self, image_path, prompt, system_prompt=None):
        """
        Process a JPEG image with a text prompt using Together AI's VLM.
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found: {image_path}")
        
        if not image_path.lower().endswith(('.jpg', '.jpeg')):
            raise ValueError("Only JPEG files are supported")
        
        # Encode image to base64 - stupid aahh togetherai
        encoded_image = self.encode_image_to_base64(image_path)
        
        if system_prompt is None:
            system_prompt = (
                "You are an expert chef and your job is to answer a user's prompt about an image." 
                "Analyze the provided image carefully, indepth and reply to the user's query accurately"
                "Respond to the user's prompt with detailed, accurate information."
                "Be specific and succint, you are basically answering a short question from the user, be nice to the user!"
            )
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": encoded_image
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"Error processing image with VLM: {str(e)}")

def main():
    """Example usage of the VLM Image Processor."""
    try:
        processor = VLMImageProcessor()
        
        # Define image path and prompt directly in the file
        image_path = "test_images_vlm/download-1.jpg"  
        prompt = "is my food on the stove cooked here?"  #
        
        print("VLM Image Processor initialized successfully!")
        print(f"Processing image: {image_path}")
        print(f"Prompt: {prompt}")
        print("-" * 50)
        
        try:
            result = processor.process_image(image_path, prompt)
            print(f"\nVLM Response:\n{result}")
            print("-" * 50)
            
        except FileNotFoundError as e:
            print(f"Error: {e}")
        except ValueError as e:
            print(f"Error: {e}")
        except Exception as e:
            print(f"Error processing image: {e}")
            
    except Exception as e:
        print(f"Error initializing processor: {e}")

if __name__ == "__main__":
    if not TOGETHER_API_KEY:
        print("Error: TOGETHER_API_KEY not found!")
        print("Please create a .env file with your Together AI API key:")
        print("TOGETHER_API_KEY=your_api_key_here")
    else:
        main()
