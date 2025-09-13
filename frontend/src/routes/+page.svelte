<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="w-full max-w-2xl">
        <div class="text-center mb-12 px-4">
            <h1 class="text-6xl md:text-7xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4 tracking-tight leading-tight">
                Cooking Assistant
            </h1>
            <p class="text-gray-600 text-lg md:text-xl font-medium">
                Transform your culinary ideas into delicious recipes
            </p>
        </div>
        
        <div class="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12">
            <div class="relative">
                <textarea
                    placeholder="Describe your dream dish or ingredients you have..."
                    class="w-full h-48 md:h-56 p-6 rounded-2xl border-2 border-gray-200 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 outline-none resize-none text-gray-700 placeholder-gray-400 text-lg leading-relaxed shadow-inner bg-gray-50/50 transition-all duration-300 hover:shadow-lg"
                    onkeydown={async (e) => {
                        if (e.key !== "Enter") return;

                        const input = e.currentTarget;
                        const description = input.value;

                        const response = await fetch("/api/inference", {
                            method: "POST",
                            body: JSON.stringify({ description }),
                            headers: {
                                "Content-Type": "application/json",
                            },
                        });

                        const { hello } = await response.json();

                        // TODO: do something with the data

                        // const todos = [
                        //     ...data.todos,
                        //     {
                        //         id,
                        //         description,
                        //     },
                        // ];

                        // data = { ...data, todos };

                        input.value = "";
                    }}
                ></textarea>
                <div class="absolute bottom-4 right-4 text-sm text-gray-400 font-medium">
                    Press Enter to cook up something amazing
                </div>
            </div>
            
            <div class="mt-8 flex items-center justify-center space-x-2 text-gray-500">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span class="text-sm font-medium">Powered by AI culinary magic</span>
            </div>
        </div>
    </div>
</div>
