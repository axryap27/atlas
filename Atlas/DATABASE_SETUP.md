# Database Setup for Username Login

## Steps to set up username login functionality:

### 1. Run the SQL setup script
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-setup.sql`
4. Run the script to create the profiles table and triggers

### 2. Add the username for existing user (aarya27@gmail.com)
1. In the SQL Editor, first find the user ID:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'aarya27@gmail.com';
   ```

2. Copy the UUID from the result, then run:
   ```sql
   INSERT INTO profiles (id, username, email, display_name) 
   VALUES (
     'PASTE_USER_UUID_HERE',
     'axrya', 
     'aarya27@gmail.com', 
     'axrya'
   ) ON CONFLICT (id) DO UPDATE SET 
     username = EXCLUDED.username,
     display_name = EXCLUDED.display_name;
   ```

### 3. Test the functionality
- Try logging in with username: `axrya`
- Try logging in with email: `aarya27@gmail.com`
- Both should work with the same password

### 4. Features added:
- ✅ Username login support (fallback to email if username not found)
- ✅ Email validation for signup
- ✅ Automatic profile creation on signup
- ✅ Username uniqueness enforcement
- ✅ Updated UI to show "Email or Username" for login

## Note:
The profiles table stores username mappings. The trigger automatically creates a profile when a new user signs up. For existing users, you need to manually add the profile record as shown above.