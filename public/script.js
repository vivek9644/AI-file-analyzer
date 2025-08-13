// public/script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM एलिमेंट चयन ---
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const loadingAnimation = document.getElementById('loading-animation');
    const modelSelector = document.getElementById('ai-model-selector');
    const newChatBtn = document.getElementById('new-chat');
    const themeToggle = document.getElementById('theme-toggle');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobile-overlay');

    // --- ऐप स्टेट ---
    let uploadedFiles = [];
    // हर बार पेज लोड होने पर एक नया यूनिक सेशन आईडी बनाएं
    let sessionId = `session_${new Date().getTime()}_${Math.random().toString(36).substring(2, 8)}`;

    // --- इवेंट लिस्टनर्स ---

    // 1. फ़ाइल चयन को संभालना
    fileInput.addEventListener('change', () => {
        Array.from(fileInput.files).forEach(file => {
            if (!uploadedFiles.some(f => f.name === file.name)) {
                uploadedFiles.push(file);
            }
        });
        updateFileListUI();
        fileInput.value = ''; // एक ही फ़ाइल को दोबारा अपलोड करने के लिए रीसेट करें
    });

    // 2. चैट फॉर्म सबमिशन
    chatForm.addEventListener('submit', handleFormSubmit);

    // टेक्स्ट एरिया में Enter दबाने पर सबमिट करें (Shift+Enter को छोड़कर)
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleFormSubmit(e);
        }
    });

    // 3. नया चैट बटन
    newChatBtn.addEventListener('click', () => {
        chatMessages.innerHTML = `
            <div class="message-wrapper animate-fade-in">
                <div class="message-avatar ai-avatar-msg"><i class="fas fa-brain"></i></div>
                <div class="message-bubble welcome-message">
                    <h3>New chat started!</h3>
                    <p>Your conversation history has been cleared. Ask me anything.</p>
                </div>
            </div>`;
        // एक नया सेशन आईडी बनाएं
        sessionId = `session_${new Date().getTime()}_${Math.random().toString(36).substring(2, 8)}`;
        console.log("New session started:", sessionId);
    });

    // 4. थीम टॉगल
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
    });

    // 5. मोबाइल मेन्यू
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        mobileOverlay.classList.toggle('active');
    });
    mobileOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        mobileOverlay.classList.remove('active');
    });

    // --- मुख्य फंक्शन्स ---

    /**
     * फॉर्म सबमिट को संभालता है और API को कॉल करता है।
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        const prompt = messageInput.value.trim();
        if (!prompt && uploadedFiles.length === 0) return;

        const message = prompt; // Store the original prompt for potential SSE
        addMessageToUI(prompt, 'user');
        messageInput.value = '';
        messageInput.style.height = 'auto'; // टेक्स्ट एरिया को रीसेट करें
        loadingAnimation.style.display = 'flex';

        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('sessionId', sessionId);

        let selectedModel = 'openai'; // डिफ़ॉल्ट
        const selectorValue = modelSelector.value;
        if (selectorValue.includes('gemini')) selectedModel = 'gemini';
        if (selectorValue.includes('openrouter')) selectedModel = 'openrouter';
        // 'puter' मॉडल्स भी OpenRouter के माध्यम से काम कर सकते हैं, इसलिए हम इसे 'openrouter' के रूप में मान सकते हैं।
        if (selectorValue.includes('puter')) selectedModel = 'openrouter';

        formData.append('modelType', selectedModel);

        if (uploadedFiles.length > 0) {
            formData.append('file', uploadedFiles[0]); // सरलता के लिए पहली फ़ाइल भेज रहे हैं
        }

        // Check if SSE is enabled
        const useSSE = document.getElementById('sse-toggle')?.checked || false;

        if (useSSE && !uploadedFiles.length) {
            // Option 1: Use SSE for real-time streaming
            hideLoading();
            const aiMessageElement = displayMessage('', 'ai', true, true); // Empty message for streaming
            const contentElement = aiMessageElement.querySelector('.message-content');

            try {
                // Assuming window.typingEffects.streamResponse exists and handles SSE
                // The original code snippet provided this function signature, so we assume it's available.
                // The actual implementation of streamResponse would be in a separate JS file or script tag.
                await window.typingEffects.streamResponse(
                    message,
                    sessionId,
                    selectedModel,
                    contentElement
                );
            } catch (error) {
                console.error('SSE failed, falling back to regular request:', error);
                // Fallback to regular API call
                await processRegularRequest(formData, message); // Pass message for fallback
            }
        } else {
            // Option 2: Regular API call with typing effect
            await processRegularRequest(formData, message);
        }

        async function processRegularRequest(formData, originalPrompt) {
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData,
            });

            // सबमिशन के बाद फाइलों को क्लियर करें
            uploadedFiles = [];
            updateFileListUI();

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.message || 'API request failed');
            }

            const data = await response.json();
            hideLoading();

            if (data.text) {
                const aiMessageElement = displayMessage('', 'ai', true, true); // Empty message for typing
                const contentElement = aiMessageElement.querySelector('.message-content');

                // Apply basic typing effect
                if (window.TypingEffects) {
                    await window.TypingEffects.simulateTyping(contentElement, data.text, 50);
                } else {
                    contentElement.innerHTML = data.text;
                }
            } else {
                displayMessage('Sorry, I couldn\'t process your request.', 'ai');
            }
        }

        // Hide loading animation
        function hideLoading() {
            loadingAnimation.style.display = 'none';
        }
    }

    /**
     * अपलोड की गई फाइलों की सूची को UI में अपडेट करता है।
     */
    function updateFileListUI() {
        fileList.innerHTML = '';
        uploadedFiles.forEach((file, index) => {
            const pill = document.createElement('div');
            pill.className = 'file-pill';
            pill.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-file-alt"></i>
                    <span class="file-name">${file.name}</span>
                </div>
                <button class="remove-file" data-index="${index}">&times;</button>
            `;
            fileList.appendChild(pill);
        });

        // 'हटाएं' बटनों पर इवेंट लिस्टनर जोड़ें
        document.querySelectorAll('.remove-file').forEach(button => {
            button.addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.target.dataset.index, 10);
                uploadedFiles.splice(indexToRemove, 1);
                updateFileListUI();
            });
        });
    }

    /**
     * चैट विंडो में एक नया मैसेज जोड़ता है।
     * @param {string} message - मैसेज का टेक्स्ट।
     * @param {string} sender - 'user' या 'ai'।
     * @param {boolean} isFile - क्या यह एक फ़ाइल मैसेज है।
     * @param {boolean} allowEmpty - क्या खाली मैसेज की अनुमति है (स्ट्रीमिंग के लिए)।
     * @returns {HTMLElement} The message element.
     */
    function displayMessage(message, sender, isFile = false, allowEmpty = false) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-wrapper animate-fade-in`;

        const isUser = sender === 'user';

        messageDiv.innerHTML = `
            <div class="message-avatar ${isUser ? 'user-avatar-msg' : 'ai-avatar-msg'}">
                <i class="fas ${isUser ? 'fa-user' : 'fa-brain'}"></i>
            </div>
            <div class="message-bubble ${isUser ? 'user-message' : 'ai-message'}">
                <div class="message-content">
                    ${allowEmpty ? '' : (isUser || isFile ? message : marked.parse(message))}
                </div>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Syntax highlighting for AI responses (only if content exists)
        if (!isUser && message) {
            Prism.highlightAllUnder(messageDiv);
        }

        return messageDiv; // Return element for streaming updates
    }

    // टेक्स्ट एरिया को ऑटो-रीसाइज़ करें
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = (messageInput.scrollHeight) + 'px';
    });

    // Placeholder for typing effects functions. These would typically be in a separate file.
    // For example, public/typingEffects.js
    if (!window.typingEffects) {
        window.typingEffects = {
            simulateRealisticTyping: async (text, element, delay = 30) => {
                element.innerText = '';
                for (let i = 0; i < text.length; i++) {
                    element.innerText += text.charAt(i);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            },
            simulateWordByWord: async (text, element, delay = 80) => {
                element.innerText = '';
                const words = text.split(' ');
                for (const word of words) {
                    element.innerText += word + ' ';
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            },
            simulateTyping: async (text, element, delay = 30) => {
                element.innerText = '';
                for (let i = 0; i < text.length; i++) {
                    element.innerText += text.charAt(i);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            },
            streamResponse: async (prompt, sessionId, modelType, element) => {
                // This is a placeholder for SSE implementation
                // In a real application, this would connect to an SSE endpoint
                // and update the 'element' with chunks of data.
                const eventSource = new EventSource('/api/sse-chat'); // Assuming SSE endpoint exists

                eventSource.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    element.innerText += data.chunk; // Append chunk to the element
                    // Scroll to bottom after appending
                    const messagesContainer = document.getElementById('chat-messages');
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                };

                eventSource.onerror = function(err) {
                    console.error('EventSource failed:', err);
                    element.innerText = "Error receiving response.";
                    eventSource.close();
                };

                // Example of how you might trigger the SSE stream with a prompt if needed:
                // fetch('/api/sse-chat', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify({ prompt, sessionId, modelType })
                // });

                // We need a way to close the SSE connection when the response is complete or an error occurs.
                // This is a simplified example; a real implementation would manage the connection lifecycle.
                // For now, let's assume the backend closes the connection or we have a mechanism to signal completion.
            }
        };
    }

});