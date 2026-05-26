# IntegriText - AI-Powered Writing Suite

A comprehensive platform for checking plagiarism, detecting AI-generated content, checking grammar, humanizing AI text, translating content, and chatting with an AI assistant.

## Features

- **Plagiarism Checker**: Detect plagiarism and verify originality
- **AI Content Detector**: Identify AI-generated content with confidence scoring
- **Grammar Checker**: Find and fix spelling, grammar, and style issues
- **AI Humanizer**: Transform AI-generated text to sound more human
- **Translator**: Translate content across multiple languages
- **AI Chat Assistant**: Get writing advice and assistance

## Tech Stack

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- No external dependencies for core functionality
- Responsive design with custom styling

### Backend
- Node.js with Express.js
- MongoDB for data persistence
- JWT for authentication
- bcryptjs for password hashing

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Git

### Local Setup

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/plagiarism-checker.git
cd plagiarism-checker
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/integritext
JWT_SECRET=your_secret_key_here_make_it_long_and_secure
NODE_ENV=development
```

4. Start the server:
```bash
npm start
```

5. Open your browser and visit `http://localhost:5000`

## Deployment to Vercel

### Quick Start

1. Push code to GitHub
2. Go to [Vercel](https://vercel.com) and import your GitHub repository
3. Set environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string
   - `NODE_ENV`: `production`
4. Deploy!

### Detailed Setup

See [VERCEL_SETUP_GUIDE.md](VERCEL_SETUP_GUIDE.md) for comprehensive deployment instructions.

## Project Structure

```
.
├── api/
│   ├── index.js              # Main Express server
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   └── models/
│       ├── User.js          # User schema
│       ├── Scan.js          # Scan history schema
│       ├── ChatMessage.js   # Chat messages schema
│       └── Contact.js       # Contact form schema
├── public/
│   ├── index.html           # Main frontend page
│   ├── app.js              # Frontend JavaScript
│   ├── styles.css          # Frontend styles
│   └── view_db.js          # Database viewer utility
├── vercel.json             # Vercel deployment config
├── package.json            # Node dependencies
└── README.md              # This file
```

## API Routes

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login to account
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/update` - Update user profile

### Writing Tools
- `POST /api/scans/upload` - Upload and extract text from files
- `POST /api/scans/plagiarism` - Check for plagiarism
- `POST /api/scans/ai-detect` - Detect AI-generated content
- `POST /api/scans/grammar` - Check grammar and style
- `POST /api/scans/humanizer` - Humanize AI text
- `GET /api/scans` - Get user's scan history
- `DELETE /api/scans/:id` - Delete a scan record

### Chat
- `GET /api/chat` - Get chat history
- `POST /api/chat` - Send message and get bot reply

### Contact
- `POST /api/contact` - Submit contact form

## Usage

### Signup
1. Click "Create one" on the login form
2. Enter your full name, email, and password
3. Click "Create Account"

### Login
1. Enter your email and password
2. Click "Sign In"

### Using Features
1. Select the tool from the sidebar
2. Enter or upload text
3. Click the action button
4. View results and download reports

## Troubleshooting

### "Unexpected Token" Error
- Ensure MongoDB URI is correct
- Check JWT_SECRET is set
- Clear browser localStorage
- Check browser console for detailed error

### API Connection Issues
- Verify API_URL in frontend code
- Check CORS configuration
- Ensure backend is running
- Verify environment variables are set

### MongoDB Connection Error
- Verify connection string format
- Check MongoDB Atlas IP whitelist
- Ensure database user credentials are correct

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes

## Support

For issues or questions:
1. Check the [VERCEL_SETUP_GUIDE.md](VERCEL_SETUP_GUIDE.md)
2. Review the browser console for error messages
3. Check Vercel function logs if deployed
4. Create an issue on GitHub

## Contact

For inquiries, use the Contact Us form in the application.
