// Simple debug script to test if JavaScript is running
console.log('=== DEBUG: JavaScript is running! ===');

// Test if DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DEBUG: DOM Content Loaded ===');
    
    // Test if elements exist
    const loadBtn = document.getElementById('load-file-btn');
    const modeButtons = document.querySelectorAll('.mode-button');
    
    console.log('=== DEBUG: Load button found:', !!loadBtn);
    console.log('=== DEBUG: Mode buttons found:', modeButtons.length);
    
    // Test if electronAPI exists
    console.log('=== DEBUG: electronAPI available:', !!window.electronAPI);
    
    // Add a simple click handler to test
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            console.log('=== DEBUG: Load button clicked! ===');
            alert('Button works!');
        });
        console.log('=== DEBUG: Click handler added to load button ===');
    }
    
    // Test mode buttons
    modeButtons.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            console.log(`=== DEBUG: Mode button ${index} clicked! ===`);
            alert(`Mode button ${index} works!`);
        });
    });
    console.log('=== DEBUG: Click handlers added to mode buttons ===');
});

console.log('=== DEBUG: Event listener registered ===');
