document.addEventListener('DOMContentLoaded', () => {
    
    // Elements
    const sidebar = document.getElementById('sidebar');
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const navLinks = document.querySelectorAll('.nav-link');
    const contactForm = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const formMessage = document.getElementById('formMessage');
        const sections = document.querySelectorAll('section[id]');
    
    // 0. Theme Toggle Extension (Light / Dark Mode)
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (currentTheme === 'dark' || (!currentTheme && systemPrefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) {
            themeToggle.querySelector('i').className = 'fa-solid fa-sun';
        }
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeToggle) {
            themeToggle.querySelector('i').className = 'fa-solid fa-moon';
        }
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const icon = themeToggle.querySelector('i');
            
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                icon.className = 'fa-solid fa-moon';
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                icon.className = 'fa-solid fa-sun';
                localStorage.setItem('theme', 'dark');
            }
        });
    }
    
    // 1. Mobile Navigation Toggle
    if (mobileNavToggle && sidebar) {
        mobileNavToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            
            // Toggle hamburger / close icon
            const icon = mobileNavToggle.querySelector('i');
            if (sidebar.classList.contains('active')) {
                icon.className = 'fa-solid fa-xmark';
            } else {
                icon.className = 'fa-solid fa-bars';
            }
        });
        
        // Close sidebar when clicking outside of it (on mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                if (!sidebar.contains(e.target) && e.target !== mobileNavToggle) {
                    sidebar.classList.remove('active');
                    mobileNavToggle.querySelector('i').className = 'fa-solid fa-bars';
                }
            }
        });
    }

    // 2. Smooth Scrolling Offset Adjustment & Mobile Nav Auto-Close
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Close mobile menu if open
            if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                mobileNavToggle.querySelector('i').className = 'fa-solid fa-bars';
            }
            
            const targetId = link.getAttribute('href');
            if (targetId.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    let offset = 0;
                    if (window.innerWidth <= 768) {
                        // Offset for sticky mobile header
                        offset = 60; 
                    }
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = targetSection.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // 3. Sync Active Navigation Section with Scroll using IntersectionObserver
    const observerOptions = {
        root: null, // viewport
        rootMargin: window.innerWidth <= 768 ? '-65px 0px -40% 0px' : '-20% 0px -60% 0px',
        threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                
                navLinks.forEach(link => {
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        sectionObserver.observe(section);
    });

    // Recalculate observer margin on window resize to ensure correct snapping boundaries
    window.addEventListener('resize', () => {
        sectionObserver.disconnect();
        observerOptions.rootMargin = window.innerWidth <= 768 ? '-65px 0px -40% 0px' : '-20% 0px -60% 0px';
        
        sections.forEach(section => {
            sectionObserver.observe(section);
        });
    });

    // 4. Contact Form Submission via Backend API fetch
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Collect fields
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const subject = document.getElementById('subject').value.trim();
            const message = document.getElementById('message').value.trim();
            
            if (!name || !email || !subject || !message) {
                showFormMessage('Please fill out all required fields.', 'error');
                return;
            }
            
            // Button loading visual state
            const originalBtnContent = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Sending message...</span> <i class="fa-solid fa-circle-notch fa-spin"></i>';
            
            try {
                // Attempt to log the message to our local Express database if it's active
                try {
                    await fetch('/api/contact', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name, email, subject, message })
                    });
                } catch (localErr) {
                    console.log('Local Express server is offline, routing form directly to email forwarding.');
                }
                
                // Submit message to FormSubmit.co AJAX endpoint to route email directly to Gmail
                const response = await fetch('https://formsubmit.co/ajax/mohamed.abdelmaqsoud.cs@gmail.com', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        _subject: `Portfolio Inquiry: ${subject}`,
                        message: message
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showFormMessage('Thank you! Your message has been sent and forwarded to my email.', 'success');
                    contactForm.reset();
                } else {
                    showFormMessage(data.message || 'Failed to forward email. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Network error during contact submission:', error);
                showFormMessage('Failed to connect to the server. Please check your network connection and try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
                
                // Hide message after 8 seconds
                setTimeout(() => {
                    formMessage.style.display = 'none';
                    formMessage.className = 'form-message';
                }, 8000);
            }
        });
    }

    function showFormMessage(msg, type) {
        formMessage.innerText = msg;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';
    }
});
