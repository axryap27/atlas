# Atlas - Workout Tracker

Atlas is a comprehensive workout tracking application I built using React Native, Expo, and Supabase. The app helps users track their workouts, create custom templates, monitor progress over time, and analyze their fitness journey with detailed charts and metrics.

## Features

### Workout Management
- Create reusable workout templates with custom exercises
- Start quick workouts without needing a template
- Track sets in real-time with weight and rep logging
- Manage and organize your workout template library

### Progress Tracking
- Visual progress charts showing volume trends by workout template
- Interactive data points - tap any point to see volume details (displays for 3 seconds)
- Filter progress charts by specific workout templates
- Track key metrics including average volume, best performance, and progression over time

### User Experience
- Automatic dark/light mode switching based on system preferences
- Clean tab-based navigation with smooth transitions
- Real-time data synchronization across all screens
- Quick access to recent workout sessions from the dashboard

## Tech Stack

### Frontend
- React Native for cross-platform mobile development
- Expo for development tooling and deployment
- TypeScript for type safety and better development experience
- React Navigation for screen navigation

### Backend
- Supabase as the backend-as-a-service platform
- PostgreSQL database with Row Level Security for data privacy
- Real-time subscriptions for live data updates across the app

## Project Structure

```
workout-tracker/
├── Atlas/                      # React Native frontend
│   ├── app/
│   │   ├── (tabs)/            # Tab navigation screens
│   │   │   ├── index.tsx      # Dashboard/Home screen
│   │   │   ├── workout.tsx    # Workout management
│   │   │   └── progress.tsx   # Progress tracking
│   │   ├── components/
│   │   │   ├── auth/          # Authentication components
│   │   │   ├── workout/       # Workout-related components
│   │   │   └── ui/            # Reusable UI components
│   │   ├── services/          # API and authentication services
│   │   └── types/             # TypeScript type definitions
│   ├── lib/
│   │   └── supabase.ts       # Supabase client configuration
│   └── assets/               # Images, fonts, and other assets
├── server.js                 # Express API server (optional)
├── prisma/                   # Prisma database schema (legacy)
└── src/                      # Express API routes (optional)
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (for testing)

### Backend Setup
First, you'll need to set up a Supabase project:
1. Create a new project at supabase.com
2. Run the SQL files included in the repository to set up your database schema:
   - `supabase-schema.sql` contains the main table structure
   - `enable-rls-policies.sql` sets up security policies
3. Make sure Row Level Security is enabled on all tables for proper user data isolation

### Frontend Setup
To get the React Native app running:
1. Clone this repository to your local machine
2. Navigate to the Atlas directory:
   ```bash
   cd Atlas
   ```
3. Install all dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the Atlas directory with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
5. Start the Expo development server:
   ```bash
   npx expo start
   ```

### API Server (Optional)
There's also an Express API server available if you prefer a traditional backend approach:
1. From the root directory, install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## Database Schema

### Core Tables
The database uses several interconnected tables:
- `users` - Stores user authentication data and profiles
- `exercises` - Contains the exercise library with muscle group classifications
- `workout_days` - Holds workout templates and workout day configurations
- `day_exercises` - Links exercises to specific workout templates
- `sessions` - Records individual workout sessions
- `set_logs` - Tracks individual sets within each session

### Key Relationships
The data model follows these relationships:
- Each user can have multiple workout templates and sessions
- Workout templates contain multiple exercises through the day_exercises junction table
- Sessions belong to a specific user and can optionally be based on a template
- Set logs are the granular records of each set performed within a session

## How It Works

### Template System
The app allows you to create reusable workout templates that can include multiple exercises with default sets and rep ranges. Once you have templates set up, you can start workouts based on them or create completely custom workouts on the fly. When you delete a template, it automatically gets removed from your progress tracking charts as well.

### Progress Tracking
The progress charts calculate volume or just rep count for bodyweight movements. Each workout template gets its own color-coded line on the chart, making it easy to compare different types of workouts. The interactive data points let you tap to see exact volume numbers, which display for 3 seconds before automatically disappearing. The system only includes completed workout sessions in the progress calculations.

### Authentication
User authentication is handled through Supabase Auth, which integrates seamlessly with the database's Row Level Security policies. This ensures that users can only see and modify their own workout data, while the app handles session management automatically in the background.

## Development

### Running the App
```bash
# Frontend (React Native)
cd Atlas
npx expo start

# Backend API (optional)
npm run dev
```

### Type Checking
```bash
cd Atlas
npx tsc --noEmit
```

### Linting
```bash
cd Atlas
npx expo lint
```


## Contributing

If you'd like to contribute to this project:

1. Fork the repository on GitHub
2. Create a feature branch for your changes: `git checkout -b feature/your-feature-name`
3. Make your changes and commit them with a descriptive message
4. Push your branch to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request with a clear description of what you've added or fixed

## License

This project is licensed under the MIT License - see the LICENSE file for details.


## Future Plans

Some features I'm considering adding in the future:
- Expanding the exercise library with more movements and categories
- Adding social features so users can share workouts with friends
- Export functionality to save workout data to other formats
- Ability for users to create completely custom exercises
- Workout scheduling and reminder notifications

Happy Lifting!