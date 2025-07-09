# Glucify Backend API

A comprehensive backend API for the Glucify diabetes management application, built with Node.js, Express, and TypeScript.

## Features

- **User Authentication & Authorization** - Secure JWT-based authentication with Supabase
- **Diabetes Profile Management** - Store and manage user diabetes profiles
- **Meal Planning** - AI-powered meal planning and food recommendations
- **Dexcom Integration** - Connect with Dexcom CGM devices
- **Claude AI Integration** - Intelligent diabetes management assistance
- **Glucose Data Management** - Track and analyze glucose readings
- **RESTful API** - Clean, documented API endpoints
- **Security** - Rate limiting, CORS, helmet, and input validation
- **TypeScript** - Full type safety and better development experience

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + Supabase Auth
- **AI**: Claude AI (Anthropic)
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan + Winston

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase account and project
- Claude AI API key
- Dexcom API credentials (optional)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d
   
   # Claude AI Configuration
   CLAUDE_API_KEY=your_claude_api_key
   
   # Dexcom API Configuration
   DEXCOM_CLIENT_ID=your_dexcom_client_id
   DEXCOM_CLIENT_SECRET=your_dexcom_client_secret
   DEXCOM_REDIRECT_URI=http://localhost:3001/api/auth/dexcom/callback
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Database Schema

The backend uses Supabase with the following main tables:

### user_diabetes_profiles
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `first_name` (Text)
- `last_name` (Text)
- `diabetes_type` (Enum: 'type1', 'type2')
- `diagnosis_date` (Date)
- `insulin_to_carb_ratio` (Text)
- `correction_factor` (Text)
- `target_glucose_min` (Text)
- `target_glucose_max` (Text)
- `timezone` (Text)
- `dexcom_connect` (Boolean)
- `dexcom_accesstoken` (Text)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### meal_plans
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `date` (Date)
- `meals` (JSONB)
- `estimatedTimeInRange` (Integer)
- `totalCarbs` (Integer)
- `totalCalories` (Integer)
- `notes` (Text)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### user_preferences
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `targetCarbs` (Integer)
- `preferences` (JSONB)
- `restrictions` (JSONB)
- `insulinToCarbRatio` (Text)
- `targetGlucoseRange` (JSONB)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### chat_conversations
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `message` (Text)
- `ai_response` (Text)
- `auto_logged_data` (JSONB)
- `glucose_context` (JSONB)
- `created_at` (Timestamp)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Diabetes Profile
- `GET /api/diabetes-profile` - Get user's diabetes profile
- `POST /api/diabetes-profile` - Create new diabetes profile
- `PUT /api/diabetes-profile` - Update diabetes profile
- `GET /api/diabetes-profile/dexcom/status` - Get Dexcom connection status
- `POST /api/diabetes-profile/dexcom/disconnect` - Disconnect Dexcom

### Meal Planning
- `GET /api/meal-planning/plan/:date` - Get meal plan for specific date
- `POST /api/meal-planning/plan` - Create new meal plan
- `PUT /api/meal-planning/plan/:id` - Update meal plan
- `DELETE /api/meal-planning/plan/:id` - Delete meal plan
- `GET /api/meal-planning/preferences` - Get user preferences
- `POST /api/meal-planning/preferences` - Save user preferences
- `GET /api/meal-planning/foods` - Get food database
- `GET /api/meal-planning/foods/search` - Search foods
- `POST /api/meal-planning/recommendations` - Get meal recommendations
- `POST /api/meal-planning/generate` - Generate AI meal plan

### Glucose Data
- `GET /api/glucose/readings` - Get glucose readings
- `POST /api/glucose/readings` - Add glucose reading
- `GET /api/glucose/stats` - Get glucose statistics
- `GET /api/glucose/analysis` - Get AI glucose analysis

### Chat/AI
- `POST /api/chat/analyze` - Analyze message with AI
- `GET /api/chat/conversations` - Get chat history
- `POST /api/chat/conversations` - Log conversation

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run test         # Run tests
```

### Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Main server file
├── dist/               # Compiled JavaScript
├── package.json
├── tsconfig.json
├── env.example
└── README.md
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3001) |
| `NODE_ENV` | Environment | No (default: development) |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `CLAUDE_API_KEY` | Claude AI API key | Yes |
| `DEXCOM_CLIENT_ID` | Dexcom client ID | No |
| `DEXCOM_CLIENT_SECRET` | Dexcom client secret | No |

## Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **CORS**: Cross-origin resource sharing protection
- **Helmet**: Security headers
- **Input Validation**: Request validation with Joi
- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Production Build

```bash
# Install dependencies
npm install --production

# Build the project
npm run build

# Start the server
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please contact the development team or create an issue in the repository. 