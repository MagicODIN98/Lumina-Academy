// ============================================
// INDEX/HOME PAGE FUNCTIONALITY
// Handles smooth scrolling, animations,
// and interactive elements on the landing page
// ============================================

// Wait for DOM to fully load before executing scripts
document.addEventListener('DOMContentLoaded', function() {
    // Initialize smooth scrolling for navigation links
    initializeSmoothScroll();

    // Initialize animation observers for elements
    initializeAnimationObservers();

    // Log initialization complete
    console.log('Index page initialized successfully');
});

// Function to initialize smooth scrolling for anchor links
function initializeSmoothScroll() {
    // Get all anchor links that point to page sections
    const links = document.querySelectorAll('a[href^="#"]');

    // Add click event listener to each link
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            // Get the target section ID from the link
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            // Check if target section exists
            if (targetSection) {
                e.preventDefault();
                
                // Scroll to target section smoothly
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Function to initialize intersection observer for animations
function initializeAnimationObservers() {
    // Configuration for intersection observer
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    // Create intersection observer instance
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            // Add animation class when element enters viewport
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                // Unobserve element after animation is applied
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Get all elements that should have entrance animations
    const animatedElements = document.querySelectorAll('.university-card');

    // Observe each element for animations
    animatedElements.forEach(element => {
        observer.observe(element);
    });
}

// Function to track page analytics and user interactions
function trackUserInteraction(eventName) {
    // This function placeholder for future analytics integration
    console.log('User interaction tracked: ' + eventName);
}

// Log page load completion
console.log('CRYSTAL Landing page loaded');
