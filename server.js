const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8080;

// Directories & Files Setup
const dataDir = path.join(__dirname, 'data');
const contactsFile = path.join(dataDir, 'contacts.json');

// Ensure directories and files exist
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(contactsFile)) {
    fs.writeFileSync(contactsFile, JSON.stringify([], null, 2), 'utf8');
}

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Simple input sanitization function to prevent basic XSS injection
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// API Routes

/**
 * POST /api/contact
 * Handles contact form submission, validates inputs, and saves entries to contacts.json
 */
app.post('/api/contact', (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validation checks
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields (name, email, subject, message) are required.'
            });
        }

        // Email format validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }

        // Sanitize inputs
        const cleanName = sanitizeString(name.trim());
        const cleanEmail = email.trim().toLowerCase();
        const cleanSubject = sanitizeString(subject.trim());
        const cleanMessage = sanitizeString(message.trim());

        // Create new contact entry object
        const newSubmission = {
            id: Date.now().toString(),
            name: cleanName,
            email: cleanEmail,
            subject: cleanSubject,
            message: cleanMessage,
            submittedAt: new Date().toISOString()
        };

        // Read existing submissions
        let contacts = [];
        const fileContent = fs.readFileSync(contactsFile, 'utf8');
        try {
            contacts = JSON.parse(fileContent);
        } catch (e) {
            console.error('Error parsing contacts.json, resetting file.', e);
            contacts = [];
        }

        // Append new submission
        contacts.push(newSubmission);

        // Write back to contacts.json
        fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2), 'utf8');

        console.log(`New contact message received from ${cleanName} (${cleanEmail})`);

        return res.status(201).json({
            success: true,
            message: 'Your message has been received successfully.'
        });

    } catch (error) {
        console.error('Server error handling contact submission:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.'
        });
    }
});

/**
 * GET /api/cv/details
 * Optional API endpoint displaying portfolio metadata dynamically if requested
 */
app.get('/api/cv/details', (req, res) => {
    res.json({
        name: "Mohamed Abdelmaqsoud",
        role: "QA & Automation Tester Engineer / Cyber Security Trainee",
        education: {
            institution: "Cairo University",
            faculty: "Computers and Artificial Intelligence",
            years: "2024 - 2028"
        },
        languages: ["Arabic (Native)", "English (Intermediate - B1)", "French (Pre-Intermediate - A2)"]
    });
});

// Fallback to index.html for undefined routes (Single Page App style)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`Portfolio Server is running on port ${PORT}`);
    console.log(`Serving frontend at: http://localhost:${PORT}`);
    console.log(`Active environment data in: ${dataDir}`);
    console.log(`==================================================`);
});
