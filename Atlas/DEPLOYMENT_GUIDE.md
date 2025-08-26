# Atlas Workout Tracker - Deployment Guide

## Prerequisites

1. **Expo Account**: Sign up at [expo.dev](https://expo.dev)
2. **EAS CLI**: Install with `npm install -g eas-cli`
3. **Apple Developer Account** (for iOS)
4. **Google Play Developer Account** (for Android)

## Setup Steps

### 1. Environment Configuration

Create a `.env` file in the project root:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `database/friends-gamification-schema.sql`
3. Enable Row Level Security (RLS) on all tables
4. Set up authentication (Email + Password recommended)

### 3. EAS Project Setup

```bash
# Login to EAS
eas login

# Create project
eas init

# Update app.json with your project details
```

### 4. iOS Deployment

```bash
# Configure iOS credentials
eas credentials:configure -p ios

# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

### 5. Android Deployment

```bash
# Configure Android credentials
eas credentials:configure -p android

# Build for production
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android --profile production
```

## App Store Assets Required

### Screenshots (iOS)
- iPhone 6.5" Display: 1284 x 2778 pixels
- iPhone 5.5" Display: 1242 x 2208 pixels
- iPad Pro (6th gen): 2048 x 2732 pixels

### Screenshots (Android)
- Phone: 1080 x 1920 pixels minimum
- Tablet: 1920 x 1080 pixels minimum

### App Store Description

**Title:** Atlas Workout Tracker

**Subtitle:** Fitness tracking made simple and social

**Description:**
Transform your fitness journey with Atlas, the ultimate workout tracking app that combines powerful features with social connectivity.

**Key Features:**
- 📊 **Smart Progress Tracking**: Monitor your strength gains with detailed analytics and visual progress charts
- 🏋️ **Custom Workout Templates**: Build and save personalized workout routines for any fitness goal
- 👥 **Social Fitness**: Connect with friends, share achievements, and stay motivated together
- 📱 **Intuitive Interface**: Clean, modern design that makes logging workouts quick and enjoyable
- 🎯 **Goal Setting**: Set targets and track your journey toward your fitness milestones

**Perfect for:**
- Beginners starting their fitness journey
- Experienced athletes tracking advanced programs
- Anyone who wants to stay accountable with friends
- Fitness enthusiasts who love data and progress visualization

Download Atlas today and turn your fitness goals into achievements!

### Keywords (iOS)
workout, fitness, gym, exercise, tracking, social, progress, strength, training, health

### Category
Health & Fitness

## Privacy Policy & Terms

You'll need to create and host:
1. Privacy Policy URL
2. Terms of Service URL

These should cover:
- Data collection and usage
- User account management
- Social features and friend connections
- Third-party services (Supabase)

## Testing Before Submission

1. **Functionality Testing**:
   - User registration and login
   - Workout creation and logging
   - Social features (friends, sharing)
   - Data synchronization

2. **Performance Testing**:
   - App load times
   - Database query performance
   - Memory usage
   - Battery usage

3. **Device Testing**:
   - Different screen sizes
   - iOS and Android compatibility
   - Tablet support (iPad)

## Post-Deployment

1. **Monitor Analytics**:
   - User engagement
   - Feature usage
   - Crash reports

2. **Update Strategy**:
   - Regular bug fixes
   - Feature additions based on user feedback
   - Performance optimizations

3. **User Support**:
   - In-app feedback mechanism
   - Support email setup
   - FAQ documentation

## Common Issues

1. **Build Failures**: Check dependencies and environment variables
2. **App Store Rejection**: Review Apple's App Store Guidelines
3. **Performance Issues**: Optimize database queries and image loading

## Support

For deployment issues, check:
- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction)
- [App Store Guidelines](https://developer.apple.com/app-store/guidelines)
- [Google Play Policies](https://support.google.com/googleplay/android-developer/topic/9858052)