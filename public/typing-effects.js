// public/typing-effects.js

/**
 * Frontend Typing Effects - Basic Character Effect
 */

// Basic Character Typing - Only this function is kept
function simulateTyping(element, text, speed = 50) {
    return new Promise((resolve) => {
        element.innerHTML = '';
        let i = 0;

        function typeChar() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(typeChar, speed);
            } else {
                resolve();
            }
        }

        typeChar();
    });
}

// Export function for global use
window.TypingEffects = {
    simulateTyping
};